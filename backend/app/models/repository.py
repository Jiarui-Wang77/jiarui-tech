"""
GitHub Repository tracker models.

Stores AI-related GitHub repositories we're monitoring, plus daily
snapshots of their star counts for computing momentum / black-horse scores.
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
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Repository(Base):
    """A tracked GitHub repo — current state + computed momentum."""
    __tablename__ = "repositories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # GitHub identity
    full_name: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    # owner/repo (e.g. "vercel/ai")
    owner: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Descriptive
    description: Mapped[str | None] = mapped_column(Text)
    html_url: Mapped[str] = mapped_column(String(500), nullable=False)
    homepage: Mapped[str | None] = mapped_column(String(500))
    language: Mapped[str | None] = mapped_column(String(50), index=True)
    topics: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        default=list,
        server_default="{}",
        nullable=False,
    )
    owner_avatar_url: Mapped[str | None] = mapped_column(String(500))

    # Current raw metrics
    stars_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    forks_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    open_issues_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    watchers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Delta metrics (24h / 7d star growth) — recomputed after snapshot
    stars_24h: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stars_7d: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Black-horse score (0-10) — recomputed after snapshot
    horse_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)

    # GitHub timestamps
    gh_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    gh_pushed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Our tracking
    is_tracked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    snapshots: Mapped[list["RepoStatSnapshot"]] = relationship(
        back_populates="repo",
        lazy="noload",
        cascade="all, delete-orphan",
        order_by="RepoStatSnapshot.captured_at.desc()",
    )


class RepoStatSnapshot(Base):
    """Daily snapshot of a repo's metrics — used for computing deltas."""
    __tablename__ = "repo_stat_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    stars_count: Mapped[int] = mapped_column(Integer, nullable=False)
    forks_count: Mapped[int] = mapped_column(Integer, nullable=False)
    open_issues_count: Mapped[int] = mapped_column(Integer, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    repo: Mapped["Repository"] = relationship(back_populates="snapshots", lazy="noload")
