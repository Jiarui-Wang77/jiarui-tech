from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.category import CategoryPublic
from app.schemas.user import UserPublic


class ArticleCreate(BaseModel):
    title_zh: str = Field(min_length=1, max_length=300)
    title_en: str = Field(min_length=1, max_length=300)
    content_zh: str = Field(min_length=1)
    content_en: str = Field(min_length=1)
    deep_analysis_zh: str | None = None
    deep_analysis_en: str | None = None
    cover_image_url: str | None = None
    category_id: int
    status: str = "draft"


class ArticleUpdate(BaseModel):
    title_zh: str | None = Field(default=None, max_length=300)
    title_en: str | None = Field(default=None, max_length=300)
    content_zh: str | None = None
    content_en: str | None = None
    deep_analysis_zh: str | None = None
    deep_analysis_en: str | None = None
    cover_image_url: str | None = None
    category_id: int | None = None
    status: str | None = None


class ArticlePublic(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    article_uid: str
    title_zh: str
    title_en: str
    content_zh: str
    content_en: str
    deep_analysis_zh: str | None
    deep_analysis_en: str | None
    cover_image_url: str | None
    status: str
    view_count: int
    category: CategoryPublic | None = None
    author: UserPublic | None = None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ArticleListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    article_uid: str
    title_zh: str
    title_en: str
    cover_image_url: str | None
    status: str
    view_count: int
    category: CategoryPublic | None = None
    author: UserPublic | None = None
    published_at: datetime | None
    created_at: datetime


class ArticleListResponse(BaseModel):
    items: list[ArticleListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    parent_id: int | None = None


class CommentPublic(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    content: str
    user: UserPublic
    created_at: datetime
    parent_id: int | None = None
    likes_count: int = 0
    is_deleted: bool = False
    liked_by_me: bool = False
    replies: list["CommentPublic"] = []


CommentPublic.model_rebuild()
