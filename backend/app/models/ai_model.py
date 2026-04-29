"""
AI Model Benchmark — M4.

A curated leaderboard of LLMs scored across 4 domains:
  - coding     : code generation / debugging / architecture
  - academic   : research / literature / reasoning
  - office     : business writing / charts / communication
  - lifestyle  : planning / gaming / general-purpose chat

Each AIModel has exactly one ModelScore row per domain (many-to-one).
Users can cast one vote per model (1-5 stars, updatable).
"""
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    # Examples: "gpt-5", "claude-sonnet-4-6", "gemini-ultra-2"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    vendor: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    # "OpenAI" | "Anthropic" | "Google" | "Meta" | "xAI" | "Mistral" | ...

    logo_url: Mapped[str | None] = mapped_column(String(500))
    brand_color: Mapped[str | None] = mapped_column(String(20))  # e.g. "#10a37f"

    description_zh: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)

    # Commercial / technical facts
    release_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    context_window: Mapped[int | None] = mapped_column(Integer)  # tokens
    price_input_per_1m: Mapped[float | None] = mapped_column(Float)   # USD per 1M input tokens
    price_output_per_1m: Mapped[float | None] = mapped_column(Float)  # USD per 1M output tokens
    official_url: Mapped[str | None] = mapped_column(String(500))

    # Derived (maintained by app)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    # = weighted avg of domain scores (official) + community votes

    community_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # avg of ModelVote.rating ∈ [1, 5]
    votes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    # "active" | "deprecated" | "preview"

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Admin can pin models to top

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

    scores: Mapped[list["ModelScore"]] = relationship(
        back_populates="model",
        lazy="noload",
        cascade="all, delete-orphan",
    )
    votes: Mapped[list["ModelVote"]] = relationship(
        back_populates="model",
        lazy="noload",
        cascade="all, delete-orphan",
    )


class ModelScore(Base):
    """One row per (model, domain) — official benchmark score 0-100."""
    __tablename__ = "model_scores"
    __table_args__ = (
        UniqueConstraint("model_id", "domain", name="uq_model_scores_model_domain"),
        CheckConstraint("score >= 0 AND score <= 100", name="ck_model_scores_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    model_id: Mapped[int] = mapped_column(
        ForeignKey("ai_models.id", ondelete="CASCADE"), index=True, nullable=False
    )
    domain: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # "coding" | "academic" | "office" | "lifestyle"

    score: Mapped[float] = mapped_column(Float, nullable=False)

    # Detailed sub-scores (optional, JSON for flexibility)
    # e.g. {"code_gen": 94, "debugging": 92, "architecture": 90}
    breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)

    notes_zh: Mapped[str | None] = mapped_column(Text)
    notes_en: Mapped[str | None] = mapped_column(Text)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    model: Mapped["AIModel"] = relationship(back_populates="scores", lazy="noload")


class ModelVote(Base):
    """A user's rating of a model (1-5 stars). One per (user, model), updatable."""
    __tablename__ = "model_votes"
    __table_args__ = (
        UniqueConstraint("user_id", "model_id", name="uq_model_votes_user_model"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_model_votes_rating"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    model_id: Mapped[int] = mapped_column(
        ForeignKey("ai_models.id", ondelete="CASCADE"), index=True, nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)

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

    model: Mapped["AIModel"] = relationship(back_populates="votes", lazy="noload")
    user: Mapped["User"] = relationship(lazy="noload")  # noqa: F821
