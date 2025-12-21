from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from conversation.schemas import MessageCreate, MessageOut
from database import SessionLocal
from authenticate.models import Conversation, Message
from conversation.schemas import (
    ConversationCreate,
    ConversationOut,
    ConversationWithMessages
)
from authenticate.dependencies import get_db, get_current_user_id

router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"]
)

# -------------------------
# Create Conversation
# -------------------------
@router.post("/", response_model=ConversationOut)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    convo = Conversation(
        user_id=user_id,
        title=data.title or "New Conversation"
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


# -------------------------
# List User Conversations
# -------------------------
@router.get("/", response_model=List[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
        .all()
    )


# -------------------------
# Get Conversation + Messages
# -------------------------
@router.get("/{conversation_id}", response_model=ConversationWithMessages)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    convo = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
        .first()
    )

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return convo

@router.post("/{conversation_id}/messages", response_model=MessageOut)
def add_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id
    ).first()

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    message = Message(
        conversation_id=conversation_id,
        role=data.role,
        content=data.content
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message

@router.get("/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id
    ).first()

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return convo.messages
