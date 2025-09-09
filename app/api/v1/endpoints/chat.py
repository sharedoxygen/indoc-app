"""
Chat API endpoints for document conversations
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import uuid4
from datetime import datetime
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate, ConversationResponse, ConversationListResponse,
    ChatRequest, ChatResponse, MessageResponse
)
from app.services.conversation_service import ConversationService
from app.services.search_service import SearchService
from app.services.llm_service import LLMService
from app.models.conversation import Conversation, Message
from app.core.context_manager import context_manager
from app.core.websocket_manager import WebSocketManager

router = APIRouter()
manager = WebSocketManager()


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation with optional document attachment"""
    # Determine tenant_id, without generating a new one for filtering
    tenant_id = current_user.tenant_id or uuid4()
    # Manually create conversation record using integer document_id
    new_conv = Conversation(
        id=uuid4(),
        tenant_id=tenant_id,
        user_id=current_user.id,
        document_id=conversation.document_id,
        title=conversation.title or ""
    )
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)
    # Return response without loading messages
    return ConversationResponse(
        id=new_conv.id,
        tenant_id=new_conv.tenant_id,
        user_id=new_conv.user_id,
        title=new_conv.title,
        document_id=new_conv.document_id,
        metadata=new_conv.conversation_metadata or {},
        created_at=new_conv.created_at,
        updated_at=new_conv.updated_at,
        messages=[]
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's conversations with proper tenant isolation"""
    try:
        # Handle tenant_id for multi-tenant isolation
        user_tenant_id = getattr(current_user, 'tenant_id', None)
        
        # Build query with proper tenant isolation
        query = select(Conversation).where(Conversation.user_id == current_user.id)
        
        # Multi-tenant: filter by tenant_id if user has one
        # Single-tenant: show all conversations for the user
        if user_tenant_id:
            query = query.where(
                (Conversation.tenant_id == user_tenant_id) | 
                (Conversation.tenant_id.is_(None))  # Include legacy conversations
            )
        
        # Add pagination and ordering
        query = query.order_by(Conversation.updated_at.desc())
        
        # Get total count
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0
        
        # Get conversations with pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        conversations = result.scalars().all()
        
        # Convert to response format
        conversation_responses = []
        for conv in conversations:
            # Load messages for each conversation
            messages_result = await db.execute(
                select(Message).where(Message.conversation_id == conv.id)
                .order_by(Message.created_at)
            )
            messages = messages_result.scalars().all()
            
            conversation_responses.append(ConversationResponse(
                id=conv.id,
                tenant_id=conv.tenant_id,
                user_id=conv.user_id,
                title=conv.title,
                document_id=conv.document_id,
                metadata=conv.conversation_metadata or {},
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                messages=[MessageResponse.from_orm(msg) for msg in messages]
            ))
        
        return ConversationListResponse(
            conversations=conversation_responses,
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error listing conversations for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list conversations: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific conversation with messages and proper tenant isolation"""
    try:
        user_tenant_id = getattr(current_user, 'tenant_id', None)
        
        # Build query with tenant isolation
        query = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
        
        # Add tenant filtering if user has tenant_id
        if user_tenant_id:
            query = query.where(
                (Conversation.tenant_id == user_tenant_id) |
                (Conversation.tenant_id.is_(None))  # Include legacy conversations
            )
        
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Load messages for this conversation
        messages_result = await db.execute(
            select(Message).where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        messages = messages_result.scalars().all()
        
        return ConversationResponse(
            id=conversation.id,
            tenant_id=conversation.tenant_id,
            user_id=conversation.user_id,
            title=conversation.title,
            document_id=conversation.document_id,
            metadata=conversation.conversation_metadata or {},
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            messages=[MessageResponse.from_orm(msg) for msg in messages]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id} for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a chat message and get response (hardened path)."""
    try:
        # Retrieve user tenant_id; do not generate a new one for filtering
        db_tenant_id = current_user.tenant_id

        # Get or create conversation with proper tenant isolation
        conversation: Conversation | None = None
        if chat_request.conversation_id:
            # Load existing conversation with tenant check
            query = select(Conversation).where(
                Conversation.id == chat_request.conversation_id,
                Conversation.user_id == current_user.id
            )
            
            # Add tenant filtering only if user has a tenant_id
            if db_tenant_id is not None:
                query = query.where(
                    (Conversation.tenant_id == db_tenant_id) |
                    (Conversation.tenant_id.is_(None))  # Include legacy conversations
                )
            
            result = await db.execute(query)
            conversation = result.scalar_one_or_none()
            if conversation is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
            
            # ALWAYS update conversation metadata with current document_ids
            current_metadata = conversation.conversation_metadata or {}
            if chat_request.document_ids:
                current_metadata["document_ids"] = [str(d) for d in chat_request.document_ids]
            # Keep existing document_ids if none provided in this request
            elif "document_ids" not in current_metadata:
                current_metadata["document_ids"] = []
            
            conversation.conversation_metadata = current_metadata
            conversation.updated_at = datetime.utcnow()
            await db.commit()
                
        else:
            # Create new conversation
            conversation = Conversation(
                id=uuid4(),
                tenant_id=db_tenant_id or uuid4(),
                user_id=current_user.id,
                document_id=None,
                title=chat_request.message[:60] if chat_request.message else "New Conversation",
                conversation_metadata={"document_ids": [str(d) for d in (chat_request.document_ids or [])]}
            )
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)

        # Persist user message with document context metadata
        user_message = Message(
            id=uuid4(),
            conversation_id=conversation.id,
            role="user",
            content=chat_request.message,
            message_metadata={
                "document_ids": [str(d) for d in (chat_request.document_ids or [])]
            }
        )
        db.add(user_message)
        await db.commit()
        await db.refresh(user_message)

        # Determine model and user role outside try block
        selected_model = getattr(chat_request, 'model', None) or "gpt-oss:20b"
        user_role = getattr(current_user.role, "value", current_user.role) if hasattr(current_user.role, "value") else str(current_user.role)
        
        # Build intelligent context with proper sizing
        try:
            meta = conversation.conversation_metadata or {}
            doc_ids = chat_request.document_ids or meta.get("document_ids", [])
            logger.info(f"Chat doc_ids: {doc_ids}")
            
            # Get documents
            documents = []
            if doc_ids:
                search = SearchService(db)
                documents = await search.get_document_content_for_chat([str(d) for d in doc_ids], max_content_length=2000)
                logger.info(f"Retrieved {len(documents)} documents with content")
            
            # Get conversation history
            history_result = await db.execute(
                select(Message).where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at).limit(10)
            )
            history_messages = history_result.scalars().all()
            conversation_history = [
                {"role": msg.role, "content": msg.content} 
                for msg in history_messages[:-1]  # Exclude current message
            ]
            
            # Calculate context budget based on model and user role
            token_budget = context_manager.calculate_user_context_budget(selected_model, user_role)
            
            # Build context items
            context_items = context_manager.build_context_items(
                user_message=chat_request.message,
                documents=documents,
                conversation_history=conversation_history,
                metadata={"conversation_id": str(conversation.id), "user_role": user_role}
            )
            
            # Optimize context to fit budget
            context_text, context_metadata = context_manager.optimize_context(
                context_items=context_items,
                token_budget=token_budget,
                preserve_document_balance=True
            )
            
            logger.info(f"Context optimized: {context_metadata['utilization_percent']}% of budget used")
            
        except Exception as e:
            logger.error(f"Error building intelligent context: {e}")
            context_text = f"Current question: {chat_request.message}"
            context_metadata = {"error": str(e)}
            token_budget = 4096

        # Generate assistant response via LLM
        llm = LLMService()
        try:
            if not await llm.check_ollama_connection():
                assistant_text = "I'm unable to connect to the language model right now. Please try again later."
            else:
                assistant_text = await llm.generate_response(chat_request.message, context=context_text, temperature=0.3)
        except Exception:
            assistant_text = "I encountered an error while generating a response. Please try again."

        assistant_message = Message(
            id=uuid4(),
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_text,
            message_metadata={
                "context_used": bool(context_text and context_text.strip()),
                "context_metadata": context_metadata if 'context_metadata' in locals() else {},
                "model_used": selected_model,
                "token_budget": token_budget if 'token_budget' in locals() else 0
            }
        )
        db.add(assistant_message)
        await db.commit()
        await db.refresh(assistant_message)

        # Construct message and response payloads, ensuring document_ids are included
        user_msg_resp = MessageResponse.from_orm(user_message)
        # Always include document_ids metadata from request
        user_msg_resp.metadata["document_ids"] = [str(d) for d in (chat_request.document_ids or [])]
        assistant_msg_resp = MessageResponse.from_orm(assistant_message)
        return ChatResponse(
            conversation_id=conversation.id,
            message=user_msg_resp,
            response=assistant_msg_resp
        )
    except HTTPException:
        raise
    except Exception as e:
        # Return explicit error for rapid diagnosis in UI
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    service = ConversationService(db)
    
    await service.delete_conversation(
        conversation_id=conversation_id,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id
    )
    
    return {"message": "Conversation deleted successfully"}


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: UUID,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket, str(conversation_id))
    
    try:
        # Authenticate user from WebSocket
        auth_message = await websocket.receive_text()
        auth_data = json.loads(auth_message)
        token = auth_data.get("token")
        
        # Validate token and get user (simplified - implement proper auth)
        if not token:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Authentication required"
            }))
            await manager.disconnect(websocket, str(conversation_id))
            return
        
        # Get current user from token for authenticated WebSocket sessions
        current_user = await get_current_user(token, db)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "conversation_id": str(conversation_id)
        }))
        
        # Create service instance
        service = ConversationService(db)
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                # Process the message
                chat_request = ChatRequest(
                    message=message_data.get("content"),
                    conversation_id=conversation_id,
                    stream=True
                )
                
                # Send typing indicator
                await websocket.send_text(json.dumps({
                    "type": "typing",
                    "conversation_id": str(conversation_id)
                }))
                
                # Process and get response
                try:
                    # For streaming response, we'd implement chunked sending
                    response = await service.process_chat_message(
                        user_id=current_user.id,
                        tenant_id=current_user.tenant_id,
                        chat_request=chat_request
                    )
                    
                    # Send the response
                    await websocket.send_text(json.dumps({
                        "type": "message",
                        "conversation_id": str(conversation_id),
                        "message": {
                            "id": str(response.response.id),
                            "role": "assistant",
                            "content": response.response.content,
                            "created_at": response.response.created_at.isoformat()
                        }
                    }))
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
            
            elif message_data.get("type") == "ping":
                # Handle ping/pong for connection keep-alive
                await websocket.send_text(json.dumps({
                    "type": "pong"
                }))
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket, str(conversation_id))
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))
        await manager.disconnect(websocket, str(conversation_id))