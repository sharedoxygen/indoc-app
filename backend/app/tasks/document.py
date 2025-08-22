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
        document = self.db.query(Document).filter(Document.id == document_id).first()
        
        if not document:
            logger.error(f"Document {document_id} not found")
            return {"status": "error", "message": "Document not found"}
        
        # Update status
        document.processing_status = "processing"
        self.db.commit()
        
        # Extract text
        text_service = TextExtractionService()
        extracted_text = text_service.extract_text(document.file_path, document.mime_type)
        
        if extracted_text:
            document.extracted_text = extracted_text
            document.processing_status = "text_extracted"
            self.db.commit()
            
            # Index in search engines
            search_service = SearchService(self.db)
            
            # Index in Elasticsearch
            search_service.index_document_elasticsearch(document)
            
            # Generate embeddings and index in Weaviate
            search_service.index_document_weaviate(document)
            
            document.processing_status = "completed"
            document.is_indexed = True
            self.db.commit()
            
            return {
                "status": "success",
                "document_id": str(document_id),
                "text_length": len(extracted_text)
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