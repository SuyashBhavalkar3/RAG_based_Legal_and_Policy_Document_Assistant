from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# -------------------------
# Conversation Schemas
# -------------------------
class ConversationCreate(BaseModel):
    title: Optional[str] = None

class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        orm_mode = True  # ✅ fix here

# -------------------------
# Message Schemas
# -------------------------
class MessageCreate(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True  # ✅ fix here

# -------------------------
# Conversation + Messages
# -------------------------
class ConversationWithMessages(ConversationOut):
    messages: List[MessageOut]