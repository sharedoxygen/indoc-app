"""
Async Conversation Service

Enterprise-grade async conversation service that properly handles
AsyncSession patterns and follows industry standards for database
session management and error handling.
"""
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from fastapi import HTTPException, status

from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas.conversation import ChatRequest, ChatResponse, MessageResponse
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)


class AsyncConversationService:
    """
    Async-first conversation service following enterprise patterns
    for database operations, error handling, and observability.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.search_service = SearchService(db)
    
    async def create_conversation(
        self, 
        user_id: int,
        tenant_id: Optional[UUID] = None,
        document_ids: Optional[List[UUID]] = None,
        title: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation with proper async patterns"""
        
        try:
            # For multi-document conversations, use first document as primary
            primary_document_id = None
            if document_ids:
                # Verify document exists and user has access
                result = await self.db.execute(
                    select(Document).where(
                        Document.uuid == document_ids[0],
                        Document.uploaded_by == user_id
                    )
                )
                document = result.scalar_one_or_none()
                
                if not document:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Document not found or access denied"
                    )
                
                primary_document_id = document.id
                if not title:
                    if len(document_ids) == 1:
                        title = f"Chat with {document.filename}"
                    else:
                        title = f"Chat with {len(document_ids)} documents"
            
            # Create conversation record with proper tenant_id
            if tenant_id is None:
                tenant_id = uuid4()
                logger.warning(f"Using generated tenant_id: {tenant_id}")
            
            conversation = Conversation(
                id=uuid4(),
                tenant_id=tenant_id,  # CRITICAL: This was missing!
                user_id=user_id,
                document_id=primary_document_id,
                title=title or "New Conversation",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                conversation_metadata={"document_ids": [str(doc_id) for doc_id in (document_ids or [])]}
            )
            
            self.db.add(conversation)
            await self.db.commit()
            await self.db.refresh(conversation)
            
            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            return conversation
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create conversation for user {user_id}: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create conversation"
            )
    
    async def get_conversation(
        self, 
        conversation_id: UUID,
        user_id: int,
        tenant_id: Optional[UUID] = None
    ) -> Conversation:
        """Get conversation with proper access control"""
        
        try:
            result = await self.db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
            
            return conversation
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get conversation {conversation_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve conversation"
            )
    
    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """Add message to conversation with async patterns"""
        
        try:
            message = Message(
                id=uuid4(),
                conversation_id=conversation_id,
                role=role,
                content=content,
                message_metadata=metadata or {},
                created_at=datetime.utcnow()
            )
            
            self.db.add(message)
            
            # Update conversation timestamp
            result = await self.db.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
            
            if conversation:
                conversation.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(message)
            
            return message
            
        except Exception as e:
            logger.error(f"Failed to add message to conversation {conversation_id}: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save message"
            )
    
    async def process_chat_message(
        self,
        user_id: int,
        tenant_id: Optional[UUID],
        chat_request: ChatRequest
    ) -> ChatResponse:
        """
        Process chat message with enterprise-grade error handling
        and proper async patterns throughout.
        """
        
        try:
            # Get or create conversation
            if chat_request.conversation_id:
                conversation = await self.get_conversation(
                    chat_request.conversation_id,
                    user_id,
                    tenant_id
                )
            else:
                conversation = await self.create_conversation(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    document_ids=chat_request.document_ids,
                )
            
            # Add user message
            user_message = await self.add_message(
                conversation.id,
                "user",
                chat_request.message
            )
            
            # Get document context for response generation
            documents = await self._get_documents_for_chat(conversation)
            conversation_history = await self._get_conversation_history(conversation)
            
            # Generate AI response with fallback for model
            selected_model = getattr(chat_request, 'model', None) or "gpt-oss:20b"
            response_content = await self._generate_response_v2(
                chat_request.message,
                documents,
                conversation_history,
                selected_model
            )
            
            # Add assistant message
            assistant_message = await self.add_message(
                conversation.id,
                "assistant",
                response_content,
                metadata={"context_used": bool(documents), "model": selected_model}
            )
            
            return ChatResponse(
                conversation_id=conversation.id,
                message=MessageResponse.from_orm(user_message),
                response=MessageResponse.from_orm(assistant_message)
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Chat processing failed for user {user_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process chat message"
            )
    
    async def _build_conversation_context(
        self,
        conversation: Conversation,
        query: str
    ) -> str:
        """Build context from documents and conversation history"""
        
        context_parts = []
        
        try:
            # Get document IDs from conversation metadata
            document_ids = conversation.conversation_metadata.get("document_ids", [])
            
            if document_ids:
                # Get relevant document sections
                documents = await self.search_service.get_document_content_for_chat(
                    document_ids=document_ids,
                    max_content_length=2000
                )
                
                if documents:
                    context_parts.append("Relevant document sections:")
                    for doc in documents[:3]:  # Limit to 3 documents
                        content = doc.get("content", "")[:500]  # Limit content length
                        context_parts.append(f"- {content}")
            
            # Get recent conversation history
            result = await self.db.execute(
                select(Message).where(
                    Message.conversation_id == conversation.id
                ).order_by(Message.created_at).limit(10)
            )
            recent_messages = result.scalars().all()
            
            if recent_messages:
                context_parts.append("\nRecent conversation:")
                for msg in recent_messages[-5:]:  # Last 5 messages
                    context_parts.append(f"{msg.role}: {msg.content}")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.warning(f"Failed to build context for conversation {conversation.id}: {e}")
            return ""  # Return empty context rather than failing
    
    async def _get_documents_for_chat(self, conversation: Conversation) -> List[Dict[str, Any]]:
        """Get documents for chat context"""
        document_ids = conversation.conversation_metadata.get("document_ids", [])
        if not document_ids:
            return []
        
        return await self.search_service.get_document_content_for_chat(
            document_ids=document_ids,
            max_content_length=2000
        )
    
    async def _get_conversation_history(self, conversation: Conversation) -> List[Dict[str, str]]:
        """Get conversation history"""
        result = await self.db.execute(
            select(Message).where(
                Message.conversation_id == conversation.id
            ).order_by(Message.created_at).limit(10)
        )
        messages = result.scalars().all()
        
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages[-5:]  # Last 5 messages
        ]
    
    async def _generate_response_v2(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        conversation_history: List[Dict[str, str]],
        model: str = "gpt-oss:20b"
    ) -> str:
        """Generate AI response using LLM service with proper document passing"""
        try:
            from app.services.llm_service import LLMService
            llm_service = LLMService()
            
            # Check if Ollama is available
            if not await llm_service.check_ollama_connection():
                return "I'm unable to connect to the language model right now. Please ensure Ollama is running and try again."
            
            # Call answer_question with proper parameters
            return await llm_service.answer_question(
                question=query,
                documents=documents,
                conversation_history=conversation_history
            )
            
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            return "I encountered an error while generating a response. Please try again."
    
    async def _generate_response(
        self,
        query: str,
        context: str,
        model: str = "gpt-oss:20b"
    ) -> str:
        """Generate AI response using LLM service"""
        
        try:
            from app.services.llm_service import LLMService
            llm_service = LLMService()
            
            # Check if Ollama is available
            if not await llm_service.check_ollama_connection():
                return "I'm unable to connect to the language model right now. Please ensure Ollama is running and try again."
            
            # Prepare documents from context for LLM
            documents = []
            if context and 'Relevant document sections:' in context:
                doc_sections = context.split('Relevant document sections:')[1].split('Recent conversation:')[0]
                for line in doc_sections.split('\n'):
                    if line.strip().startswith('- '):
                        documents.append({
                            "content": line[2:],  # Remove "- " prefix
                            "title": "Document Section"
                        })
            
            # Get conversation history
            conversation_history = []
            if context and 'Recent conversation:' in context:
                history_text = context.split('Recent conversation:')[1]
                for line in history_text.split('\n'):
                    if ':' in line and line.strip():
                        role, content = line.split(':', 1)
                        conversation_history.append({
                            "role": role.strip().lower(),
                            "content": content.strip()
                        })
            
            # Generate response using specified model
            return await llm_service.answer_question(
                question=query,
                documents=documents,
                conversation_history=conversation_history
            )
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I encountered an error while processing your request. Please try again."
    
    async def get_conversation_history(
        self,
        conversation_id: UUID,
        limit: int = 50
    ) -> List[Message]:
        """Get conversation message history with async patterns"""
        
        try:
            result = await self.db.execute(
                select(Message).where(
                    Message.conversation_id == conversation_id
                ).order_by(Message.created_at).limit(limit)
            )
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Failed to get conversation history {conversation_id}: {e}")
            return []
    
    async def delete_conversation(
        self,
        conversation_id: UUID,
        user_id: int,
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """Delete conversation with proper access control"""
        
        try:
            # Get conversation first to verify ownership
            conversation = await self.get_conversation(
                conversation_id,
                user_id,
                tenant_id
            )
            
            # Delete conversation (messages will be cascade deleted)
            await self.db.delete(conversation)
            await self.db.commit()
            
            logger.info(f"Deleted conversation {conversation_id} for user {user_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete conversation {conversation_id}: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete conversation"
            )
