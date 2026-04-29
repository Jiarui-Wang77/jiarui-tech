from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

DomainKey = Literal["coding", "academic", "office", "lifestyle"]
_DOMAIN_VALUES = {"coding", "academic", "office", "lifestyle"}


# ── Scores ─────────────────────────────────────────────────────────────
class ScoreItem(BaseModel):
    model_config = {"from_attributes": True}
    domain: str
    score: float
    breakdown: dict[str, Any] = {}
    notes_zh: str | None = None
    notes_en: str | None = None


class ScoreInput(BaseModel):
    """Admin payload for setting a domain score."""
    domain: DomainKey
    score: float = Field(ge=0, le=100)
    breakdown: dict[str, Any] = {}
    notes_zh: str | None = None
    notes_en: str | None = None


# ── Model (public) ─────────────────────────────────────────────────────
class AIModelListItem(BaseModel):
    """Lightweight leaderboard item."""
    model_config = {"from_attributes": True}

    id: int
    slug: str
    name: str
    vendor: str
    logo_url: str | None
    brand_color: str | None
    overall_score: float
    community_rating: float
    votes_count: int
    status: str

    # Flattened domain scores {domain: score}
    domain_scores: dict[str, float] = {}


class AIModelDetail(BaseModel):
    """Full detail — scores, breakdowns, user vote state."""
    model_config = {"from_attributes": True}

    id: int
    slug: str
    name: str
    vendor: str
    logo_url: str | None
    brand_color: str | None
    description_zh: str | None
    description_en: str | None
    release_date: datetime | None
    context_window: int | None
    price_input_per_1m: float | None
    price_output_per_1m: float | None
    official_url: str | None

    overall_score: float
    community_rating: float
    votes_count: int
    status: str

    scores: list[ScoreItem] = []

    # Current user's vote (if logged in)
    my_vote: "UserVoteInfo | None" = None


class UserVoteInfo(BaseModel):
    model_config = {"from_attributes": True}
    rating: int
    comment: str | None = None
    updated_at: datetime


AIModelDetail.model_rebuild()


class AIModelListResponse(BaseModel):
    items: list[AIModelListItem]
    total: int


# ── Admin: create / update ─────────────────────────────────────────────
class AIModelCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9\-]*$")
    name: str = Field(min_length=1, max_length=120)
    vendor: str = Field(min_length=1, max_length=60)
    logo_url: str | None = Field(default=None, max_length=500)
    brand_color: str | None = Field(default=None, max_length=20)
    description_zh: str | None = None
    description_en: str | None = None
    release_date: datetime | None = None
    context_window: int | None = Field(default=None, ge=0)
    price_input_per_1m: float | None = Field(default=None, ge=0)
    price_output_per_1m: float | None = Field(default=None, ge=0)
    official_url: str | None = Field(default=None, max_length=500)
    status: Literal["active", "deprecated", "preview"] = "active"
    sort_order: int = 0
    scores: list[ScoreInput] = []

    @field_validator("scores")
    @classmethod
    def _check_unique_domains(cls, v: list[ScoreInput]):
        seen: set[str] = set()
        for s in v:
            if s.domain in seen:
                raise ValueError(f"Duplicate domain: {s.domain}")
            seen.add(s.domain)
        return v


class AIModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    vendor: str | None = Field(default=None, min_length=1, max_length=60)
    logo_url: str | None = Field(default=None, max_length=500)
    brand_color: str | None = Field(default=None, max_length=20)
    description_zh: str | None = None
    description_en: str | None = None
    release_date: datetime | None = None
    context_window: int | None = Field(default=None, ge=0)
    price_input_per_1m: float | None = Field(default=None, ge=0)
    price_output_per_1m: float | None = Field(default=None, ge=0)
    official_url: str | None = Field(default=None, max_length=500)
    status: Literal["active", "deprecated", "preview"] | None = None
    sort_order: int | None = None


# ── Voting ─────────────────────────────────────────────────────────────
class VoteInput(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class VoteResponse(BaseModel):
    community_rating: float
    votes_count: int
    overall_score: float
    my_vote: UserVoteInfo


# ── Aggregate stats ────────────────────────────────────────────────────
class ModelStats(BaseModel):
    total_models: int
    total_votes: int
    by_vendor: list[dict]  # [{vendor, count, avg_score}]
    domain_leaders: dict[str, dict]  # {domain: {slug, name, score}}
