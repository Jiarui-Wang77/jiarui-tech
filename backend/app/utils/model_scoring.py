"""
AI Model overall scoring.

Combines:
  - Official domain benchmarks (0-100) — 70% weight
  - Community rating (1-5 → normalized to 0-100) — 30% weight

Weighting of the 4 domains is equal by default. Admin can tune this later.
"""

DOMAINS = ("coding", "academic", "office", "lifestyle")
DOMAIN_WEIGHTS = {
    "coding": 0.25,
    "academic": 0.25,
    "office": 0.25,
    "lifestyle": 0.25,
}

_OFFICIAL_WEIGHT = 0.7
_COMMUNITY_WEIGHT = 0.3


def compute_official_score(scores_by_domain: dict[str, float]) -> float:
    """Weighted average of 4 domain scores. Missing domains → 0."""
    total = 0.0
    for domain, w in DOMAIN_WEIGHTS.items():
        total += w * float(scores_by_domain.get(domain, 0.0))
    return round(total, 2)


def compute_overall_score(
    scores_by_domain: dict[str, float],
    community_rating: float,
    votes_count: int,
) -> float:
    """Combine official benchmark + community rating → 0-100 overall score.

    Smoothing: if votes_count < 5, weight community contribution down
    to avoid early-voter bias.
    """
    official = compute_official_score(scores_by_domain)

    # Normalize community_rating (1-5) to 0-100
    community_0_100 = max(0.0, min(100.0, (float(community_rating) - 1.0) / 4.0 * 100.0))

    # Confidence factor: community weight ramps from 0 → full at 5 votes
    confidence = min(1.0, max(0, votes_count) / 5.0)
    effective_community_weight = _COMMUNITY_WEIGHT * confidence
    effective_official_weight = 1.0 - effective_community_weight

    overall = official * effective_official_weight + community_0_100 * effective_community_weight
    return round(max(0.0, min(100.0, overall)), 2)
