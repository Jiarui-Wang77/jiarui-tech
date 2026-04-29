from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    article_uid: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title_zh: Mapped[str] = mapped_column(String(300), nullable=False)
    title_en: Mapped[str] = mapped_column(String(300), nullable=False)
    content_zh: Mapped[str] = mapped_column(Text, nullable=False)
    content_en: Mapped[str] = mapped_column(Text, nullable=False)
    deep_analysis_zh: Mapped[str | None] = mapped_column(Text)
    deep_analysis_en: Mapped[str | None] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    category: Mapped["Category"] = relationship(back_populates="articles", lazy="noload")  # noqa: F821
    author: Mapped["User"] = relationship(back_populates="articles", lazy="noload")  # noqa: F821
    comments: Mapped[list["ArticleComment"]] = relationship(back_populates="article", lazy="noload")


class ArticleComment(Base):
    __tablename__ = "article_comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("article_comments.id", ondelete="CASCADE"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    article: Mapped["Article"] = relationship(back_populates="comments", lazy="noload")
    user: Mapped["User"] = relationship(lazy="joined")


class ArticleCommentLike(Base):
    __tablename__ = "article_comment_likes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    comment_id: Mapped[int] = mapped_column(
        ForeignKey("article_comments.id", ondelete="CASCADE"), primary_key=True
    )
