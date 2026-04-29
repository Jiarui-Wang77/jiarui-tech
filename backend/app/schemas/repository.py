from datetime import datetime

from pydantic import BaseModel


class RepoListItem(BaseModel):
    """Lightweight item for leaderboard lists."""
    model_config = {"from_attributes": True}

    id: int
    full_name: str
    owner: str
    name: str
    description: str | None
    html_url: str
    language: str | None
    topics: list[str] = []
    owner_avatar_url: str | None

    stars_count: int
    forks_count: int
    stars_24h: int
    stars_7d: int
    horse_score: float

    gh_pushed_at: datetime | None
    last_synced_at: datetime


class RepoListResponse(BaseModel):
    items: list[RepoListItem]
    total: int
    page: int
    page_size: int


class RepoSnapshot(BaseModel):
    model_config = {"from_attributes": True}
    stars_count: int
    forks_count: int
    open_issues_count: int
    captured_at: datetime


class RepoDetail(BaseModel):
    """Detail view — includes snapshot history for charting."""
    model_config = {"from_attributes": True}

    id: int
    full_name: str
    owner: str
    name: str
    description: str | None
    html_url: str
    homepage: str | None
    language: str | None
    topics: list[str] = []
    owner_avatar_url: str | None

    stars_count: int
    forks_count: int
    open_issues_count: int
    watchers_count: int
    stars_24h: int
    stars_7d: int
    horse_score: float

    gh_created_at: datetime | None
    gh_pushed_at: datetime | None
    first_seen_at: datetime
    last_synced_at: datetime

    snapshots: list[RepoSnapshot] = []


class RepoAddRequest(BaseModel):
    """Admin endpoint — add a new repo to track by full_name."""
    full_name: str


class TrackerStats(BaseModel):
    total_repos: int
    total_stars: int
    avg_horse_score: float
    languages: list[dict] = []   # [{language, count}]
    top_topics: list[dict] = []  # [{topic, count}]
