"""
Chat API endpoints for document conversations

Enterprise-grade chat system with comprehensive error handling,
logging, monitoring, and diagnostic capabilities.
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select
from jose import JWTError, jwt
from app.core.config import settings
import json
import asyncio
import logging
import time

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate, ConversationResponse, ConversationListResponse,
    ChatRequest, ChatResponse, MessageResponse
)
from app.services.async_conversation_service import AsyncConversationService
from app.services.chat_diagnostics import diagnose_chat_system
from app.core.websocket_manager import WebSocketManager

router = APIRouter()
manager = WebSocketManager()
logger = logging.getLogger(__name__)


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation"""
    service = AsyncConversationService(db)
    
    result = await service.create_conversation(
        user_id=current_user.id,
        tenant_id=getattr(current_user, 'tenant_id', None),
        document_ids=[conversation.document_id] if conversation.document_id else None,
        title=conversation.title
    )
    
    return ConversationResponse.from_orm(result)


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's conversations"""
    # For now, return empty list until list_conversations is implemented in async service
    return ConversationListResponse(
        conversations=[],
        total=0,
        page=page,
        page_size=page_size
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific conversation with messages"""
    service = AsyncConversationService(db)
    
    conversation = await service.get_conversation(
        conversation_id=conversation_id,
        user_id=current_user.id,
        tenant_id=getattr(current_user, 'tenant_id', None)
    )
    
    # Load messages
    messages = await service.get_conversation_history(conversation_id)
    conversation.messages = messages
    
    return ConversationResponse.from_orm(conversation)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enterprise-grade chat endpoint with comprehensive error handling
    
    This endpoint processes chat messages with document context,
    maintains conversation history, and provides detailed error reporting.
    """
    # Start performance monitoring
    start_time = time.time()
    
    try:
        logger.info(f"Chat request from user {current_user.email}: {chat_request.message[:50]}...")
        
        # Ensure user has tenant_id (refresh from DB if needed)
        if not hasattr(current_user, 'tenant_id') or current_user.tenant_id is None:
            # Refresh user data from database
            from sqlalchemy import select
            result = await db.execute(
                select(User).where(User.id == current_user.id)
            )
            current_user = result.scalar_one_or_none()
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User authentication failed"
                )
        
        # Initialize conversation service
        service = AsyncConversationService(db)
        
        # Process the chat message
        response = await service.process_chat_message(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            chat_request=chat_request
        )
        
        # Log performance metrics
        elapsed_time = time.time() - start_time
        logger.info(f"Chat response generated in {elapsed_time:.2f}s for user {current_user.email}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error for user {current_user.email}: {str(e)}", exc_info=True)
        
        # Return a user-friendly error response
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your message. Please try again."
        )


@router.get("/diagnostics")
async def chat_diagnostics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Comprehensive chat system diagnostics
    
    Industry-standard health check endpoint for monitoring
    and troubleshooting chat system components.
    """
    try:
        # Only allow admin users to access diagnostics
        if getattr(current_user.role, 'value', current_user.role) != 'Admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Diagnostics access restricted to administrators"
            )
        
        logger.info(f"Chat diagnostics requested by admin: {current_user.email}")
        
        # Run comprehensive diagnostics
        diagnostics_result = await diagnose_chat_system(db, current_user.id)
        
        return {
            "status": "diagnostics_complete",
            "timestamp": time.time(),
            "requested_by": current_user.email,
            "system_health": diagnostics_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Diagnostics failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostics system error: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    service = AsyncConversationService(db)
    
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
    db: AsyncSession = Depends(get_db)
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
        
        # Get user from token (validate JWT similar to deps.get_current_user)
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id_str = payload.get("sub")
            if user_id_str is None:
                raise JWTError("Missing subject")
            user_id = int(user_id_str)
        except (JWTError, ValueError):
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Authentication failed"
            }))
            await manager.disconnect(websocket, str(conversation_id))
            return
        result = await db.execute(select(User).where(User.id == user_id))
        current_user = result.scalar_one_or_none()
        if not current_user:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "User not found"
            }))
            await manager.disconnect(websocket, str(conversation_id))
            return
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "conversation_id": str(conversation_id)
        }))
        
        # Create service instance  
        service = AsyncConversationService(db)
        
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