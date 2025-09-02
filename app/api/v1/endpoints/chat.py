"""
Chat API endpoints for document conversations
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
import json
import asyncio

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate, ConversationResponse, ConversationListResponse,
    ChatRequest, ChatResponse, MessageResponse
)
from app.services.conversation_service import ConversationService
from app.core.websocket_manager import WebSocketManager

router = APIRouter()
manager = WebSocketManager()


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation"""
    service = ConversationService(db)
    
    result = await service.create_conversation(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        document_id=conversation.document_id,
        title=conversation.title
    )
    
    return ConversationResponse.from_orm(result)


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's conversations"""
    service = ConversationService(db)
    
    result = await service.list_conversations(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        page=page,
        page_size=page_size
    )
    
    return ConversationListResponse(**result)


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific conversation with messages"""
    service = ConversationService(db)
    
    conversation = await service.get_conversation(
        conversation_id=conversation_id,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id
    )
    
    # Load messages
    messages = await service.get_conversation_history(conversation_id)
    conversation.messages = messages
    
    return ConversationResponse.from_orm(conversation)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a chat message and get response"""
    service = ConversationService(db)
    
    response = await service.process_chat_message(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        chat_request=chat_request
    )
    
    return response


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
        
        # Get user from token (implement proper JWT validation)
        # current_user = await get_user_from_token(token, db)
        
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