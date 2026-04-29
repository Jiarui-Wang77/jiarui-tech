from datetime import datetime

from pydantic import BaseModel, Field, field_validator


# ── Author / user ministub — reused across community responses ──────────
class AuthorMini(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    avatar_url: str | None = None
    bio: str | None = None


# ── Tag normalization helper ───────────────────────────────────────────
_MAX_TAGS = 5
_MAX_TAG_LEN = 20


def _normalize_tags(raw: list[str] | None) -> list[str]:
    """Trim, dedupe (case-insensitive), cap count and length."""
    if not raw:
        return []
    seen_lower: set[str] = set()
    out: list[str] = []
    for t in raw:
        if not isinstance(t, str):
            continue
        t = t.strip().lstrip("#").strip()
        if not t:
            continue
        if len(t) > _MAX_TAG_LEN:
            t = t[:_MAX_TAG_LEN]
        key = t.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        out.append(t)
        if len(out) >= _MAX_TAGS:
            break
    return out


# ── Post ────────────────────────────────────────────────────────────────
class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1)
    cover_image_url: str | None = Field(default=None, max_length=500)
    images: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def _clean_tags(cls, v):
        return _normalize_tags(v)


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    content: str | None = Field(default=None, min_length=1)
    cover_image_url: str | None = Field(default=None, max_length=500)
    tags: list[str] | None = None

    @field_validator("tags", mode="before")
    @classmethod
    def _clean_tags(cls, v):
        if v is None:
            return None
        return _normalize_tags(v)


class PostPublic(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    post_uid: str
    title: str
    content: str
    cover_image_url: str | None
    images: list[str] = []
    tags: list[str] = []
    likes_count: int
    comments_count: int
    views_count: int
    hot_score: float
    status: str
    author: AuthorMini
    created_at: datetime
    updated_at: datetime
    # Runtime-enriched — not on ORM
    liked_by_me: bool = False


class PostListItem(BaseModel):
    """Lightweight list item — omits full content for bandwidth."""
    model_config = {"from_attributes": True}
    id: int
    post_uid: str
    title: str
    content_excerpt: str
    cover_image_url: str | None
    images: list[str] = []
    tags: list[str] = []
    likes_count: int
    comments_count: int
    views_count: int
    author: AuthorMini
    created_at: datetime
    liked_by_me: bool = False


class PostListResponse(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Comments ────────────────────────────────────────────────────────────
class PostCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_id: int | None = None


class PostCommentPublic(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    post_id: int
    parent_id: int | None
    content: str
    is_deleted: bool
    likes_count: int = 0
    liked_by_me: bool = False
    user: AuthorMini
    created_at: datetime
    # Flat replies (1 level) — populated in route
    replies: list["PostCommentPublic"] = []


PostCommentPublic.model_rebuild()


# ── Like action response ────────────────────────────────────────────────
class LikeActionResponse(BaseModel):
    liked: bool
    likes_count: int
