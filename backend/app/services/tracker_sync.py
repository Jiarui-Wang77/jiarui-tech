"""
Tracker sync service — glues GitHub scraper → DB + snapshots + scoring.

Typical flow (called from admin endpoint or a future scheduler):
  1. For each tracked repo: fetch fresh data from GitHub
  2. Upsert Repository row with latest fields
  3. Insert a RepoStatSnapshot row
  4. Recompute stars_24h, stars_7d deltas from snapshots
  5. Recompute horse_score using black-horse formula
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repository import Repository, RepoStatSnapshot
from app.services.github_scraper import GitHubFetchError, extract_repo_fields, fetch_repo
from app.utils.black_horse import compute_horse_score


async def _find_snapshot_near(
    db: AsyncSession, repo_id: int, hours_ago: float
) -> RepoStatSnapshot | None:
    """Return the latest snapshot captured at least `hours_ago` hours ago."""
    target = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    result = await db.execute(
        select(RepoStatSnapshot)
        .where(
            RepoStatSnapshot.repo_id == repo_id,
            RepoStatSnapshot.captured_at <= target,
        )
        .order_by(RepoStatSnapshot.captured_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _find_oldest_snapshot_excluding_current(
    db: AsyncSession, repo_id: int
) -> RepoStatSnapshot | None:
    """Get the OLDEST snapshot for this repo (skipping the most recent, which is the one
    we just inserted). Used as a fallback when no snapshot is old enough for the exact
    window — we extrapolate from the oldest we have.
    """
    result = await db.execute(
        select(RepoStatSnapshot)
        .where(RepoStatSnapshot.repo_id == repo_id)
        .order_by(RepoStatSnapshot.captured_at.asc())
        .limit(1)
    )
    oldest = result.scalar_one_or_none()
    if oldest is None:
        return None

    # Skip if this IS the most recent snapshot (only 1 snapshot exists total)
    count_q = await db.execute(
        select(RepoStatSnapshot).where(RepoStatSnapshot.repo_id == repo_id)
    )
    all_rows = list(count_q.scalars().all())
    if len(all_rows) <= 1:
        return None
    return oldest


def _extrapolated_delta(
    current_stars: int,
    past_snapshot: "RepoStatSnapshot",
    target_hours: float,
) -> int:
    """Scale an observed delta to a target window via linear extrapolation.

    Example: if past snapshot was 6h ago with 100 fewer stars, estimated 24h delta = 400.
    """
    elapsed_hours = (datetime.now(timezone.utc) - past_snapshot.captured_at).total_seconds() / 3600
    if elapsed_hours < 0.5:
        return 0  # too recent to extrapolate reliably
    raw_delta = current_stars - past_snapshot.stars_count
    if raw_delta <= 0:
        return 0
    scaled = round(raw_delta * target_hours / elapsed_hours)
    return max(0, int(scaled))


async def _recompute_deltas_and_score(db: AsyncSession, repo: Repository) -> None:
    """After a new snapshot exists, recompute stars_24h / stars_7d / horse_score.

    Strategy:
      1. First try to find a snapshot close to the exact window (24h / 7d).
      2. If none exists yet (we haven't been tracking long enough), fall back to
         the oldest available snapshot and linearly extrapolate to the target window.
      3. This lets the leaderboard show meaningful deltas from day 1 instead of
         waiting 24+ hours for a baseline.
    """
    # ── 24h delta ─────────────────────────────────────────────────────
    snap_24h = await _find_snapshot_near(db, repo.id, 24)
    if snap_24h:
        repo.stars_24h = max(0, repo.stars_count - snap_24h.stars_count)
    else:
        # Fallback: extrapolate from oldest snapshot
        oldest = await _find_oldest_snapshot_excluding_current(db, repo.id)
        repo.stars_24h = _extrapolated_delta(repo.stars_count, oldest, 24.0) if oldest else 0

    # ── 7d delta ──────────────────────────────────────────────────────
    snap_7d = await _find_snapshot_near(db, repo.id, 24 * 7)
    if snap_7d:
        repo.stars_7d = max(0, repo.stars_count - snap_7d.stars_count)
    else:
        oldest = await _find_oldest_snapshot_excluding_current(db, repo.id)
        repo.stars_7d = _extrapolated_delta(repo.stars_count, oldest, 24.0 * 7) if oldest else 0

    repo.horse_score = compute_horse_score(
        stars_count=repo.stars_count,
        stars_24h=repo.stars_24h,
        open_issues_count=repo.open_issues_count,
        gh_created_at=repo.gh_created_at,
    )


async def sync_one_repo(db: AsyncSession, full_name: str) -> Repository | None:
    """Fetch GitHub data for a repo, upsert it, snapshot it, rescore it.

    Returns the updated Repository (or None if GitHub returned 404).
    """
    gh_data = await fetch_repo(full_name)
    if not gh_data:
        return None

    fields = extract_repo_fields(gh_data)

    # Upsert
    result = await db.execute(select(Repository).where(Repository.full_name == full_name))
    repo = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if repo is None:
        repo = Repository(**fields, last_synced_at=now)
        db.add(repo)
        await db.flush()
    else:
        for k, v in fields.items():
            setattr(repo, k, v)
        repo.last_synced_at = now

    # Snapshot
    snapshot = RepoStatSnapshot(
        repo_id=repo.id,
        stars_count=repo.stars_count,
        forks_count=repo.forks_count,
        open_issues_count=repo.open_issues_count,
    )
    db.add(snapshot)
    await db.flush()

    # Deltas + score (based on all snapshots including the one just added)
    await _recompute_deltas_and_score(db, repo)
    return repo


async def sync_all_tracked(db: AsyncSession, limit: int | None = None) -> dict[str, int]:
    """Sync every tracked repo. Returns {"updated": N, "failed": M}."""
    q = select(Repository).where(Repository.is_tracked.is_(True))
    if limit:
        q = q.limit(limit)
    result = await db.execute(q)
    repos = list(result.scalars().all())

    updated = 0
    failed = 0
    for r in repos:
        try:
            out = await sync_one_repo(db, r.full_name)
            if out is not None:
                updated += 1
            else:
                failed += 1
        except GitHubFetchError:
            failed += 1

    return {"updated": updated, "failed": failed, "total": len(repos)}
