"""
Juno-Alpha AI assistant routes.

SSE-streaming chat + conversation CRUD + quota + personas.
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.database import AsyncSessionLocal, get_db
from app.models.juno import Conversation, Message
from app.models.user import User
from app.schemas.juno import (
    ChatRequest,
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationUpdate,
    MessagePublic,
    PersonaInfo,
    QuotaInfo,
)
from app.services.juno_service import (
    create_conversation,
    get_user_conversation,
    get_user_quota,
    stream_chat,
)
from app.utils.juno_personas import persona_list_public

router = APIRouter(prefix="/juno", tags=["juno"])


# ── Personas (public info) ────────────────────────────────────────────
@router.get("/personas", response_model=list[PersonaInfo])
async def list_personas():
    return [PersonaInfo.model_validate(p) for p in persona_list_public()]


# ── Quota ─────────────────────────────────────────────────────────────
@router.get("/quota", response_model=QuotaInfo)
async def quota(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return QuotaInfo(**await get_user_quota(db, current_user))


# ── Conversations ─────────────────────────────────────────────────────
@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
        .limit(100)
    )
    return [ConversationSummary.model_validate(c) for c in result.scalars().all()]


@router.post("/conversations", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED)
async def create_new_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await create_conversation(db, current_user, payload.persona, payload.title)
    return ConversationSummary.model_validate(conv)


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
async def get_conversation(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await get_user_conversation(db, current_user, conv_id, load_messages=True)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        persona=conv.persona,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessagePublic.model_validate(m) for m in (conv.messages or [])],
    )


@router.patch("/conversations/{conv_id}", response_model=ConversationSummary)
async def rename_conversation(
    conv_id: int,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await get_user_conversation(db, current_user, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(conv, k, v)
    return ConversationSummary.model_validate(conv)


@router.delete("/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await get_user_conversation(db, current_user, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)


# ── SSE streaming chat ────────────────────────────────────────────────
@router.post("/chat")
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Streams LLM response as Server-Sent Events.

    Event format:
      event: meta  (initial conversation id, title, persona)
      event: delta (each content chunk)
      event: done
      event: error

    Note: we DON'T use the request-scoped AsyncSession (`get_db`) here because
    FastAPI's streaming response runs after the dependency scope exits — the
    session would be closed before our generator finishes. Instead we create
    a fresh session inside the generator.
    """
    async def event_generator():
        async with AsyncSessionLocal() as db:
            try:
                # Re-fetch the user in this session (current_user is from another session)
                user_result = await db.execute(
                    select(User).where(User.id == current_user.id)
                )
                user = user_result.scalar_one_or_none()
                if not user:
                    yield _sse("error", {"message": "User not found"})
                    return

                # Immediate "ready" ping so client knows server is responding
                yield _sse("ready", {"ts": datetime.now(timezone.utc).isoformat()})

                # Get or create conversation
                if payload.conversation_id:
                    conv = await get_user_conversation(db, user, payload.conversation_id)
                    if not conv:
                        yield _sse("error", {"message": "Conversation not found"})
                        return
                else:
                    conv = await create_conversation(db, user, payload.persona)
                    # Notify client of the new conversation id
                    yield _sse(
                        "meta",
                        {
                            "conversation_id": conv.id,
                            "title": conv.title,
                            "persona": conv.persona,
                        },
                    )

                # Stream from LLM
                async for event_type, data in stream_chat(db, user, conv, payload.content):
                    if event_type == "delta":
                        yield _sse("delta", {"content": data})
                    elif event_type == "error":
                        yield _sse("error", {"message": data})
                    elif event_type == "done":
                        # Refetch updated title after auto-generation
                        await db.refresh(conv)
                        yield _sse(
                            "done",
                            {
                                "conversation_id": conv.id,
                                "title": conv.title,
                            },
                        )
                await db.commit()
            except Exception as e:  # noqa: BLE001
                await db.rollback()
                yield _sse("error", {"message": f"服务器错误:{str(e)[:200]}"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


def _sse(event: str, data: dict) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
