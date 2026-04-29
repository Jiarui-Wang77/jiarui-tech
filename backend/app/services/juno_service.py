"""
Juno business logic: quota gating, message persistence, context building.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.juno import Conversation, Message
from app.models.user import User
from app.services.llm import LLMError, generate_title, stream_chat_completion  # generate_title is now sync (no LLM call)
from app.utils.juno_personas import get_persona


class QuotaExceededError(Exception):
    """Raised when user hits their daily Juno limit."""


# ── Quota ─────────────────────────────────────────────────────────────
def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


async def check_and_reset_quota(db: AsyncSession, user: User) -> None:
    """If user's quota_date isn't today, reset to 0."""
    today = _today_utc()
    if user.juno_quota_date != today:
        user.juno_quota_date = today
        user.juno_quota_used = 0
        await db.flush()


async def assert_quota_available(db: AsyncSession, user: User) -> None:
    await check_and_reset_quota(db, user)
    limit = settings.LLM_FREE_DAILY_LIMIT
    # Admin exempt from quota
    if user.role == "admin":
        return
    if user.juno_quota_used >= limit:
        raise QuotaExceededError(
            f"今日免费额度已用完（{limit} 次）— 明天 UTC 0:00 重置"
        )


async def increment_quota(db: AsyncSession, user: User) -> None:
    if user.role == "admin":
        return
    user.juno_quota_used = (user.juno_quota_used or 0) + 1
    await db.flush()


async def get_user_quota(db: AsyncSession, user: User) -> dict:
    await check_and_reset_quota(db, user)
    limit = settings.LLM_FREE_DAILY_LIMIT
    used = user.juno_quota_used or 0
    return {
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
        "unlimited": user.role == "admin",
    }


# ── Context builder ──────────────────────────────────────────────────
async def build_llm_messages(
    db: AsyncSession, conversation: Conversation, user_content: str
) -> list[dict[str, str]]:
    """Compose the message list to send to the LLM.

    1. system prompt (from persona)
    2. history (last N turns)
    3. current user message
    """
    persona = get_persona(conversation.persona)
    messages: list[dict[str, str]] = [
        {"role": "system", "content": persona["system_prompt"]}
    ]

    # Fetch last N message pairs
    n = settings.LLM_MAX_HISTORY_TURNS * 2  # 2 messages per turn (user + assistant)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(n)
    )
    history = list(result.scalars().all())
    history.reverse()  # chronological

    for m in history:
        if m.role in ("user", "assistant") and m.content.strip():
            messages.append({"role": m.role, "content": m.content})

    messages.append({"role": "user", "content": user_content})
    return messages


# ── Main chat orchestration ──────────────────────────────────────────
async def stream_chat(
    db: AsyncSession,
    user: User,
    conversation: Conversation,
    user_content: str,
) -> AsyncGenerator[tuple[str, str], None]:
    """Orchestrates: quota check → persist user msg → stream LLM → persist assistant msg.

    Yields tuples of (event_type, data) where event_type ∈ {"delta", "done", "error"}.
    The consumer (router) formats these as SSE events.
    """
    try:
        await assert_quota_available(db, user)
    except QuotaExceededError as e:
        yield ("error", str(e))
        return

    # Persist the user message immediately
    user_msg = Message(conversation_id=conversation.id, role="user", content=user_content)
    db.add(user_msg)
    await db.flush()

    # Stream from LLM
    full_response: list[str] = []
    try:
        messages = await build_llm_messages(db, conversation, user_content)
        async for chunk in stream_chat_completion(messages):
            full_response.append(chunk)
            yield ("delta", chunk)
    except LLMError as e:
        err_msg = f"抱歉，AI 服务暂时不可用：{e}"
        yield ("error", err_msg)
        # User message already flushed — do not rollback it
        return

    # Handle empty response (content filter, refusal, model error)
    assistant_content = "".join(full_response)
    if not assistant_content.strip():
        yield ("error", "Juno 没有返回内容，可能是该问题触发了内容过滤，请换个方式提问。")
        return

    # Persist assistant message
    db.add(Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_content,
    ))

    # Consume quota
    await increment_quota(db, user)

    # Auto-title: fast string truncation — NO second LLM call, fires instantly
    if conversation.title in ("新对话", "New chat", "") and user_content.strip():
        conversation.title = generate_title(user_content)  # sync, instant

    conversation.updated_at = datetime.now(timezone.utc)
    await db.flush()

    yield ("done", "")


async def create_conversation(
    db: AsyncSession, user: User, persona: str, title: str | None = None
) -> Conversation:
    p = get_persona(persona)
    conv = Conversation(
        user_id=user.id,
        persona=p["slug"],
        title=title or "新对话",
    )
    db.add(conv)
    await db.flush()
    return conv


async def get_user_conversation(
    db: AsyncSession, user: User, conversation_id: int, *, load_messages: bool = False
) -> Conversation | None:
    q = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user.id,
    )
    if load_messages:
        q = q.options(selectinload(Conversation.messages))
    result = await db.execute(q)
    return result.scalar_one_or_none()
