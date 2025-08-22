"""
LLM Service for handling language model interactions
"""
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with Large Language Models"""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.LLM_TIMEOUT_S
        
    async def generate_response(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> str:
        """
        Generate a response from the LLM
        
        Args:
            prompt: The user prompt
            context: Optional context to include
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            
        Returns:
            Generated response text
        """
        try:
            full_prompt = prompt
            if context:
                full_prompt = f"Context: {context}\n\nQuestion: {prompt}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "")
                else:
                    logger.error(f"LLM API error: {response.status_code}")
                    return "Sorry, I couldn't generate a response at this time."
                    
        except httpx.TimeoutException:
            logger.error("LLM request timed out")
            return "The request timed out. Please try again."
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return "An error occurred while generating the response."
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for text
        
        Args:
            text: Text to generate embeddings for
            
        Returns:
            List of embedding values
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.model,
                        "prompt": text
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("embedding", [])
                else:
                    logger.error(f"Embeddings API error: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return []
    
    async def summarize_text(self, text: str, max_length: int = 200) -> str:
        """
        Summarize a piece of text
        
        Args:
            text: Text to summarize
            max_length: Maximum length of summary
            
        Returns:
            Summarized text
        """
        prompt = f"Please provide a concise summary of the following text in no more than {max_length} words:\n\n{text}"
        return await self.generate_response(prompt, temperature=0.5)
    
    async def answer_question(
        self,
        question: str,
        documents: List[Dict[str, Any]]
    ) -> str:
        """
        Answer a question based on provided documents
        
        Args:
            question: The question to answer
            documents: List of relevant documents
            
        Returns:
            Answer to the question
        """
        # Prepare context from documents
        context_parts = []
        for doc in documents[:5]:  # Use top 5 documents
            content = doc.get("content", "")
            if content:
                context_parts.append(f"Document: {content[:500]}...")
        
        context = "\n\n".join(context_parts)
        
        prompt = f"Based on the provided documents, please answer the following question: {question}"
        
        return await self.generate_response(prompt, context=context, temperature=0.3)
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities from text
        
        Args:
            text: Text to extract entities from
            
        Returns:
            Dictionary of entity types and their values
        """
        prompt = f"""Extract named entities from the following text and categorize them:
        - People (names of persons)
        - Organizations (company names, institutions)
        - Locations (cities, countries, addresses)
        - Dates (specific dates, time periods)
        - Money (monetary values)
        
        Text: {text}
        
        Return the results in a structured format."""
        
        response = await self.generate_response(prompt, temperature=0.1)
        
        # Parse the response (simplified - could use JSON mode if available)
        entities = {
            "people": [],
            "organizations": [],
            "locations": [],
            "dates": [],
            "money": []
        }
        
        # Simple parsing logic - can be enhanced
        lines = response.split("\n")
        current_category = None
        
        for line in lines:
            line = line.strip()
            if "People:" in line or "Persons:" in line:
                current_category = "people"
            elif "Organizations:" in line or "Companies:" in line:
                current_category = "organizations"
            elif "Locations:" in line or "Places:" in line:
                current_category = "locations"
            elif "Dates:" in line or "Time:" in line:
                current_category = "dates"
            elif "Money:" in line or "Monetary:" in line:
                current_category = "money"
            elif current_category and line and not line.startswith("-"):
                # Extract entity (remove bullets, numbers, etc.)
                entity = line.lstrip("- •*123456789.").strip()
                if entity:
                    entities[current_category].append(entity)
        
        return entities
    
    async def classify_document(self, text: str, categories: List[str]) -> str:
        """
        Classify a document into one of the provided categories
        
        Args:
            text: Document text to classify
            categories: List of possible categories
            
        Returns:
            The most appropriate category
        """
        categories_str = ", ".join(categories)
        prompt = f"""Classify the following document into one of these categories: {categories_str}
        
        Document: {text[:1000]}...
        
        Return only the category name, nothing else."""
        
        response = await self.generate_response(prompt, temperature=0.1, max_tokens=50)
        
        # Clean and validate the response
        response = response.strip().lower()
        for category in categories:
            if category.lower() in response:
                return category
        
        # Default to first category if no match
        return categories[0] if categories else "uncategorized"