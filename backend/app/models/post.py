"""
Community post models — UGC content by users.

Distinct from Article (which is official CMS-published news).
A Post has: title, content, optional cover image, tag, likes, comments, views.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Post(Base):
    """User-generated community post."""
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    post_uid: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # supports markdown
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    images: Mapped[list[str]] = mapped_column(
        ARRAY(String(500)),
        default=list,
        server_default="{}",
        nullable=False,
    )
    # Array of tags (0..N) — PostgreSQL native ARRAY for efficient `ANY` queries.
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        default=list,
        server_default="{}",
        nullable=False,
    )

    # Denormalized counters — kept in sync on like/comment/view events.
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Computed hot score for trending (updated on like/comment events). HN-style decay.
    hot_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False, index=True)
    # published | deleted

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships (all noload — loaded explicitly via selectinload in routes)
    author: Mapped["User"] = relationship(back_populates="posts", lazy="noload")  # noqa: F821
    likes: Mapped[list["PostLike"]] = relationship(
        back_populates="post",
        lazy="noload",
        cascade="all, delete-orphan",
    )
    comments: Mapped[list["PostComment"]] = relationship(
        back_populates="post",
        lazy="noload",
        cascade="all, delete-orphan",
    )


class PostLike(Base):
    """Many-to-many: user likes a post. Unique per (user, post)."""
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_post_likes_user_post"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    post: Mapped["Post"] = relationship(back_populates="likes", lazy="noload")
    user: Mapped["User"] = relationship(lazy="noload")


class PostComment(Base):
    """Nested comment on a post. Supports 1-level replies via parent_id."""
    __tablename__ = "post_comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("post_comments.id", ondelete="CASCADE"),
        index=True,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    post: Mapped["Post"] = relationship(back_populates="comments", lazy="noload")
    user: Mapped["User"] = relationship(lazy="noload")
    # Self-referential for replies
    parent: Mapped["PostComment | None"] = relationship(
        remote_side="PostComment.id",
        back_populates="replies",
        lazy="noload",
    )
    replies: Mapped[list["PostComment"]] = relationship(
        back_populates="parent",
        lazy="noload",
        cascade="all, delete-orphan",
    )


class PostCommentLike(Base):
    """Many-to-many: user likes a community comment."""
    __tablename__ = "post_comment_likes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    comment_id: Mapped[int] = mapped_column(ForeignKey("post_comments.id", ondelete="CASCADE"), primary_key=True)
