from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PersonaSlug = Literal["general", "code", "scholar", "office", "life"]


# ── Conversations ──────────────────────────────────────────────────────
class ConversationCreate(BaseModel):
    persona: PersonaSlug = "general"
    title: str | None = Field(default=None, max_length=200)


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    persona: PersonaSlug | None = None


class ConversationSummary(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str
    persona: str
    created_at: datetime
    updated_at: datetime


class MessagePublic(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    role: str
    content: str
    created_at: datetime


class ConversationDetail(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str
    persona: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessagePublic] = []


# ── Chat request ──────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    conversation_id: int | None = None  # if null → server creates new
    persona: PersonaSlug = "general"    # only used when creating new
    content: str = Field(min_length=1, max_length=16000)


# ── Quota ─────────────────────────────────────────────────────────────
class QuotaInfo(BaseModel):
    used: int
    limit: int
    remaining: int
    unlimited: bool


# ── Personas (public, no system prompt) ───────────────────────────────
class PersonaInfo(BaseModel):
    slug: str
    name_zh: str
    name_en: str
    icon: str
    color: str
    greeting_zh: str
    greeting_en: str
