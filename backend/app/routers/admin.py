import math
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_admin
from app.database import get_db
from app.models.article import Article
from app.models.category import Category
from app.models.post import Post
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleListResponse, ArticlePublic, ArticleUpdate
from app.utils.uid import generate_article_uid

router = APIRouter(prefix="/admin", tags=["admin"])

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_admin),
):
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WebP, and GIF images are allowed",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    ext = Path(file.filename or "image.jpg").suffix.lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    upload_path = Path(settings.UPLOAD_DIR) / "images"
    upload_path.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(upload_path / filename, "wb") as f:
        await f.write(content)

    return {"url": f"/uploads/images/{filename}", "filename": filename}


@router.get("/articles", response_model=ArticleListResponse)
async def admin_list_articles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    conditions = []
    if status_filter:
        conditions.append(Article.status == status_filter)

    count_q = select(func.count(Article.id)).where(*conditions)
    total: int = (await db.execute(count_q)).scalar_one()

    data_q = (
        select(Article)
        .where(*conditions)
        .options(selectinload(Article.category), selectinload(Article.author))
        .order_by(Article.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(data_q)

    return ArticleListResponse(
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
    )


@router.post("/articles", response_model=ArticlePublic, status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    # Validate category exists to give a clear error (FK violation → generic 500 otherwise)
    cat = (
        await db.execute(select(Category).where(Category.id == payload.category_id))
    ).scalar_one_or_none()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category id {payload.category_id} not found",
        )

    uid = generate_article_uid()
    while (await db.execute(select(Article).where(Article.article_uid == uid))).scalar_one_or_none():
        uid = generate_article_uid()

    published_at = datetime.now(timezone.utc) if payload.status == "published" else None

    article = Article(
        **payload.model_dump(),
        article_uid=uid,
        author_id=current_admin.id,
        published_at=published_at,
    )
    db.add(article)
    await db.flush()

    # Reload with eager-loaded relationships — required for response serialization
    # (category/author are lazy="noload" on the model, so we must explicitly load them)
    result = await db.execute(
        select(Article)
        .where(Article.id == article.id)
        .options(selectinload(Article.category), selectinload(Article.author))
    )
    return result.scalar_one()


@router.get("/articles/{article_id}", response_model=ArticlePublic)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Article)
        .where(Article.id == article_id)
        .options(selectinload(Article.category), selectinload(Article.author))
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return article


@router.put("/articles/{article_id}", response_model=ArticlePublic)
async def update_article(
    article_id: int,
    payload: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Article)
        .where(Article.id == article_id)
        .options(selectinload(Article.category), selectinload(Article.author))
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    update_data = payload.model_dump(exclude_none=True)

    # Validate category if being changed
    if "category_id" in update_data:
        cat = (
            await db.execute(select(Category).where(Category.id == update_data["category_id"]))
        ).scalar_one_or_none()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category id {update_data['category_id']} not found",
            )

    if "status" in update_data and update_data["status"] == "published" and not article.published_at:
        article.published_at = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(article, field, value)

    # Re-query after update to ensure category relationship is fresh (in case category changed)
    await db.flush()
    result = await db.execute(
        select(Article)
        .where(Article.id == article.id)
        .options(selectinload(Article.category), selectinload(Article.author))
    )
    return result.scalar_one()


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    await db.delete(article)


# ═══════════════════════════════════════════════════════════════════════════
#  Dashboard stats
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict[str, Any]:
    """Return platform statistics for the admin dashboard."""
    real_users: int = (
        await db.execute(
            select(func.count(User.id)).where(
                User.is_ai == False,  # noqa: E712
                User.role != "admin",
            )
        )
    ).scalar_one()

    ai_bots: int = (
        await db.execute(
            select(func.count(User.id)).where(User.is_ai == True)  # noqa: E712
        )
    ).scalar_one()

    total_posts: int = (
        await db.execute(
            select(func.count(Post.id)).where(Post.status == "published")
        )
    ).scalar_one()

    ai_posts: int = (
        await db.execute(
            select(func.count(Post.id))
            .join(User, Post.author_id == User.id)
            .where(Post.status == "published", User.is_ai == True)  # noqa: E712
        )
    ).scalar_one()

    return {
        "real_users": real_users,
        "ai_bots": ai_bots,
        "total_posts": total_posts,
        "ai_posts": ai_posts,
        "human_posts": total_posts - ai_posts,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  Community post moderation
# ═══════════════════════════════════════════════════════════════════════════

class AdminPostItem(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    post_uid: str
    title: str
    author_username: str
    is_ai_author: bool
    likes_count: int
    comments_count: int
    created_at: datetime
    status: str


@router.get("/posts")
async def admin_list_posts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict[str, Any]:
    """List all posts (including soft-deleted) for moderation."""
    total: int = (await db.execute(select(func.count(Post.id)))).scalar_one()

    rows = (
        await db.execute(
            select(Post, User.username, User.is_ai)
            .join(User, Post.author_id == User.id)
            .order_by(Post.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items = [
        {
            "id": post.id,
            "post_uid": post.post_uid,
            "title": post.title,
            "author_username": username,
            "is_ai_author": is_ai,
            "likes_count": post.likes_count,
            "comments_count": post.comments_count,
            "created_at": post.created_at,
            "status": post.status,
        }
        for post, username, is_ai in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size),
    }


@router.delete("/posts/{uid}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_post(
    uid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Hard-remove a post that violates platform rules."""
    result = await db.execute(select(Post).where(Post.post_uid == uid))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.delete(post)


# ═══════════════════════════════════════════════════════════════════════════
#  AI content generation
# ═══════════════════════════════════════════════════════════════════════════

class AIGenerateRequest(BaseModel):
    count: int = 5          # how many posts to generate
    topic: str | None = None  # optional: ai_tech / dev_guide / entertainment / life_fun


import logging as _logging
_admin_log = _logging.getLogger("admin")


@router.get("/debug-generate")
async def debug_generate(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict[str, Any]:
    """Step-by-step diagnostic: check bots exist, LLM works, and DB insert succeeds."""
    from app.models.user import User as UserModel
    from app.services.llm import LLMError, complete_chat
    from app.utils.uid import generate_post_uid
    from app.models.post import Post as PostModel
    steps: list[dict] = []

    # Step 1: check AI bots exist
    bot_names = ["极客晓明", "码农阿杰", "文青小雨", "暖暖日记", "科技前沿君"]
    found_bots = []
    for name in bot_names:
        b = (await db.execute(
            select(UserModel).where(UserModel.username == name, UserModel.is_ai == True)  # noqa: E712
        )).scalar_one_or_none()
        found_bots.append({"username": name, "found": b is not None, "id": b.id if b else None})
    steps.append({"step": "check_bots", "bots": found_bots,
                  "ok": any(x["found"] for x in found_bots)})

    # Step 2: minimal LLM call
    try:
        reply = await complete_chat(
            [{"role": "user", "content": "回复「OK」两字。"}],
            temperature=0.0, max_tokens=10,
        )
        steps.append({"step": "llm_call", "ok": True, "reply": reply})
    except Exception as e:
        steps.append({"step": "llm_call", "ok": False, "error": f"{type(e).__name__}: {e}"})
        return {"steps": steps, "conclusion": "LLM call failed — check API key / network"}

    # Step 3: try a DB insert
    test_bot = next((b for b in found_bots if b["found"]), None)
    if not test_bot:
        return {"steps": steps, "conclusion": "No AI bots in DB — restart backend to re-seed"}
    try:
        uid = generate_post_uid()
        post = PostModel(
            post_uid=uid,
            author_id=test_bot["id"],
            title="[DEBUG TEST — DELETE ME]",
            content="debug",
            tags=["debug"],
            status="published",
        )
        db.add(post)
        await db.flush()
        await db.rollback()   # Don't actually save it
        steps.append({"step": "db_insert", "ok": True})
    except Exception as e:
        steps.append({"step": "db_insert", "ok": False, "error": f"{type(e).__name__}: {e}"})
        return {"steps": steps, "conclusion": f"DB insert failed: {e}"}

    # Step 4: try the FULL generate_ai_post pipeline end-to-end
    try:
        from app.services.ai_content import generate_ai_post
        post = await generate_ai_post(db, topic="life_fun")
        if post:
            steps.append({"step": "full_generate", "ok": True,
                          "title": post.title, "uid": post.post_uid})
        else:
            steps.append({"step": "full_generate", "ok": False,
                          "error": "generate_ai_post returned None — check backend logs"})
    except Exception as e:
        steps.append({"step": "full_generate", "ok": False,
                      "error": f"{type(e).__name__}: {e}"})

    all_ok = all(s.get("ok") for s in steps)
    return {
        "steps": steps,
        "conclusion": "All checks passed — generation should work" if all_ok
                      else "One or more steps failed — see above",
    }


@router.get("/test-llm")
async def test_llm_connection(
    _: User = Depends(get_current_admin),
) -> dict[str, Any]:
    """Test both LLM providers: DeepSeek (Juno chat) and Claude (post generation)."""
    from app.services.llm import LLMError, complete_chat, stream_chat_completion
    from app.core.config import settings
    result: dict[str, Any] = {}

    # ── Test DeepSeek complete_chat (post generation & article processing) ────
    if not settings.LLM_API_KEY:
        result["generation"] = {"ok": False, "error": "LLM_API_KEY (DeepSeek) 未配置"}
    else:
        try:
            reply = await complete_chat(
                [{"role": "user", "content": "Reply with just the word OK."}],
                temperature=0.0,
                max_tokens=10,
            )
            result["generation"] = {"ok": True, "reply": reply, "model": settings.LLM_MODEL}
        except LLMError as e:
            result["generation"] = {"ok": False, "error": str(e), "model": settings.LLM_MODEL}
        except Exception as e:
            result["generation"] = {"ok": False, "error": f"{type(e).__name__}: {e}"}

    # Flatten to top level so frontend can read ok/model/reply/error directly
    gen = result.get("generation", {})
    result["ok"]    = gen.get("ok", False)
    result["model"] = gen.get("model", settings.LLM_MODEL)
    result["reply"] = gen.get("reply")
    result["error"] = gen.get("error")
    return result


class ProcessUrlRequest(BaseModel):
    url: str


@router.get("/process-url-ping")
async def process_url_ping(_: User = Depends(get_current_admin)):
    """Lightweight diagnostic: verifies module import + config, no HTTP fetch."""
    import traceback
    try:
        from app.services.article_processor import process_url  # noqa: F401
        from app.core.config import settings
        return {
            "ok": True,
            "claude_key_set": bool(settings.CLAUDE_API_KEY),
            "claude_model": settings.CLAUDE_MODEL,
        }
    except BaseException as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "tb": traceback.format_exc()}


@router.post("/process-url")
async def process_article_url(
    payload: ProcessUrlRequest,
    _: User = Depends(get_current_admin),
):
    """Scrape a news URL and return AI-rewritten bilingual article content."""
    import traceback
    print(f"[process-url] START url={payload.url!r}", flush=True)
    try:
        from app.services.article_processor import process_url
        result = await process_url(payload.url)
        print(f"[process-url] OK title_zh={result.get('title_zh', '')!r}", flush=True)
        return result
    except RuntimeError as e:
        print(f"[process-url] RuntimeError: {e}", flush=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except HTTPException:
        raise
    except BaseException as e:
        tb = traceback.format_exc()
        print(f"[process-url] CRASH {type(e).__name__}: {e}\n{tb}", flush=True)
        _admin_log.error("process-url crash: %s\n%s", e, tb)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"处理失败: {type(e).__name__}: {e}",
        )


@router.post("/ai-posts/generate")
async def generate_ai_posts(
    payload: AIGenerateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict[str, Any]:
    """Trigger AI bot post generation (max 20 per call)."""
    try:
        from app.services.ai_content import bulk_generate_ai_posts, generate_ai_post
    except Exception as e:
        _admin_log.exception("Failed to import ai_content module")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"模块导入失败: {type(e).__name__}: {e}",
        )

    count = min(payload.count, 100)
    error_msg: str | None = None

    try:
        if payload.topic:
            created = []
            for _ in range(count):
                post = await generate_ai_post(db, topic=payload.topic)
                if post:
                    created.append(post)
            # Each post already committed inside generate_ai_post
        else:
            created = await bulk_generate_ai_posts(db, count=count)
    except Exception as e:
        # generate_ai_post catches all its own exceptions and returns None,
        # so reaching here means a truly unexpected error (e.g. import failure).
        # Do NOT call db.rollback() here — it can itself raise and swallow the
        # detail we want to return.
        _admin_log.exception("Unexpected error in ai-posts/generate")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成过程中发生错误: {type(e).__name__}: {e}",
        )

    return {
        "generated": len(created),
        "post_uids": [p.post_uid for p in created],
        "error": None,
    }
