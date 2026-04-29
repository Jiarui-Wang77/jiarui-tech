"""
Black-horse score algorithm for GitHub repositories.

Definition from the product spec:
    Score = (24h_Star_Increase / Total_Stars) × Interaction_Rate × Freshness

Plus a freshness factor that rewards newer projects (a 10-year-old repo
getting +500 stars today is less interesting than a 3-month-old project
doubling overnight).

Scale: 0.0 – 10.0 (higher = more "black-horse-like").
"""
from datetime import datetime, timezone

# Interpretation:
#   - Growth rate: stars added in last 24h / current stars (capped)
#   - Interaction rate: open_issues / (stars + 10) — proxy for community engagement
#   - Freshness factor: <1y = 1.0 ; 1-3y = 0.8 ; 3-5y = 0.6 ; >5y = 0.4
#   - Absolute-momentum bonus: +1.0 if stars_24h > 500 (can't ignore raw velocity)


def compute_horse_score(
    stars_count: int,
    stars_24h: int,
    open_issues_count: int,
    gh_created_at: datetime | None,
) -> float:
    """Return the black-horse score in [0, 10]."""

    # Guard against zero/negative inputs
    stars_count = max(0, stars_count)
    stars_24h = max(0, stars_24h)
    issues = max(0, open_issues_count)

    # ── Component 1: growth rate (0–1 typical, capped at ~0.5) ────
    # A 1-day doubling (rate=1.0) is extreme; cap to prevent outliers.
    growth_rate = stars_24h / max(stars_count, 10)
    growth_rate = min(growth_rate, 0.5)  # cap

    # ── Component 2: interaction rate (small, smooth) ──────────────
    interaction = issues / max(stars_count, 10)
    interaction = min(interaction, 0.2)  # cap

    # ── Component 3: freshness factor ──────────────────────────────
    if gh_created_at is None:
        freshness = 0.8
    else:
        # Normalise tz
        if gh_created_at.tzinfo is None:
            gh_created_at = gh_created_at.replace(tzinfo=timezone.utc)
        age_years = (datetime.now(timezone.utc) - gh_created_at).days / 365.25
        if age_years < 1:
            freshness = 1.0
        elif age_years < 3:
            freshness = 0.8
        elif age_years < 5:
            freshness = 0.6
        else:
            freshness = 0.4

    # ── Combine (target output ~ 0–10) ─────────────────────────────
    # growth_rate * 80 + interaction * 40 gives roughly 0–50 before freshness.
    # Multiply freshness and clamp.
    raw = (growth_rate * 80.0 + interaction * 40.0) * freshness

    # Absolute velocity bonus — big projects still deserve credit
    velocity_bonus = 0.0
    if stars_24h >= 1000:
        velocity_bonus = 2.0
    elif stars_24h >= 500:
        velocity_bonus = 1.5
    elif stars_24h >= 100:
        velocity_bonus = 1.0
    elif stars_24h >= 30:
        velocity_bonus = 0.5

    score = raw + velocity_bonus
    return round(max(0.0, min(10.0, score)), 2)
