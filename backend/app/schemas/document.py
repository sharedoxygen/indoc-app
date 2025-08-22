"""
Document schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class DocumentBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(DocumentBase):
    pass


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    uuid: str
    filename: str
    file_type: str
    file_size: int
    status: str
    virus_scan_status: str
    created_at: datetime
    updated_at: datetime


class DocumentList(BaseModel):
    total: int
    documents: List[DocumentResponse]