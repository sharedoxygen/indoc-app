"""
LLM Service for handling language model interactions with Ollama
"""
import logging
from typing import List, Dict, Any, Optional
import httpx
import asyncio
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with Ollama Language Models"""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.LLM_TIMEOUT_S
        
    async def generate_response(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        model: Optional[str] = None
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
            # Build the full prompt with context
            full_prompt = self._build_prompt(prompt, context)
            
            # Prepare request payload for Ollama
            selected_model = model or self.model
            payload = {
                "model": selected_model,
                "prompt": full_prompt,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                    "stop": ["\n\nHuman:", "\n\nUser:"]
                },
                "stream": False
            }
            
            # Make request to Ollama
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                )
                response.raise_for_status()
                
                result = response.json()
                return result.get("response", "").strip()
                
        except httpx.TimeoutException:
            logger.error("LLM request timeout")
            return "I apologize, but I'm taking too long to respond. Please try again."
        except httpx.HTTPError as e:
            logger.error(f"LLM HTTP error: {e}")
            return "I'm having trouble connecting to the language model. Please try again later."
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            return "I encountered an error while generating a response. Please try again."
    
    def _build_prompt(self, user_prompt: str, context: Optional[str] = None) -> str:
        """Build a complete prompt with context and instructions"""
        
        system_prompt = """You are a helpful AI assistant specializing in document analysis and conversation. You help users understand, analyze, and extract insights from their documents.

Key capabilities:
- Answer questions about document content
- Provide summaries and key insights
- Analyze sentiment and tone
- Extract important information
- Compare multiple documents
- Explain complex concepts from documents

Guidelines:
- Always base your answers on the provided document context
- If you cannot find information in the documents, clearly state this
- Provide specific references to document sections when possible
- Be concise but thorough in your explanations
- If asked about multiple documents, compare and contrast them
- For summaries, focus on key points and actionable insights"""

        if context:
            full_prompt = f"{system_prompt}\n\nDocument Context:\n{context}\n\nUser Question: {user_prompt}\n\nAssistant:"
        else:
            full_prompt = f"{system_prompt}\n\nUser Question: {user_prompt}\n\nAssistant:"
            
        return full_prompt
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for text using Ollama
        
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
                response.raise_for_status()
                
                result = response.json()
                return result.get("embedding", [])
                
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return []
    
    async def summarize_document(self, content: str, max_length: int = 200) -> str:
        """
        Generate a summary of document content
        
        Args:
            content: Document content to summarize
            max_length: Maximum length of summary in words
            
        Returns:
            Document summary
        """
        prompt = f"Please provide a concise summary of the following document in no more than {max_length} words. Focus on the key points, main topics, and important information:\n\n{content[:4000]}"
        return await self.generate_response(prompt, temperature=0.3)
    
    async def generate_title(self, content: str) -> str:
        """
        Generate a title for a document
        
        Args:
            content: Document content to generate title from
            
        Returns:
            Generated title
        """
        prompt = f"Please generate a concise and descriptive title for the following document. The title should be no more than 10 words:\n\n{content[:1000]}"
        return await self.generate_response(prompt, temperature=0.5)

    async def analyze_sentiment(self, content: str) -> Dict[str, Any]:
        """
        Analyze the sentiment of document content
        
        Args:
            content: Document content to analyze
            
        Returns:
            Sentiment analysis results
        """
        prompt = f"""Analyze the sentiment and tone of the following document. Provide:
1. Overall sentiment (positive, negative, neutral)
2. Confidence score (0-100%)
3. Key emotional indicators
4. Tone description (formal, casual, urgent, etc.)

Document content:
{content[:3000]}

Please format your response as a clear analysis."""
        
        response = await self.generate_response(prompt, temperature=0.2)
        
        # Parse response into structured format
        return {
            "analysis": response,
            "content_length": len(content)
        }
    
    async def extract_key_points(self, content: str, num_points: int = 5) -> List[str]:
        """
        Extract key points from document content
        
        Args:
            content: Document content to analyze
            num_points: Number of key points to extract
            
        Returns:
            List of key points
        """
        prompt = f"""Extract the {num_points} most important key points from the following document. Present them as a numbered list:

{content[:4000]}

Key points:"""
        
        response = await self.generate_response(prompt, temperature=0.3)
        
        # Parse numbered list from response
        lines = response.split('\n')
        key_points = []
        for line in lines:
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Clean up the formatting
                point = line.lstrip('0123456789.-•').strip()
                if point:
                    key_points.append(point)
        
        return key_points[:num_points]
    
    async def answer_question(
        self,
        question: str,
        documents: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Answer a question based on provided documents
        
        Args:
            question: The question to answer
            documents: List of relevant documents
            conversation_history: Previous conversation context
            
        Returns:
            Answer to the question
        """
        # Prepare context from documents
        context_parts = []
        
        if documents:
            context_parts.append("Relevant Documents:")
            for i, doc in enumerate(documents[:3]):  # Use top 3 documents
                content = doc.get("content", "")
                title = doc.get("title", f"Document {i+1}")
                if content:
                    context_parts.append(f"\n--- {title} ---")
                    context_parts.append(content[:1500])  # Limit content length
        
        # Add conversation history if available
        if conversation_history:
            context_parts.append("\n\nPrevious conversation:")
            for msg in conversation_history[-3:]:  # Last 3 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                context_parts.append(f"{role.title()}: {content}")
        
        context = "\n".join(context_parts)
        return await self.generate_response(question, context=context, temperature=0.3)
    
    async def compare_documents(self, documents: List[Dict[str, Any]]) -> str:
        """
        Compare multiple documents and provide insights
        
        Args:
            documents: List of documents to compare
            
        Returns:
            Comparison analysis
        """
        if len(documents) < 2:
            return "I need at least 2 documents to perform a comparison."
        
        context_parts = ["Documents to compare:"]
        for i, doc in enumerate(documents[:3]):  # Compare up to 3 documents
            title = doc.get("title", f"Document {i+1}")
            content = doc.get("content", "")
            context_parts.append(f"\n--- {title} ---")
            context_parts.append(content[:1000])  # Limit content
        
        context = "\n".join(context_parts)
        prompt = "Please compare these documents, highlighting similarities, differences, key themes, and any notable insights. Focus on content, tone, purpose, and main topics."
        
        return await self.generate_response(prompt, context=context, temperature=0.4)
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract entities from text (people, organizations, locations, etc.)
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary of entity types and their values
        """
        prompt = f"""Extract and categorize the following types of entities from this text:
- People (names of individuals)
- Organizations (companies, institutions)
- Locations (places, addresses)
- Dates (specific dates, time periods)
- Numbers (important figures, statistics)

Text:
{text[:2000]}

Please format as:
People: [list]
Organizations: [list]
Locations: [list]
Dates: [list]
Numbers: [list]"""
        
        response = await self.generate_response(prompt, temperature=0.2)
        
        # Parse the response into structured format
        entities = {
            "people": [],
            "organizations": [],
            "locations": [],
            "dates": [],
            "numbers": []
        }
        
        # Simple parsing - could be enhanced with more sophisticated NLP
        lines = response.split('\n')
        current_category = None
        
        for line in lines:
            line = line.strip()
            if ':' in line:
                category = line.split(':')[0].lower()
                if category in entities:
                    current_category = category
                    # Extract items from the same line
                    items_text = line.split(':', 1)[1].strip()
                    if items_text and items_text != '[list]':
                        items = [item.strip() for item in items_text.split(',') if item.strip()]
                        entities[current_category].extend(items)
        
        return entities
    
    async def check_ollama_connection(self) -> bool:
        """Check if Ollama is available and responsive"""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama connection check failed: {e}")
            return False
    
    async def list_available_models(self) -> List[str]:
        """Get list of available Ollama models"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                
                result = response.json()
                models = [model.get("name", "") for model in result.get("models", [])]
                return [m for m in models if m]
                
        except Exception as e:
            logger.error(f"Error fetching available models: {e}")
            return []