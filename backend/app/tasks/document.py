"""
Document processing tasks for Celery
"""
from typing import Dict, Any
from uuid import UUID
from celery import Task
from sqlalchemy.orm import Session
import logging

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.document import Document
from app.services.text_extraction_service import TextExtractionService
from app.services.search_service import SearchService
from pathlib import Path

logger = logging.getLogger(__name__)


class DocumentTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(base=DocumentTask, bind=True, name="app.tasks.document.process_document")
def process_document(self, document_id: str) -> Dict[str, Any]:
    """Process a document: extract text, generate embeddings, index"""
    
    try:
        # Get document from database
        document = self.db.query(Document).filter(Document.uuid == document_id).first()
        
        if not document:
            logger.error(f"Document {document_id} not found")
            return {"status": "error", "message": "Document not found"}
        
        # Update status
        document.processing_status = "processing"
        self.db.commit()
        
        # Extract text (sync wrapper)
        text_service = TextExtractionService()
        extracted = text_service.extract_text_sync(Path(document.storage_path))
        
        if extracted and extracted.get("success"):
            document.full_text = extracted.get("text", "")
            document.processing_status = "text_extracted"
            self.db.commit()
            
            # Index in search engines
            from app.services.search.elasticsearch_service import ElasticsearchService
            from app.services.search.weaviate_service import WeaviateService
            
            # Prepare metadata
            metadata = {
                "filename": document.filename,
                "title": document.title or document.filename,
                "description": document.description or "",
                "file_type": document.file_type,
                "tags": document.tags or [],
                "uploaded_by": str(document.uploaded_by),
                "created_at": document.created_at.isoformat(),
                "updated_at": document.updated_at.isoformat() if document.updated_at else document.created_at.isoformat(),
                "file_size": document.file_size
            }
            
            # Index in search engines (sync wrapper for async services)
            try:
                import asyncio
                from app.services.search.elasticsearch_service import ElasticsearchService
                from app.services.search.weaviate_service import WeaviateService
                
                async def index_document():
                    # Index in Elasticsearch
                    try:
                        es_service = ElasticsearchService()
                        es_success = await es_service.index_document(str(document.uuid), document.full_text, metadata)
                        logger.info(f"Elasticsearch indexing: {'success' if es_success else 'failed'}")
                    except Exception as e:
                        logger.error(f"Elasticsearch indexing error: {e}")
                    
                    # Index in Weaviate  
                    try:
                        weaviate_service = WeaviateService()
                        weaviate_success = await weaviate_service.add_document(str(document.uuid), document.full_text, metadata)
                        logger.info(f"Weaviate indexing: {'success' if weaviate_success else 'failed'}")
                    except Exception as e:
                        logger.error(f"Weaviate indexing error: {e}")
                
                # Run async indexing in sync context
                asyncio.run(index_document())
                
            except Exception as e:
                logger.error(f"Search indexing failed: {e}")
            
            document.status = "indexed"  # Update main status
            document.processing_status = "completed"
            self.db.commit()
            
            return {
                "status": "success",
                "document_id": str(document_id),
                "text_length": len(document.full_text or "")
            }
        else:
            document.processing_status = "failed"
            self.db.commit()
            return {
                "status": "error",
                "message": "Failed to extract text"
            }
            
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        
        if document:
            document.processing_status = "failed"
            document.error_message = str(e)
            self.db.commit()
        
        return {
            "status": "error",
            "message": str(e)
        }


@celery_app.task(base=DocumentTask, bind=True, name="app.tasks.document.batch_process_documents")
def batch_process_documents(self, document_ids: list) -> Dict[str, Any]:
    """Process multiple documents in batch"""
    
    results = {
        "total": len(document_ids),
        "successful": 0,
        "failed": 0,
        "documents": []
    }
    
    for doc_id in document_ids:
        result = process_document.delay(doc_id)
        
        # Track results
        if result.get("status") == "success":
            results["successful"] += 1
        else:
            results["failed"] += 1
        
        results["documents"].append({
            "id": doc_id,
            "task_id": result.id,
            "status": result.get("status")
        })
    
    return results


@celery_app.task(base=DocumentTask, bind=True, name="app.tasks.document.process_pending_documents")
def process_pending_documents(self) -> Dict[str, Any]:
    """Periodic task to process pending documents"""
    
    try:
        # Find pending documents
        pending_docs = self.db.query(Document).filter(
            Document.processing_status == "pending"
        ).limit(10).all()
        
        if not pending_docs:
            return {"status": "success", "message": "No pending documents"}
        
        # Process each document
        for doc in pending_docs:
            process_document.delay(str(doc.id))
        
        return {
            "status": "success",
            "processed": len(pending_docs)
        }
        
    except Exception as e:
        logger.error(f"Error processing pending documents: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


@celery_app.task(base=DocumentTask, bind=True, name="app.tasks.document.reindex_document")
def reindex_document(self, document_id: str) -> Dict[str, Any]:
    """Reindex a document in search engines"""
    
    try:
        document = self.db.query(Document).filter(Document.id == document_id).first()
        
        if not document:
            return {"status": "error", "message": "Document not found"}
        
        search_service = SearchService(self.db)
        
        # Reindex in Elasticsearch
        search_service.index_document_elasticsearch(document)
        
        # Reindex in Weaviate
        search_service.index_document_weaviate(document)
        
        document.is_indexed = True
        self.db.commit()
        
        return {
            "status": "success",
            "document_id": str(document_id)
        }
        
    except Exception as e:
        logger.error(f"Error reindexing document {document_id}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }