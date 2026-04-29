from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
    # Profile extras (all optional)
    age: Mapped[int | None] = mapped_column(Integer)
    region: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ai: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # M5 — Juno-Alpha daily quota
    juno_quota_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    juno_quota_date: Mapped[date | None] = mapped_column(Date)
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

    articles: Mapped[list["Article"]] = relationship(back_populates="author", lazy="noload")  # noqa: F821

    # M2 — Community relationships
    posts: Mapped[list["Post"]] = relationship(back_populates="author", lazy="noload")  # noqa: F821
    # Users this user follows (outbound): self is the follower
    following_links: Mapped[list["UserFollow"]] = relationship(  # noqa: F821
        "UserFollow",
        foreign_keys="UserFollow.follower_id",
        back_populates="follower",
        lazy="noload",
        cascade="all, delete-orphan",
    )
    # Users following this user (inbound): self is the following target
    follower_links: Mapped[list["UserFollow"]] = relationship(  # noqa: F821
        "UserFollow",
        foreign_keys="UserFollow.following_id",
        back_populates="following",
        lazy="noload",
        cascade="all, delete-orphan",
    )
