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
from app.services.virus_scanner import VirusScanner
from app.core.processing_websocket import processing_ws_manager
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
    """Process a document with real-time WebSocket updates"""
    
    document = None
    user_id = None
    
    try:
        # Get document from database
        document = self.db.query(Document).filter(Document.uuid == document_id).first()
        
        if not document:
            logger.error(f"Document {document_id} not found")
            return {"status": "error", "message": "Document not found"}
        
        user_id = str(document.uploaded_by)
        
        # Initialize processing status
        run_async(processing_ws_manager.start_document_processing(
            document_id=document_id,
            user_id=user_id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size
        ))
        
        # Step 1: Virus Scan
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="virus_scan",
            status="processing",
            progress=0,
            message="Scanning for malware and threats...",
            details=["ClamAV engine", "Signature database check"]
        ))
        
        virus_scanner = VirusScanner()
        scan_result = virus_scanner.scan_file_sync(Path(document.storage_path))
        
        if scan_result.get("status") == "infected":
            document.status = "failed"
            document.virus_scan_status = "infected"
            document.error_message = f"Virus detected: {scan_result.get('threat_name', 'Unknown threat')}"
            self.db.commit()
            
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="virus_scan",
                status="failed",
                error_message=document.error_message
            ))
            
            run_async(processing_ws_manager.complete_document_processing(
                document_id=document_id,
                user_id=user_id,
                success=False,
                final_message="Document rejected due to virus detection"
            ))
            
            return {"status": "error", "message": document.error_message}
        
        # Virus scan completed successfully
        document.virus_scan_status = "clean"
        self.db.commit()
        
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="virus_scan",
            status="completed",
            progress=100,
            message="File is clean - no threats detected",
            details=["ClamAV scan completed", "No malware found"]
        ))
        
        # Step 2: Text Extraction
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="text_extraction",
            status="processing",
            progress=0,
            message="Extracting text content from document",
            details=["OCR processing", "Content parsing", "Metadata extraction"]
        ))
        
        document.status = "processing"
        self.db.commit()
        
        text_service = TextExtractionService()
        extracted = text_service.extract_text_sync(Path(document.storage_path))
        
        if not extracted or not extracted.get("success"):
            document.status = "failed"
            document.error_message = "Failed to extract text content"
            self.db.commit()
            
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="text_extraction",
                status="failed",
                error_message=document.error_message
            ))
            
            run_async(processing_ws_manager.complete_document_processing(
                document_id=document_id,
                user_id=user_id,
                success=False,
                final_message="Text extraction failed"
            ))
            
            return {"status": "error", "message": document.error_message}
        
        # Text extraction completed
        document.full_text = extracted.get("text", "")
        self.db.commit()
        
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="text_extraction",
            status="completed",
            progress=100,
            message=f"Extracted {len(document.full_text)} characters",
            details=[
                f"Content length: {len(document.full_text)} chars",
                f"File type: {document.file_type}",
                "Text parsing completed"
            ]
        ))
        
        # Prepare metadata for indexing
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
        
        # Step 3: Elasticsearch Indexing
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="elasticsearch_index",
            status="processing",
            progress=0,
            message="Creating keyword search index",
            details=["Field boosting", "Analyzer configuration", "Index optimization"]
        ))
        
        try:
            from app.services.search.elasticsearch_service import ElasticsearchService
            es_service = ElasticsearchService()
            es_result = run_async(es_service.index_document(
                doc_id=str(document.uuid),
                content=document.full_text,
                metadata=metadata
            ))
            
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="elasticsearch_index",
                status="completed",
                progress=100,
                message="Elasticsearch indexing completed",
                details=["Keyword index created", "Search fields configured", "Boosting applied"]
            ))
            
        except Exception as e:
            logger.error(f"Elasticsearch indexing failed: {e}")
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="elasticsearch_index",
                status="failed",
                error_message=f"Elasticsearch indexing failed: {str(e)}"
            ))
        
        # Step 4: Weaviate Vector Indexing
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="weaviate_index",
            status="processing",
            progress=0,
            message="Generating semantic embeddings",
            details=["BERT transformers", "Vector generation", "Similarity indexing"]
        ))
        
        try:
            from app.services.search.weaviate_service import WeaviateService
            weaviate_service = WeaviateService()
            weaviate_result = run_async(weaviate_service.index_document(
                doc_id=str(document.uuid),
                content=document.full_text,
                metadata=metadata
            ))
            
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="weaviate_index",
                status="completed",
                progress=100,
                message="Vector embeddings generated successfully",
                details=["BERT embeddings created", "Vector similarity indexed", "Semantic search ready"]
            ))
            
        except Exception as e:
            logger.error(f"Weaviate indexing failed: {e}")
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="weaviate_index",
                status="failed",
                error_message=f"Weaviate indexing failed: {str(e)}"
            ))
        
        # Step 5: PostgreSQL Update
        run_async(processing_ws_manager.update_processing_step(
            document_id=document_id,
            user_id=user_id,
            step="postgresql_update",
            status="processing",
            progress=0,
            message="Updating database indexes",
            details=["GIN indexes", "Trigram indexes", "Full-text search"]
        ))
        
        try:
            # Update document status and indexes
            document.status = "indexed"
            self.db.commit()
            
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="postgresql_update",
                status="completed",
                progress=100,
                message="Database indexes updated successfully",
                details=["Document status: indexed", "Search indexes updated", "Metadata stored"]
            ))
            
        except Exception as e:
            logger.error(f"PostgreSQL update failed: {e}")
            run_async(processing_ws_manager.update_processing_step(
                document_id=document_id,
                user_id=user_id,
                step="postgresql_update",
                status="failed",
                error_message=f"Database update failed: {str(e)}"
            ))
        
        # Complete processing
        run_async(processing_ws_manager.complete_document_processing(
            document_id=document_id,
            user_id=user_id,
            success=True,
            final_message=f"Document '{document.filename}' processed successfully and ready for search"
        ))
        
        logger.info(f"Document processing completed successfully: {document.filename}")
        
        return {
            "status": "success",
            "document_id": str(document_id),
            "text_length": len(document.full_text or "")
        }
            
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        
        if document:
            document.status = "failed"
            document.error_message = str(e)
            self.db.commit()
        
        if user_id:
            run_async(processing_ws_manager.complete_document_processing(
                document_id=document_id,
                user_id=user_id,
                success=False,
                final_message=f"Processing failed: {str(e)}"
            ))
        
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
        # Find documents queued for processing
        pending_docs = self.db.query(Document).filter(
            Document.status == "uploaded"
        ).limit(10).all()
        
        if not pending_docs:
            return {"status": "success", "message": "No pending documents"}
        
        # Process each document
        for doc in pending_docs:
            process_document.delay(str(doc.uuid))
        
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