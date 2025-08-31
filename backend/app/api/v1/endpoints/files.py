"""
File management endpoints
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
import hashlib
import logging
from pathlib import Path
import aiofiles
import uuid

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.security import get_current_user, require_uploader, require_admin
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.document import Document
from app.models.audit import AuditLog
from app.schemas.document import DocumentResponse, DocumentUpdate, DocumentList
from app.services.document_processor import DocumentProcessor
from app.services.virus_scanner import VirusScanner

router = APIRouter()

document_processor = DocumentProcessor()
virus_scanner = VirusScanner()




@router.get("/list")
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    file_type: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """List documents accessible to current user with search and filtering"""
    
    # Build query based on user role
    query = select(Document)
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        query = query.where(Document.uploaded_by == current_user.id)
    
    # Add search filter - use Elasticsearch directly
    if search:
        try:
            from app.services.search.elasticsearch_service import ElasticsearchService
            es_service = ElasticsearchService()
            
            # Search in Elasticsearch
            search_results = await es_service.search(search, 1000, filters)  
            search_doc_ids = [result["id"] for result in search_results]
            
            if search_doc_ids:
                # Convert string UUIDs to UUID objects for the query
                from uuid import UUID
                uuid_list = [UUID(doc_id) for doc_id in search_doc_ids]
                query = query.where(Document.uuid.in_(uuid_list))
            else:
                # No search results found, return empty
                query = query.where(Document.uuid == "00000000-0000-0000-0000-000000000000")  # Non-existent ID
                
        except Exception as e:
            logger.error(f"Elasticsearch search error, falling back to database search: {e}")
            # Fallback to database search
            search_term = f"%{search.lower()}%"
            query = query.where(
                func.lower(Document.filename).like(search_term) |
                func.lower(Document.title).like(search_term) |
                func.lower(Document.description).like(search_term) |
                func.lower(Document.full_text).like(search_term)
            )
    
    # Add file type filter
    if file_type and file_type != "all":
        query = query.where(Document.file_type == file_type)
    
    # Add sorting
    if sort_by == "filename":
        order_col = Document.filename
    elif sort_by == "file_type":
        order_col = Document.file_type
    elif sort_by == "file_size":
        order_col = Document.file_size
    elif sort_by == "updated_at":
        order_col = Document.updated_at
    else:  # default to created_at
        order_col = Document.created_at
    
    if sort_order == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())
    
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()
    
    # Get documents
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # Convert to simple response format (avoiding Pydantic models for now)
    doc_responses = []
    for doc in documents:
        doc_responses.append({
            "id": doc.id,
            "uuid": str(doc.uuid),
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "virus_scan_status": doc.virus_scan_status,
            "title": doc.title,
            "description": doc.description,
            "tags": doc.tags,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
        })
    
    return {
        "total": total,
        "documents": doc_responses
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(require_uploader),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Upload a new document"""
    
    print(f"🔍 Upload successful for user: {current_user.email}")
    
    try:
        # Basic validation
        file_ext = Path(file.filename).suffix.lower().strip('.')
        if not file_ext:
            return {"error": "File must have an extension"}
        
        # Read file content
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Create a basic document record
        document = Document(
            filename=file.filename,
            file_type=file_ext,
            file_size=len(content),
            file_hash=file_hash,
            storage_path=f"./data/storage/{file_hash}.{file_ext}",
            temp_path=f"./data/temp/{file_hash}.{file_ext}",
            status="uploaded",
            title=title or file.filename,
            description=description,
            uploaded_by=current_user.id
        )
        
        db.add(document)
        await db.commit()
        await db.refresh(document)

        # Ensure storage directory exists and save file content
        storage_path = Path(document.storage_path)
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(storage_path, 'wb') as out:
            await out.write(content)
        
        # Trigger automatic document processing
        from app.tasks.document import process_document
        process_document.delay(str(document.uuid))  # Use UUID, not ID
        
        logger.info(f"🚀 Triggered processing for document: {document.filename}")
        
        return {
            "id": document.id,
            "uuid": str(document.uuid),
            "filename": document.filename,
            "status": document.status,
            "virus_scan_status": document.virus_scan_status,
            "message": "File uploaded successfully and processing started"
        }
        
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get document by ID"""
    
    # Get document
    result = await db.execute(
        select(Document).where(Document.uuid == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check access
    if getattr(current_user.role, "value", current_user.role) not in ["Admin", "Reviewer"] and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Log access
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=getattr(current_user.role, "value", current_user.role),
        action="read",
        resource_type="document",
        resource_id=str(document.uuid)
    )
    db.add(audit_log)
    await db.commit()
    
    return DocumentResponse.from_orm(document)


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    update_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update document metadata"""
    
    # Get document
    result = await db.execute(
        select(Document).where(Document.uuid == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check access
    if getattr(current_user.role, "value", current_user.role) not in ["Admin", "Reviewer"] and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(document, field, value)
    
    await db.commit()
    await db.refresh(document)
    
    # Log update
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=getattr(current_user.role, "value", current_user.role),
        action="update",
        resource_type="document",
        resource_id=str(document.uuid),
        details={"updated_fields": list(update_dict.keys())}
    )
    db.add(audit_log)
    await db.commit()
    
    return DocumentResponse.from_orm(document)


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a document (Admin only)"""
    
    # Get document
    result = await db.execute(
        select(Document).where(Document.uuid == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete physical file
    file_path = Path(document.storage_path)
    if file_path.exists():
        file_path.unlink()
    
    # Delete temp file if exists
    if document.temp_path:
        temp_path = Path(document.temp_path)
        if temp_path.exists():
            temp_path.unlink()
    
    # Log deletion before removing
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=getattr(current_user.role, "value", current_user.role),
        action="delete",
        resource_type="document",
        resource_id=str(document.uuid),
        details={"filename": document.filename}
    )
    db.add(audit_log)
    
    # Delete from database
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}