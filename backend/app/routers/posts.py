"""
Community Posts — UGC content routes.
CRUD + likes + comments (with 1-level replies) + cover upload.

All mutations require auth. Reads are public but enriched when user is present.
"""
import math
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_user, get_optional_user
from app.database import get_db
from app.models.post import Post, PostComment, PostCommentLike, PostLike
from app.models.user import User
from app.schemas.post import (
    LikeActionResponse,
    PostCommentCreate,
    PostCommentPublic,
    PostCreate,
    PostListItem,
    PostListResponse,
    PostPublic,
    PostUpdate,
)
from app.utils.ranking import compute_hot_score
from app.utils.uid import generate_post_uid

router = APIRouter(prefix="/posts", tags=["posts"])


# ── Helpers ────────────────────────────────────────────────────────────
def _excerpt(content: str, limit: int = 180) -> str:
    """Plain-text excerpt of content (strip markdown markers roughly)."""
    text = content.replace("\n", " ").strip()
    # Collapse whitespace
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


async def _unique_post_uid(db: AsyncSession) -> str:
    """Generate a post UID, retrying on extremely rare collision."""
    for _ in range(5):
        uid = generate_post_uid()
        existing = await db.execute(select(Post.id).where(Post.post_uid == uid))
        if existing.scalar_one_or_none() is None:
            return uid
    raise RuntimeError("Could not generate unique post UID after 5 attempts")


async def _recompute_hot_score(db: AsyncSession, post: Post) -> None:
    """Recompute and persist hot_score for a given post."""
    post.hot_score = compute_hot_score(
        likes=post.likes_count,
        comments=post.comments_count,
        views=post.views_count,
        created_at=post.created_at,
    )


async def _liked_post_ids(db: AsyncSession, user_id: int, post_ids: list[int]) -> set[int]:
    """Return set of post_ids that the given user has liked (from the list)."""
    if not post_ids:
        return set()
    result = await db.execute(
        select(PostLike.post_id).where(
            PostLike.user_id == user_id,
            PostLike.post_id.in_(post_ids),
        )
    )
    return {row for row in result.scalars().all()}


def _post_to_public(post: Post, liked_by_me: bool) -> PostPublic:
    """Safely build a PostPublic from a Post ORM instance (avoids __dict__ pitfalls)."""
    from app.schemas.post import AuthorMini  # local import to avoid circular
    return PostPublic(
        id=post.id,
        post_uid=post.post_uid,
        title=post.title,
        content=post.content,
        cover_image_url=post.cover_image_url,
        images=list(post.images or []),
        tags=list(post.tags or []),
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        views_count=post.views_count,
        hot_score=post.hot_score,
        status=post.status,
        author=AuthorMini.model_validate(post.author),
        created_at=post.created_at,
        updated_at=post.updated_at,
        liked_by_me=liked_by_me,
    )


# ── Image upload (authenticated users) ────────────────────────────────
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/upload-image")
async def upload_post_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),  # any logged-in user can upload
):
    """Upload a community image (used as post cover). Stored under /uploads/community/."""
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

    ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    upload_path = Path(settings.UPLOAD_DIR) / "community"
    upload_path.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(upload_path / filename, "wb") as f:
        await f.write(content)

    return {"url": f"/uploads/community/{filename}", "filename": filename}


# ── LIST ───────────────────────────────────────────────────────────────
@router.get("", response_model=PostListResponse)
async def list_posts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    tag: str | None = Query(default=None),
    author_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    sort: str = Query(default="latest", pattern="^(latest|hot|top)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """List published posts.

    sort:
      - latest: newest first (default)
      - hot:    trending (hot_score desc)
      - top:    most-liked of all time
    """
    conditions = [Post.status == "published"]
    if tag:
        # PostgreSQL ARRAY contains — matches posts whose tags list includes this exact tag.
        conditions.append(Post.tags.any(tag))
    if author_id is not None:
        conditions.append(Post.author_id == author_id)
    if search:
        term = f"%{search}%"
        conditions.append(Post.title.ilike(term) | Post.post_uid.ilike(term))

    # Count
    count_q = select(func.count(Post.id)).where(*conditions)
    total = (await db.execute(count_q)).scalar_one()

    # Data
    if sort == "hot":
        order = desc(Post.hot_score)
    elif sort == "top":
        order = desc(Post.likes_count)
    else:
        order = desc(Post.created_at)

    data_q = (
        select(Post)
        .where(*conditions)
        .options(selectinload(Post.author))
        .order_by(order, desc(Post.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    posts = (await db.execute(data_q)).scalars().all()

    # Enrich with liked_by_me
    liked_ids: set[int] = set()
    if current_user and posts:
        liked_ids = await _liked_post_ids(db, current_user.id, [p.id for p in posts])

    items = [
        PostListItem(
            id=p.id,
            post_uid=p.post_uid,
            title=p.title,
            content_excerpt=_excerpt(p.content),
            cover_image_url=p.cover_image_url,
            images=list(p.images or []),
            tags=list(p.tags or []),
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            views_count=p.views_count,
            author=p.author,
            created_at=p.created_at,
            liked_by_me=p.id in liked_ids,
        )
        for p in posts
    ]

    return PostListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


# ── CREATE ─────────────────────────────────────────────────────────────
@router.post("", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = await _unique_post_uid(db)
    post = Post(
        post_uid=uid,
        author_id=current_user.id,
        title=payload.title.strip(),
        content=payload.content,
        images=list(payload.images or []),
        cover_image_url=payload.images[0] if payload.images else (payload.cover_image_url or None),
        tags=list(payload.tags or []),
        status="published",
    )
    db.add(post)
    await db.flush()  # assigns id + created_at from DB default

    # Now that created_at is set, compute initial hot score
    await _recompute_hot_score(db, post)

    # Reload with author
    result = await db.execute(
        select(Post)
        .where(Post.id == post.id)
        .options(selectinload(Post.author))
    )
    fresh = result.scalar_one()
    return _post_to_public(fresh, liked_by_me=False)


# ── GET by UID ─────────────────────────────────────────────────────────
@router.get("/{uid}", response_model=PostPublic)
async def get_post(
    uid: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    result = await db.execute(
        select(Post)
        .where(Post.post_uid == uid, Post.status == "published")
        .options(selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Increment view count (fire-and-forget semantics — committed in session teardown)
    post.views_count += 1
    await _recompute_hot_score(db, post)

    liked_by_me = False
    if current_user:
        liked_by_me = bool(
            (
                await db.execute(
                    select(PostLike.id).where(
                        PostLike.user_id == current_user.id,
                        PostLike.post_id == post.id,
                    )
                )
            ).scalar_one_or_none()
        )

    return _post_to_public(post, liked_by_me=liked_by_me)


# ── UPDATE (author-only) ───────────────────────────────────────────────
@router.put("/{uid}", response_model=PostPublic)
async def update_post(
    uid: str,
    payload: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post).where(Post.post_uid == uid).options(selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post or post.status == "deleted":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(post, k, v)

    return _post_to_public(post, liked_by_me=False)


# ── DELETE (soft, author/admin) ────────────────────────────────────────
@router.delete("/{uid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    uid: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Post).where(Post.post_uid == uid))
    post = result.scalar_one_or_none()
    if not post or post.status == "deleted":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")

    post.status = "deleted"


# ── LIKE toggle ────────────────────────────────────────────────────────
@router.post("/{uid}/like", response_model=LikeActionResponse)
async def toggle_like(
    uid: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post).where(Post.post_uid == uid, Post.status == "published")
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing_q = await db.execute(
        select(PostLike).where(
            PostLike.user_id == current_user.id,
            PostLike.post_id == post.id,
        )
    )
    existing = existing_q.scalar_one_or_none()

    if existing:
        # Unlike
        await db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        db.add(PostLike(user_id=current_user.id, post_id=post.id))
        post.likes_count += 1
        liked = True

    await _recompute_hot_score(db, post)
    return LikeActionResponse(liked=liked, likes_count=post.likes_count)


# ── COMMENTS ───────────────────────────────────────────────────────────
@router.get("/{uid}/comments", response_model=list[PostCommentPublic])
async def list_comments(
    uid: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    # Resolve post
    post_q = await db.execute(select(Post.id).where(Post.post_uid == uid))
    post_id = post_q.scalar_one_or_none()
    if not post_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Fetch all comments for this post in a single query; we'll build the 2-level tree in Python.
    result = await db.execute(
        select(PostComment)
        .where(PostComment.post_id == post_id)
        .options(selectinload(PostComment.user))
        .order_by(PostComment.created_at.asc())
    )
    all_comments = list(result.scalars().all())

    # Resolve which comment IDs the current user has liked
    liked_comment_ids: set[int] = set()
    if current_user and all_comments:
        comment_ids = [c.id for c in all_comments]
        liked_q = await db.execute(
            select(PostCommentLike.comment_id).where(
                PostCommentLike.user_id == current_user.id,
                PostCommentLike.comment_id.in_(comment_ids),
            )
        )
        liked_comment_ids = set(liked_q.scalars().all())

    # Build lookup
    by_id: dict[int, PostCommentPublic] = {}
    top_level: list[PostCommentPublic] = []
    for c in all_comments:
        cp = PostCommentPublic.model_validate(
            {
                "id": c.id,
                "post_id": c.post_id,
                "parent_id": c.parent_id,
                "content": "[deleted]" if c.is_deleted else c.content,
                "is_deleted": c.is_deleted,
                "likes_count": c.likes_count,
                "liked_by_me": c.id in liked_comment_ids,
                "user": c.user,
                "created_at": c.created_at,
                "replies": [],
            }
        )
        by_id[c.id] = cp

    for c in all_comments:
        cp = by_id[c.id]
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id].replies.append(cp)
        else:
            top_level.append(cp)

    return top_level


@router.post(
    "/{uid}/comments",
    response_model=PostCommentPublic,
    status_code=status.HTTP_201_CREATED,
)
async def post_comment(
    uid: str,
    payload: PostCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post_q = await db.execute(
        select(Post).where(Post.post_uid == uid, Post.status == "published")
    )
    post = post_q.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Validate parent if present — must belong to same post, and only 1 level deep.
    if payload.parent_id:
        parent_q = await db.execute(
            select(PostComment).where(PostComment.id == payload.parent_id)
        )
        parent = parent_q.scalar_one_or_none()
        if not parent or parent.post_id != post.id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Only 1 level of replies allowed — reply to the top-level comment instead",
            )

    comment = PostComment(
        post_id=post.id,
        user_id=current_user.id,
        parent_id=payload.parent_id,
        content=payload.content,
    )
    db.add(comment)
    post.comments_count += 1
    await _recompute_hot_score(db, post)

    await db.flush()
    # Reload with user for response
    result = await db.execute(
        select(PostComment)
        .where(PostComment.id == comment.id)
        .options(selectinload(PostComment.user))
    )
    fresh = result.scalar_one()
    return PostCommentPublic.model_validate(
        {
            "id": fresh.id,
            "post_id": fresh.post_id,
            "parent_id": fresh.parent_id,
            "content": fresh.content,
            "is_deleted": fresh.is_deleted,
            "user": fresh.user,
            "created_at": fresh.created_at,
            "replies": [],
        }
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PostComment).where(PostComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your comment")

    # Soft-delete to preserve thread structure
    comment.is_deleted = True
    comment.content = ""

    # Decrement comment count on parent post
    post_q = await db.execute(select(Post).where(Post.id == comment.post_id))
    post = post_q.scalar_one_or_none()
    if post and post.comments_count > 0:
        post.comments_count -= 1
        await _recompute_hot_score(db, post)


@router.post("/comments/{comment_id}/like", response_model=LikeActionResponse)
async def toggle_comment_like(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment_q = await db.execute(
        select(PostComment).where(PostComment.id == comment_id, PostComment.is_deleted == False)  # noqa: E712
    )
    comment = comment_q.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing_q = await db.execute(
        select(PostCommentLike).where(
            PostCommentLike.user_id == current_user.id,
            PostCommentLike.comment_id == comment.id,
        )
    )
    existing = existing_q.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        comment.likes_count = max(0, comment.likes_count - 1)
        liked = False
    else:
        db.add(PostCommentLike(user_id=current_user.id, comment_id=comment.id))
        comment.likes_count += 1
        liked = True

    return LikeActionResponse(liked=liked, likes_count=comment.likes_count)
