"""
Search service for document retrieval
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID as UUID_t
from dataclasses import dataclass
from app.core.cache import cache_service
from app.core.document_scope import get_effective_document_ids
from sqlalchemy import select
from app.models.document import Document
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Search result data class"""
    document_id: str
    chunk_id: Optional[str]
    content: str
    score: float
    metadata: Dict[str, Any]


class SearchService:
    """Service for searching and indexing documents using Elasticsearch and Qdrant"""
    
    def __init__(self, db=None):
        # db is optional; kept for compatibility with callers that pass a Session
        self.db = db
        # Initialize search clients with proper error handling
        try:
            from app.services.search.elasticsearch_service import ElasticsearchService
            self.elasticsearch_client = ElasticsearchService()
            logger.info("✅ Elasticsearch client initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Elasticsearch client: {e}")
            self.elasticsearch_client = None
        
        try:
            from app.services.search.qdrant_service import QdrantService
            self.qdrant_client = QdrantService()
            logger.info("✅ Qdrant client initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Qdrant client: {e}")
            self.qdrant_client = None
    
    async def search(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        selected_document_ids: Optional[set] = None
    ) -> List[SearchResult]:
        """
        Search for documents matching the query with role-based scope enforcement
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            filters: Optional filters to apply
            user: Current user (for scope enforcement)
            selected_document_ids: Optional set of document IDs from frontend selection
            
        Returns:
            List of search results
        """
        try:
            # Try hybrid search first if clients are available
            if self.elasticsearch_client and self.qdrant_client:
                logger.debug(f"Using hybrid search for query: {query}")
                return await self.hybrid_search(query, limit, alpha=0.5, user=user, selected_document_ids=selected_document_ids)
            
            # Fallback to database search
            logger.debug(f"Using database search (fallback) for query: {query}")
            results = []
            
            # If we have a database session, search actual documents
            if self.db:
                # Search in document content and chunks
                from sqlalchemy import or_, and_
                
                # Apply scope-based filtering if user is provided
                effective_doc_ids = None
                if user and hasattr(self.db, 'execute'):
                    effective_doc_ids = await get_effective_document_ids(
                        self.db, user, selected_document_ids
                    )
                    if not effective_doc_ids:
                        # No accessible documents
                        return []
                
                # Convert Session to AsyncSession if needed
                if hasattr(self.db, 'execute'):
                    # Build query to search document content
                    search_query = select(Document).where(
                        or_(
                            Document.title.ilike(f"%{query}%"),
                            Document.description.ilike(f"%{query}%"),
                            Document.full_text.ilike(f"%{query}%")
                        )
                    )
                    
                    # Apply scope filtering
                    if effective_doc_ids is not None:
                        search_query = search_query.where(Document.id.in_(effective_doc_ids))
                    
                    # Apply filters if provided
                    if filters:
                        if 'document_ids' in filters:
                            search_query = search_query.where(
                                Document.uuid.in_(filters['document_ids'])
                            )
                    
                    search_query = search_query.limit(limit)
                    
                    # Execute query
                    if hasattr(self.db, 'execute'):
                        # Async session
                        result = await self.db.execute(search_query)
                        documents = result.scalars().all()
                    else:
                        # Sync session
                        documents = self.db.query(Document).filter(
                            or_(
                                Document.title.ilike(f"%{query}%"),
                                Document.description.ilike(f"%{query}%"),
                                Document.full_text.ilike(f"%{query}%")
                            )
                        ).limit(limit).all()
                    
                    # Convert documents to search results
                    for doc in documents:
                        # Calculate relevance score (simplified)
                        score = 0.5
                        if doc.title and query.lower() in doc.title.lower():
                            score += 0.3
                        if doc.description and query.lower() in doc.description.lower():
                            score += 0.2
                        
                        results.append(SearchResult(
                            document_id=str(doc.uuid),
                            chunk_id=None,
                            content=doc.full_text[:1000] if doc.full_text else doc.description or "",
                            score=score,
                            metadata={
                                "title": doc.title,
                                "filename": doc.filename,
                                "file_type": doc.file_type,
                                "created_at": doc.created_at.isoformat() if doc.created_at else None
                            }
                        ))
            
            logger.info(f"Search completed for query: {query[:50]}... Found {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Error during search: {str(e)}")
            return []
    
    async def hybrid_search(
        self,
        query: str,
        limit: int = 10,
        alpha: float = 0.5,
        user: Optional[User] = None,
        selected_document_ids: Optional[set] = None
    ) -> List[SearchResult]:
        """
        Perform hybrid search combining keyword and vector search
        
        Args:
            query: Search query string
            limit: Maximum number of results
            alpha: Weight for combining keyword and vector scores (0-1)
            
        Returns:
            List of search results
        """
        try:
            # For now, implement a pragmatic hybrid by combining SQL keyword matching (as BM25 proxy)
            # with a second pass simple semantic re-rank placeholder (future: Weaviate). 
            # Always enforce scope (RBAC/ABAC + selection).
            if not self.db:
                return []

            from sqlalchemy import or_

            # Determine scope
            effective_doc_ids = None
            if user and hasattr(self.db, 'execute'):
                effective_doc_ids = await get_effective_document_ids(
                    self.db, user, selected_document_ids
                )
                if not effective_doc_ids:
                    return []

            # Keyword phase (SQL LIKE as a keyword proxy)
            kw_query = select(Document).where(
                or_(
                    Document.title.ilike(f"%{query}%"),
                    Document.description.ilike(f"%{query}%"),
                    Document.full_text.ilike(f"%{query}%")
                )
            )
            if effective_doc_ids is not None:
                kw_query = kw_query.where(Document.id.in_(effective_doc_ids))

            kw_query = kw_query.limit(limit * 3)  # widen, we'll re-rank and trim
            kw_result = await self.db.execute(kw_query)
            kw_docs = kw_result.scalars().all()

            # Simple re-rank: prioritize title match, then description, then body
            def score_doc(doc) -> float:
                base = 0.0
                ql = query.lower()
                if doc.title and ql in (doc.title or '').lower():
                    base += 0.6
                if doc.description and ql in (doc.description or '').lower():
                    base += 0.3
                if doc.full_text and ql in (doc.full_text or '').lower():
                    base += 0.1
                return base

            ranked = sorted(kw_docs, key=score_doc, reverse=True)[:limit]

            results: List[SearchResult] = []
            for doc in ranked:
                results.append(SearchResult(
                    document_id=str(doc.uuid),
                    chunk_id=None,
                    content=(doc.description or doc.full_text or "")[:1000],
                    score=score_doc(doc),
                    metadata={
                        "title": doc.title or doc.filename,
                        "filename": doc.filename,
                        "file_type": doc.file_type,
                        "created_at": doc.created_at.isoformat() if doc.created_at else None
                    }
                ))

            logger.info(f"Hybrid search completed for query: {query[:50]}... Found {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error during hybrid search: {str(e)}")
            return []
    
    async def get_document_content_for_chat(
        self,
        document_ids: List[str],
        max_content_length: int = 4000
    ) -> List[Dict[str, Any]]:
        """
        Get document content optimized for chat conversations with caching
        
        Args:
            document_ids: List of document UUIDs
            max_content_length: Maximum content length per document
            
        Returns:
            List of documents with content and metadata
        """
        try:
            documents = []
            
            # Check cache for each document first
            cache_keys = [f"doc_content:{doc_id}" for doc_id in document_ids]
            cached_docs = await cache_service.get_many(cache_keys)
            
            uncached_ids = []
            for i, doc_id in enumerate(document_ids):
                cache_key = cache_keys[i]
                if cache_key in cached_docs:
                    documents.append(cached_docs[cache_key])
                else:
                    uncached_ids.append(doc_id)
            
            # Fetch uncached documents from DB
            if uncached_ids and self.db:
                # Normalize IDs to UUID objects for DB queries
                normalized_ids: List[UUID_t] = []
                for did in uncached_ids:
                    try:
                        normalized_ids.append(did if isinstance(did, UUID_t) else UUID_t(did))
                    except Exception:
                        # Skip invalid UUIDs
                        continue

                if hasattr(self.db, 'execute'):
                    # Async session - no tenant filtering for search service
                    query = select(Document).where(Document.uuid.in_(normalized_ids))
                    result = await self.db.execute(query)
                    db_documents = result.scalars().all()
                else:
                    # Sync session - no tenant filtering for search service
                    db_documents = self.db.query(Document).filter(
                        Document.uuid.in_(normalized_ids)
                    ).all()
                
                # Process and cache new documents
                new_cached_docs = {}
                for doc in db_documents:
                    content = doc.full_text or doc.description or ""
                    
                    # Truncate content if too long
                    if len(content) > max_content_length:
                        content = content[:max_content_length] + "... (truncated)"
                    
                    doc_data = {
                        "id": str(doc.uuid),
                        "title": doc.title or doc.filename,
                        "content": content,
                        "file_type": doc.file_type,
                        "metadata": {
                            "filename": doc.filename,
                            "file_size": doc.file_size,
                            "created_at": doc.created_at.isoformat() if doc.created_at else None,
                            "tags": doc.tags or []
                        }
                    }
                    documents.append(doc_data)
                    new_cached_docs[f"doc_content:{doc.uuid}"] = doc_data
                
                # Cache new documents for 30 minutes
                if new_cached_docs:
                    await cache_service.set_many(new_cached_docs, ttl=1800)
            
            logger.info(f"Retrieved {len(documents)} documents for chat ({len(cached_docs)} cached)")
            return documents
            
        except Exception as e:
            logger.error(f"Error retrieving document content for chat: {e}")
            return []
    
    async def get_document_summary_context(
        self,
        document_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get document context optimized for summarization
        
        Args:
            document_id: Document UUID
            
        Returns:
            Document with full content and metadata
        """
        try:
            if self.db:
                if hasattr(self.db, 'execute'):
                    # Async session
                    query = select(Document).where(Document.uuid == document_id)
                    result = await self.db.execute(query)
                    doc = result.scalar_one_or_none()
                else:
                    # Sync session
                    doc = self.db.query(Document).filter(
                        Document.uuid == document_id
                    ).first()
                
                if doc:
                    return {
                        "id": str(doc.uuid),
                        "title": doc.title or doc.filename,
                        "content": doc.full_text or "",
                        "description": doc.description,
                        "file_type": doc.file_type,
                        "metadata": {
                            "filename": doc.filename,
                            "file_size": doc.file_size,
                            "created_at": doc.created_at.isoformat() if doc.created_at else None,
                            "tags": doc.tags or [],
                            "language": doc.language
                        }
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving document for summary: {e}")
            return None
    
    # --- Indexing stubs used by Celery tasks ---
    def index_document_elasticsearch(self, document: Any) -> bool:
        """Index a document in Elasticsearch (stub)."""
        try:
            logger.info(f"[SearchService] (stub) Indexing document in Elasticsearch: id={document.id}")
            return True
        except Exception as e:
            logger.error(f"Elasticsearch indexing failed: {e}")
            return False

    def index_document_qdrant(self, document: Any) -> bool:
        """Index a document in Qdrant (stub for backward compatibility)."""
        try:
            logger.info(f"[SearchService] (stub) Indexing document in Qdrant: id={document.id}")
            return True
        except Exception as e:
            logger.error(f"Qdrant indexing failed: {e}")
            return False

    def search_sync(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Synchronous version of search for Celery tasks"""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self.search(query, limit, filters))
        finally:
            loop.close()