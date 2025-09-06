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
import asyncio

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper to run async code in a sync Celery task"""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)


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
        document.status = "processing"
        self.db.commit()
        
        # Adaptive timeout helpers
        from datetime import datetime, timedelta
        def compute_budgets(file_size_bytes: int, file_type: str):
            size_mb = max(1, int(file_size_bytes / (1024 * 1024)))
            # Base budgets (seconds)
            if file_type.startswith("image/"):
                soft, hard = 120 + 2 * size_mb, 180 + 3 * size_mb
            elif file_type in ("application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
                soft, hard = 60 + 1 * size_mb, 120 + 2 * size_mb
            else:
                soft, hard = 45 + size_mb, 90 + 2 * size_mb
            # Clamp to sane bounds
            soft = min(soft, 240)
            hard = min(hard, 360)
            return soft, hard

        soft_limit_s, hard_limit_s = compute_budgets(document.file_size or 0, document.file_type or "")
        step_started_at = datetime.utcnow()

        # Virus scan before extraction
        try:
            from app.services.virus_scanner import VirusScanner
            scanner = VirusScanner()
            scan_result = scanner.scan_file_sync(Path(document.storage_path))
            document.virus_scan_status = scan_result.get("status", "error")
            self.db.commit()
            if scan_result.get("status") == "infected":
                document.status = "failed"
                document.error_message = ", ".join(scan_result.get("threats", ["Virus detected"]))
                self.db.commit()
                return {"status": "error", "message": document.error_message}
        except Exception as e:
            logger.warning(f"Virus scan error: {e}")

        # Extract text (sync wrapper) - handle images gracefully
        text_service = TextExtractionService()
        
        # Check if this is an image file - skip text extraction for images
        file_extension = Path(document.storage_path).suffix.lower().strip('.')
        if file_extension in ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp']:
            # Images don't have extractable text - mark as text_extracted with empty text
            document.full_text = ""
            document.status = "text_extracted"
            self.db.commit()
            logger.info(f"Skipped text extraction for image file: {document.filename}")
        else:
            # Regular text extraction for documents
            extracted = text_service.extract_text_sync(Path(document.storage_path))
            # Enforce adaptive hard limit per step
            if datetime.utcnow() - step_started_at > timedelta(seconds=hard_limit_s):
                document.status = "failed"
                document.error_message = f"Processing timeout (> {hard_limit_s}s)"
                self.db.commit()
                return {"status": "error", "message": document.error_message}
            
            if extracted and extracted.get("success"):
                document.full_text = extracted.get("text", "")
                document.status = "text_extracted"
                self.db.commit()
            else:
                document.status = "failed"
                document.error_message = extracted.get("error") if extracted else "Unknown extraction error"
                self.db.commit()
                return {"status": "error", "message": document.error_message}
        
        # Index in search engines (for both images and text documents)
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
                from app.services.search.elasticsearch_service import ElasticsearchService
                from app.services.search.weaviate_service import WeaviateService
                es = ElasticsearchService()
                weav = WeaviateService()
                run_async(es.index_document(doc_id=str(document.uuid), content=document.full_text, metadata=metadata))
                run_async(weav.index_document(doc_id=str(document.uuid), content=document.full_text, metadata=metadata))
                
            except Exception as e:
                logger.error(f"Search indexing failed: {e}")
            
            document.status = "indexed"  # Update main status
            self.db.commit()
            
            return {
                "status": "success",
                "document_id": str(document_id),
                "text_length": len(document.full_text or "")
            }
        else:
            document.status = "failed"
            document.error_message = extracted.get("error") if extracted else "Unknown extraction error"
            self.db.commit()
            return {
                "status": "error",
                "message": document.error_message
            }
            
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        
        if document:
            document.status = "failed"
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
    """Periodic task to enqueue documents awaiting processing.

    Picks up both 'pending' and legacy 'uploaded' statuses and immediately
    flips them to 'processing' to avoid duplicate task enqueues.
    """
    try:
        pending_docs = (
            self.db.query(Document)
            .filter(Document.status.in_(["pending", "uploaded"]))
            .limit(25)
            .all()
        )

        if not pending_docs:
            return {"status": "success", "message": "No pending documents"}

        processed = 0
        for doc in pending_docs:
            # Mark as processing to prevent re-enqueueing in subsequent runs
            doc.status = "processing"
            self.db.add(doc)
            self.db.commit()

            process_document.delay(str(doc.uuid))
            processed += 1

        return {"status": "success", "processed": processed}
    except Exception as e:
        logger.error(f"Error processing pending documents: {str(e)}")
        return {"status": "error", "message": str(e)}


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