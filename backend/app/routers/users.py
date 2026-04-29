"""
User profile and follow-graph routes.
"""
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_optional_user
from app.database import get_db
from app.models.follow import UserFollow
from app.models.post import Post
from app.models.user import User
from app.schemas.community import (
    FollowActionResponse,
    FollowListItem,
    UserProfile,
    UserProfileUpdate,
)
from app.schemas.post import AuthorMini

router = APIRouter(prefix="/users", tags=["users"])


# ── Helpers ────────────────────────────────────────────────────────────
async def _user_counters(db: AsyncSession, user_id: int) -> tuple[int, int, int]:
    """Return (posts_count, followers_count, following_count)."""
    posts = (
        await db.execute(
            select(func.count(Post.id)).where(
                Post.author_id == user_id, Post.status == "published"
            )
        )
    ).scalar_one()
    followers = (
        await db.execute(
            select(func.count(UserFollow.id)).where(UserFollow.following_id == user_id)
        )
    ).scalar_one()
    following = (
        await db.execute(
            select(func.count(UserFollow.id)).where(UserFollow.follower_id == user_id)
        )
    ).scalar_one()
    return int(posts), int(followers), int(following)


async def _is_followed_by(
    db: AsyncSession, viewer_id: int | None, target_id: int
) -> bool:
    if viewer_id is None or viewer_id == target_id:
        return False
    result = await db.execute(
        select(UserFollow.id).where(
            UserFollow.follower_id == viewer_id,
            UserFollow.following_id == target_id,
        )
    )
    return result.scalar_one_or_none() is not None


# ── Profile by username ────────────────────────────────────────────────
@router.get("/{username}", response_model=UserProfile)
async def get_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    posts_count, followers_count, following_count = await _user_counters(db, user.id)
    followed_by_me = await _is_followed_by(
        db, current_user.id if current_user else None, user.id
    )

    return UserProfile(
        id=user.id,
        username=user.username,
        avatar_url=user.avatar_url,
        bio=user.bio,
        age=user.age,
        region=user.region,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        followed_by_me=followed_by_me,
    )


# ── Self-profile update ────────────────────────────────────────────────
@router.patch("/me/profile", response_model=UserProfile)
async def update_my_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(current_user, k, v)

    posts_count, followers_count, following_count = await _user_counters(db, current_user.id)
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        age=current_user.age,
        region=current_user.region,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        followed_by_me=False,
    )


# ── Avatar upload (self) ──────────────────────────────────────────────
_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/me/avatar")
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload an avatar image for the current user. Returns {url, filename}."""
    if file.content_type not in _AVATAR_TYPES:
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

    ext = Path(file.filename or "avatar.jpg").suffix.lower() or ".jpg"
    filename = f"u{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    upload_path = Path(settings.UPLOAD_DIR) / "avatars"
    upload_path.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(upload_path / filename, "wb") as f:
        await f.write(content)

    return {"url": f"/uploads/avatars/{filename}", "filename": filename}


# ── Follow / Unfollow ──────────────────────────────────────────────────
@router.post("/{username}/follow", response_model=FollowActionResponse)
async def toggle_follow(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_q = await db.execute(select(User).where(User.username == username))
    target = target_q.scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    existing_q = await db.execute(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.id,
            UserFollow.following_id == target.id,
        )
    )
    existing = existing_q.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        followed = False
    else:
        db.add(UserFollow(follower_id=current_user.id, following_id=target.id))
        followed = True

    # Flush so the subsequent COUNT reflects the toggle (autoflush is on, but be explicit)
    await db.flush()

    count = (
        await db.execute(
            select(func.count(UserFollow.id)).where(UserFollow.following_id == target.id)
        )
    ).scalar_one()

    return FollowActionResponse(followed=followed, followers_count=int(count))


# ── Followers / Following lists ────────────────────────────────────────
@router.get("/{username}/followers", response_model=list[FollowListItem])
async def list_followers(
    username: str,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    target_q = await db.execute(select(User.id).where(User.username == username))
    target_id = target_q.scalar_one_or_none()
    if target_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result = await db.execute(
        select(User)
        .join(UserFollow, UserFollow.follower_id == User.id)
        .where(UserFollow.following_id == target_id)
        .order_by(UserFollow.created_at.desc())
        .limit(limit)
    )
    users = result.scalars().all()

    items: list[FollowListItem] = []
    for u in users:
        followed_by_me = await _is_followed_by(
            db, current_user.id if current_user else None, u.id
        )
        items.append(
            FollowListItem(
                user=AuthorMini.model_validate(u),
                followed_by_me=followed_by_me,
            )
        )
    return items


@router.get("/{username}/following", response_model=list[FollowListItem])
async def list_following(
    username: str,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    target_q = await db.execute(select(User.id).where(User.username == username))
    target_id = target_q.scalar_one_or_none()
    if target_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result = await db.execute(
        select(User)
        .join(UserFollow, UserFollow.following_id == User.id)
        .where(UserFollow.follower_id == target_id)
        .order_by(UserFollow.created_at.desc())
        .limit(limit)
    )
    users = result.scalars().all()

    items: list[FollowListItem] = []
    for u in users:
        followed_by_me = await _is_followed_by(
            db, current_user.id if current_user else None, u.id
        )
        items.append(
            FollowListItem(
                user=AuthorMini.model_validate(u),
                followed_by_me=followed_by_me,
            )
        )
    return items
