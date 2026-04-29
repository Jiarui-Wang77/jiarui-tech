"""
Ranking / hot-score algorithms.

HN-style trending: score = (weighted_engagement) / (age_hours + 2) ^ gravity
— gravity 1.8 is widely used (reddit hot), HN uses ~1.5.
— Fresh posts with decent engagement surface; old posts decay naturally.
"""
from datetime import datetime, timezone

# Tuning knobs
_COMMENT_WEIGHT = 2.0   # comments count roughly 2x more than a like (more effort)
_VIEW_WEIGHT = 0.02     # views barely move the needle; just prevents all-zero
_GRAVITY = 1.6          # decay exponent — higher = fresher results dominate


def compute_hot_score(
    likes: int,
    comments: int,
    views: int,
    created_at: datetime,
) -> float:
    """Return a comparable hot-score for trending rankings.

    Result is a float; higher = hotter. Designed to be stored and sorted on.
    """
    # Weighted engagement, offset by 1 so brand-new zero-engagement posts
    # don't all collapse to exactly 0 (and break sort stability).
    engagement = (
        1.0
        + likes
        + _COMMENT_WEIGHT * comments
        + _VIEW_WEIGHT * views
    )

    # Age in hours from creation to now — min 0 to avoid negatives from clock skew.
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_hours = max(0.0, (now - created_at).total_seconds() / 3600.0)

    return engagement / pow(age_hours + 2.0, _GRAVITY)
