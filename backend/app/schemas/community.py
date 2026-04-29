from pydantic import BaseModel, Field

from app.schemas.post import AuthorMini


# ── User profile / community-aware ─────────────────────────────────────
class UserProfile(BaseModel):
    """Public profile — view of a user in the community context."""
    model_config = {"from_attributes": True}
    id: int
    username: str
    avatar_url: str | None
    bio: str | None
    age: int | None = None
    region: str | None = None

    # Counters (enriched in route)
    posts_count: int = 0
    followers_count: int = 0
    following_count: int = 0

    # "Do I (current viewer) follow this user?" — enriched in route
    followed_by_me: bool = False


class UserProfileUpdate(BaseModel):
    """What a user can edit on their own profile."""
    bio: str | None = Field(default=None, max_length=200)
    avatar_url: str | None = Field(default=None, max_length=500)
    age: int | None = Field(default=None, ge=0, le=150)
    region: str | None = Field(default=None, max_length=100)


class FollowActionResponse(BaseModel):
    followed: bool
    followers_count: int


# ── Leaderboard entry ──────────────────────────────────────────────────
class LeaderboardEntry(BaseModel):
    model_config = {"from_attributes": True}
    rank: int
    user: AuthorMini
    posts_count: int
    total_likes: int
    followers_count: int
    score: float  # overall contribution score


# ── Follow list entry ──────────────────────────────────────────────────
class FollowListItem(BaseModel):
    model_config = {"from_attributes": True}
    user: AuthorMini
    followed_by_me: bool = False
