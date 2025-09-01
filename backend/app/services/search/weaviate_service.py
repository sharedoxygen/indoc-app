"""
Weaviate service for semantic vector search
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import weaviate
from app.core.config import settings

logger = logging.getLogger(__name__)


class WeaviateService:
    """Service for Weaviate vector search operations"""
    
    def __init__(self):
        """Initialize client; gracefully degrade if Weaviate is unavailable."""
        self.client = None
        self.class_name = settings.WEAVIATE_CLASS
        try:
            self.client = weaviate.Client(
                url=settings.WEAVIATE_URL,
                additional_headers={
                    "X-OpenAI-Api-Key": "not-needed",  # Using local transformers
                }
            )
        except Exception as e:
            logger.error(f"Weaviate initialization failed: {e}. Running in degraded mode (semantic search disabled).")
    
    async def vector_search(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic vector search in Weaviate
        
        Args:
            query: Search query for semantic matching
            limit: Maximum number of results
            filters: Optional filters (file_type, date_range, etc.)
            
        Returns:
            List of search results with semantic similarity scores
        """
        try:
            if not self.client:
                logger.warning("Weaviate client not initialized; returning empty semantic results.")
                return []
            # Build Weaviate query with semantic search
            where_filter = None
            
            # Add filters if provided
            if filters:
                filter_conditions = []
                
                if filters.get("file_type"):
                    filter_conditions.append({
                        "path": ["file_type"],
                        "operator": "ContainsAny",
                        "valueTextArray": filters["file_type"]
                    })
                
                if filters.get("tags"):
                    filter_conditions.append({
                        "path": ["tags"],
                        "operator": "ContainsAny", 
                        "valueTextArray": filters["tags"]
                    })
                
                if filters.get("uploaded_by"):
                    filter_conditions.append({
                        "path": ["uploaded_by"],
                        "operator": "Equal",
                        "valueText": filters["uploaded_by"]
                    })
                
                if filter_conditions:
                    if len(filter_conditions) == 1:
                        where_filter = filter_conditions[0]
                    else:
                        where_filter = {
                            "operator": "And",
                            "operands": filter_conditions
                        }
            
            # Execute semantic search using nearText
            query_builder = (
                self.client.query
                .get(self.class_name, [
                    "document_id", "filename", "title", "content", 
                    "description", "file_type", "tags", "uploaded_by", 
                    "created_at", "file_size"
                ])
                .with_near_text({
                    "concepts": [query],
                    "certainty": 0.6  # Minimum similarity threshold
                })
                .with_limit(limit)
                .with_additional(["certainty", "distance"])
            )
            
            # Add where filter if present
            if where_filter:
                query_builder = query_builder.with_where(where_filter)
            
            # Execute query
            response = query_builder.do()
            
            # Process results
            results = []
            if response.get("data", {}).get("Get", {}).get(self.class_name):
                for item in response["data"]["Get"][self.class_name]:
                    certainty = item.get("_additional", {}).get("certainty", 0)
                    
                    # Build snippet from content
                    content = item.get("content", "")
                    snippet = content[:200] + "..." if len(content) > 200 else content
                    
                    result = {
                        "id": item.get("document_id", ""),
                        "filename": item.get("filename", ""),
                        "title": item.get("title", item.get("filename", "")),
                        "snippet": snippet,
                        "score": certainty,
                        "file_type": item.get("file_type", ""),
                        "tags": item.get("tags", []),
                        "created_at": item.get("created_at", ""),
                        "uploaded_by": item.get("uploaded_by", ""),
                        "search_type": "semantic"
                    }
                    results.append(result)
            
            logger.info(f"Weaviate found {len(results)} semantic results for: {query[:50]}")
            return results
            
        except Exception as e:
            logger.error(f"Weaviate search error: {str(e)}")
            return []
    
    async def add_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Add a document to Weaviate vector database
        
        Args:
            document_id: Document ID
            content: Document content (will be vectorized automatically)
            metadata: Document metadata (filename, title, file_type, etc.)
            
        Returns:
            Success status
        """
        try:
            if not self.client:
                logger.warning("Weaviate client not initialized; skipping add_document.")
                return False
            # Prepare document object for Weaviate
            doc_object = {
                "document_id": document_id,
                "filename": metadata.get("filename", ""),
                "title": metadata.get("title", ""),
                "content": content,
                "description": metadata.get("description", ""),
                "file_type": metadata.get("file_type", ""),
                "tags": metadata.get("tags", []),
                "uploaded_by": metadata.get("uploaded_by", ""),
                "created_at": metadata.get("created_at", ""),
                "updated_at": metadata.get("updated_at", ""),
                "file_size": metadata.get("file_size", 0),
                "indexed_at": datetime.utcnow().isoformat()
            }
            
            # Add document to Weaviate (vectorization happens automatically)
            result = self.client.data_object.create(
                data_object=doc_object,
                class_name=self.class_name,
                uuid=document_id
            )
            
            logger.info(f"Document added to Weaviate: {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Weaviate add error: {str(e)}")
            return False
    
    async def ensure_schema_exists(self) -> bool:
        """
        Ensure the Weaviate schema exists for documents
        """
        try:
            if not self.client:
                logger.warning("Weaviate client not initialized; cannot ensure schema.")
                return False
            # Check if class exists
            existing_classes = self.client.schema.get()["classes"]
            class_names = [cls["class"] for cls in existing_classes]
            
            if self.class_name in class_names:
                return True
            
            # Create document class schema
            document_class = {
                "class": self.class_name,
                "description": "Document objects for semantic search",
                "vectorizer": "text2vec-transformers",
                "moduleConfig": {
                    "text2vec-transformers": {
                        "poolingStrategy": "masked_mean",
                        "vectorizeClassName": False
                    }
                },
                "properties": [
                    {
                        "name": "document_id",
                        "dataType": ["text"],
                        "description": "Unique document identifier",
                        "moduleConfig": {"text2vec-transformers": {"skip": True}}
                    },
                    {
                        "name": "filename",
                        "dataType": ["text"],
                        "description": "Document filename"
                    },
                    {
                        "name": "title", 
                        "dataType": ["text"],
                        "description": "Document title"
                    },
                    {
                        "name": "content",
                        "dataType": ["text"],
                        "description": "Full document content for vectorization"
                    },
                    {
                        "name": "description",
                        "dataType": ["text"],
                        "description": "Document description"
                    },
                    {
                        "name": "file_type",
                        "dataType": ["text"],
                        "description": "Document file type",
                        "moduleConfig": {"text2vec-transformers": {"skip": True}}
                    },
                    {
                        "name": "tags",
                        "dataType": ["text[]"],
                        "description": "Document tags"
                    },
                    {
                        "name": "uploaded_by",
                        "dataType": ["text"],
                        "description": "User who uploaded the document",
                        "moduleConfig": {"text2vec-transformers": {"skip": True}}
                    },
                    {
                        "name": "created_at",
                        "dataType": ["date"],
                        "description": "Document creation date",
                        "moduleConfig": {"text2vec-transformers": {"skip": True}}
                    },
                    {
                        "name": "file_size",
                        "dataType": ["int"],
                        "description": "File size in bytes",
                        "moduleConfig": {"text2vec-transformers": {"skip": True}}
                    }
                ]
            }
            
            # Create the class
            self.client.schema.create_class(document_class)
            logger.info(f"Created Weaviate class: {self.class_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating Weaviate schema: {str(e)}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Weaviate cluster health"""
        try:
            if not self.client:
                return {"status": "unhealthy", "error": "weaviate_client_not_initialized"}
            meta = self.client.get_meta()
            return {
                "status": "healthy",
                "version": meta.get("version", "unknown"),
                "modules": list(meta.get("modules", {}).keys())
            }
        except Exception as e:
            logger.error(f"Weaviate health check failed: {str(e)}")
            return {"status": "unhealthy", "error": str(e)}