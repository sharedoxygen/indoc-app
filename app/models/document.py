"""
Document and DocumentChunk models
"""
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, ForeignKey, JSON, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.models.base import BaseModel


class Document(BaseModel):
    __tablename__ = "documents"
    
    # Basic info
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), index=True)  # SHA-256 hash
    
    # Storage
    storage_path = Column(String(500), nullable=False)
    temp_path = Column(String(500))  # Temporary path during processing
    
    # Processing status
    status = Column(String(50), default="pending", nullable=False)  # pending, processing, indexed, failed
    error_message = Column(Text)
    virus_scan_status = Column(String(50), default="pending")  # pending, clean, infected, error
    virus_scan_result = Column(JSON)
    
    # Metadata
    title = Column(String(500))
    description = Column(Text)
    tags = Column(JSON, default=list)
    custom_metadata = Column(JSON, default=dict)
    
    # Extracted content
    full_text = Column(Text)
    extracted_data = Column(JSON)  # Structured data from forms/tables
    language = Column(String(10))
    
    # Search
    elasticsearch_id = Column(String(100))
    weaviate_id = Column(String(100))
    
    # Security
    encrypted_fields = Column(JSON, default=list)  # List of encrypted field names
    access_level = Column(String(50), default="private")  # public, internal, private, confidential
    
    # Multi-tenancy and user relationship
    tenant_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_by_user = relationship("User", back_populates="documents")
    
    # Optional folder structure for original source path (relative)
    folder_structure = Column(String(500))

    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    document_metadata = relationship("Metadata", back_populates="document", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="document", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(BaseModel):
    __tablename__ = "document_chunks"
    
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    chunk_type = Column(String(50))  # paragraph, section, table, image_caption
    
    # Position in document
    page_number = Column(Integer)
    start_char = Column(Integer)
    end_char = Column(Integer)
    
    # Embeddings
    embedding_vector = Column(LargeBinary)  # Stored as binary
    embedding_model = Column(String(100))
    
    # Search scores
    relevance_score = Column(Float)
    
    # Relationships
    document = relationship("Document", back_populates="chunks")