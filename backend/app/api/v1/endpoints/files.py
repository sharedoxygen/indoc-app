"""
File management endpoints
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
import hashlib
from pathlib import Path
import aiofiles
import uuid

from app.core.config import settings
from app.core.security import get_current_user, require_uploader, require_admin
from app.db.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.audit import AuditLog
from app.schemas.document import DocumentResponse, DocumentUpdate, DocumentList
from app.services.document_processor import DocumentProcessor
from app.services.virus_scanner import VirusScanner

router = APIRouter()

document_processor = DocumentProcessor()
virus_scanner = VirusScanner()


@router.post("/", response_model=DocumentResponse)
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(require_uploader),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Upload a new document"""
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower().strip('.')
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_ext}' not allowed"
        )
    
    # Check file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE} bytes"
        )
    
    # Generate file hash
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Check for duplicate
    existing = await db.execute(
        select(Document).where(Document.file_hash == file_hash)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File already exists"
        )
    
    # Save to temp repository for processing
    temp_path = settings.TEMP_REPO_PATH / f"{uuid.uuid4()}.{file_ext}"
    async with aiofiles.open(temp_path, 'wb') as f:
        await f.write(content)
    
    # Virus scan
    scan_result = await virus_scanner.scan_file(temp_path)
    
    # Create storage path
    storage_dir = settings.STORAGE_PATH / file_hash[:2] / file_hash[2:4]
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_path = storage_dir / f"{file_hash}.{file_ext}"
    
    # Move to permanent storage if clean
    if scan_result["status"] == "clean":
        async with aiofiles.open(storage_path, 'wb') as f:
            await f.write(content)
    
    # Create document record
    document = Document(
        filename=file.filename,
        file_type=file_ext,
        file_size=len(content),
        file_hash=file_hash,
        storage_path=str(storage_path),
        temp_path=str(temp_path),
        status="pending" if scan_result["status"] == "clean" else "quarantined",
        virus_scan_status=scan_result["status"],
        virus_scan_result=scan_result,
        title=title or file.filename,
        description=description,
        tags=tags.split(",") if tags else [],
        uploaded_by=current_user.id
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Log upload
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        action="create",
        resource_type="document",
        resource_id=str(document.uuid),
        details={"filename": file.filename, "size": len(content)}
    )
    db.add(audit_log)
    await db.commit()
    
    # Trigger async processing if clean
    if scan_result["status"] == "clean":
        # This would typically trigger a Celery task
        # For now, we'll process synchronously
        await document_processor.process_document(document.id, db)
    
    return DocumentResponse.from_orm(document)


@router.get("/", response_model=DocumentList)
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """List documents accessible to current user"""
    
    # Build query based on user role
    query = select(Document)
    if current_user.role not in ["Admin", "Reviewer"]:
        query = query.where(Document.uploaded_by == current_user.id)
    
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()
    
    # Get documents
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    documents = result.scalars().all()
    
    return DocumentList(
        total=total,
        documents=[DocumentResponse.from_orm(doc) for doc in documents]
    )


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
    if current_user.role not in ["Admin", "Reviewer"] and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Log access
    audit_log = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
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
    if current_user.role not in ["Admin", "Reviewer"] and document.uploaded_by != current_user.id:
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
        user_role=current_user.role,
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
        user_role=current_user.role,
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