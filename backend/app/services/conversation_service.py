"""
Conversation service for document chat functionality
"""
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
import json
import asyncio
from fastapi import HTTPException, status

from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas.conversation import (
    ConversationCreate, ConversationResponse, 
    MessageCreate, MessageResponse,
    ChatRequest, ChatResponse
)
from app.core.config import settings
from app.mcp.client import MCPClient
from app.services.search_service import SearchService


class ConversationService:
    """Service for managing document conversations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.mcp_client = MCPClient()
        self.search_service = SearchService(db)
    
    async def create_conversation(
        self, 
        user_id: UUID,
        tenant_id: UUID,
        document_id: Optional[UUID] = None,
        title: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation"""
        
        # If document_id provided, verify it exists and user has access
        if document_id:
            document = self.db.query(Document).filter(
                Document.id == document_id,
                Document.tenant_id == tenant_id
            ).first()
            
            if not document:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found or access denied"
                )
            
            if not title:
                title = f"Chat with {document.filename}"
        
        conversation = Conversation(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            document_id=document_id,
            title=title or "New Conversation",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        
        return conversation
    
    async def get_conversation(
        self, 
        conversation_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> Conversation:
        """Get a conversation by ID"""
        
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.tenant_id == tenant_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return conversation
    
    async def list_conversations(
        self,
        user_id: UUID,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """List user's conversations"""
        
        query = self.db.query(Conversation).filter(
            Conversation.user_id == user_id,
            Conversation.tenant_id == tenant_id
        ).order_by(desc(Conversation.updated_at))
        
        total = query.count()
        conversations = query.offset((page - 1) * page_size).limit(page_size).all()
        
        return {
            "conversations": conversations,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    
    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """Add a message to a conversation"""
        
        message = Message(
            id=uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata=metadata or {},
            created_at=datetime.utcnow()
        )
        
        self.db.add(message)
        
        # Update conversation's updated_at
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        conversation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(message)
        
        return message
    
    async def get_conversation_history(
        self,
        conversation_id: UUID,
        limit: int = 50
    ) -> List[Message]:
        """Get conversation message history"""
        
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).limit(limit).all()
        
        return messages
    
    async def process_chat_message(
        self,
        user_id: UUID,
        tenant_id: UUID,
        chat_request: ChatRequest
    ) -> ChatResponse:
        """Process a chat message and generate response"""
        
        # Get or create conversation
        if chat_request.conversation_id:
            conversation = await self.get_conversation(
                chat_request.conversation_id,
                user_id,
                tenant_id
            )
        else:
            conversation = await self.create_conversation(
                user_id,
                tenant_id,
                chat_request.document_id
            )
        
        # Add user message
        user_message = await self.add_message(
            conversation.id,
            "user",
            chat_request.message
        )
        
        # Get conversation context
        context = await self._build_conversation_context(
            conversation,
            chat_request.message
        )
        
        # Generate response using MCP/LLM
        response_content = await self._generate_response(
            chat_request.message,
            context,
            chat_request.stream
        )
        
        # Add assistant message
        assistant_message = await self.add_message(
            conversation.id,
            "assistant",
            response_content,
            metadata={"context_used": bool(context)}
        )
        
        return ChatResponse(
            conversation_id=conversation.id,
            message=MessageResponse.from_orm(user_message),
            response=MessageResponse.from_orm(assistant_message)
        )
    
    async def _build_conversation_context(
        self,
        conversation: Conversation,
        query: str
    ) -> str:
        """Build context for the conversation"""
        
        context_parts = []
        
        # Add document context if available
        if conversation.document_id:
            document = self.db.query(Document).filter(
                Document.id == conversation.document_id
            ).first()
            
            if document:
                # Search for relevant sections in the document
                search_results = await self.search_service.hybrid_search(
                    query=query,
                    document_ids=[str(document.id)],
                    limit=3
                )
                
                if search_results:
                    context_parts.append("Relevant document sections:")
                    for result in search_results[:3]:
                        context_parts.append(f"- {result.get('content', '')[:500]}")
        
        # Add recent conversation history
        recent_messages = await self.get_conversation_history(
            conversation.id,
            limit=10
        )
        
        if recent_messages:
            context_parts.append("\nRecent conversation:")
            for msg in recent_messages[-5:]:  # Last 5 messages
                context_parts.append(f"{msg.role}: {msg.content}")
        
        return "\n".join(context_parts)
    
    async def _generate_response(
        self,
        query: str,
        context: str,
        stream: bool = False
    ) -> str:
        """Generate response using LLM"""
        
        # Prepare prompt with context
        prompt = f"""You are a helpful assistant for document analysis and Q&A.
        
Context:
{context}

User Question: {query}

Please provide a helpful and accurate response based on the context provided. If the context doesn't contain relevant information, indicate that and provide a general response."""
        
        try:
            # Use MCP client to generate response
            response = await self.mcp_client.generate_response(
                prompt=prompt,
                stream=stream
            )
            
            return response
        except Exception as e:
            # Fallback response if LLM fails
            return f"I apologize, but I'm having trouble generating a response right now. Error: {str(e)}"
    
    async def delete_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """Delete a conversation and all its messages"""
        
        conversation = await self.get_conversation(
            conversation_id,
            user_id,
            tenant_id
        )
        
        self.db.delete(conversation)
        self.db.commit()
        
        return True