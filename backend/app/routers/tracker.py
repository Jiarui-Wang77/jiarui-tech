"""
GitHub Tracker public routes.

Read-only for users. Admin-only routes (sync, add/remove repos) live here too,
gated by `get_current_admin`.
"""
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.repository import Repository, RepoStatSnapshot
from app.models.user import User
from app.schemas.repository import (
    RepoAddRequest,
    RepoDetail,
    RepoListItem,
    RepoListResponse,
    RepoSnapshot,
    TrackerStats,
)
from app.services.github_scraper import GitHubFetchError
from app.services.tracker_sync import sync_all_tracked, sync_one_repo

router = APIRouter(prefix="/tracker", tags=["tracker"])


# ── Public: list repos ──────────────────────────────────────────────
@router.get("/repos", response_model=RepoListResponse)
async def list_repos(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    language: str | None = Query(default=None),
    topic: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort: str = Query(default="horse", pattern="^(horse|stars|stars_24h|stars_7d|newest)$"),
    db: AsyncSession = Depends(get_db),
):
    """List tracked repos with filters & sorting."""
    conditions = [Repository.is_tracked.is_(True)]
    if language:
        conditions.append(Repository.language == language)
    if topic:
        conditions.append(Repository.topics.any(topic))
    if search:
        term = f"%{search}%"
        conditions.append(
            Repository.full_name.ilike(term)
            | Repository.description.ilike(term)
        )

    # Count
    total = (await db.execute(select(func.count(Repository.id)).where(*conditions))).scalar_one()

    # Sort
    order_map = {
        "horse": desc(Repository.horse_score),
        "stars": desc(Repository.stars_count),
        "stars_24h": desc(Repository.stars_24h),
        "stars_7d": desc(Repository.stars_7d),
        "newest": desc(Repository.gh_created_at),
    }
    order = order_map.get(sort, desc(Repository.horse_score))

    # Data
    data_q = (
        select(Repository)
        .where(*conditions)
        .order_by(order, desc(Repository.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(data_q)).scalars().all()

    return RepoListResponse(
        items=[RepoListItem.model_validate(r) for r in items],
        total=int(total),
        page=page,
        page_size=page_size,
    )


# ── Public: repo detail (with snapshot history) ─────────────────────
@router.get("/repos/{owner}/{name}", response_model=RepoDetail)
async def get_repo(
    owner: str,
    name: str,
    snapshots_limit: int = Query(default=30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    full_name = f"{owner}/{name}"
    result = await db.execute(
        select(Repository).where(Repository.full_name == full_name)
    )
    repo = result.scalar_one_or_none()
    if not repo or not repo.is_tracked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not tracked")

    # Load recent snapshots (most-recent-first, then reverse for chart left-to-right)
    snaps_result = await db.execute(
        select(RepoStatSnapshot)
        .where(RepoStatSnapshot.repo_id == repo.id)
        .order_by(RepoStatSnapshot.captured_at.desc())
        .limit(snapshots_limit)
    )
    raw_snaps = list(snaps_result.scalars().all())
    raw_snaps.reverse()  # chronological for charting

    return RepoDetail.model_validate({
        **{c.name: getattr(repo, c.name) for c in repo.__table__.columns},
        "snapshots": [RepoSnapshot.model_validate(s) for s in raw_snaps],
    })


# ── Public: aggregate stats ─────────────────────────────────────────
@router.get("/stats", response_model=TrackerStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_repos = (
        await db.execute(select(func.count(Repository.id)).where(Repository.is_tracked.is_(True)))
    ).scalar_one()
    total_stars = (
        await db.execute(
            select(func.coalesce(func.sum(Repository.stars_count), 0)).where(
                Repository.is_tracked.is_(True)
            )
        )
    ).scalar_one()
    avg_score = (
        await db.execute(
            select(func.coalesce(func.avg(Repository.horse_score), 0)).where(
                Repository.is_tracked.is_(True)
            )
        )
    ).scalar_one()

    # Languages
    lang_rows = (
        await db.execute(
            select(Repository.language, func.count(Repository.id).label("n"))
            .where(Repository.is_tracked.is_(True), Repository.language.is_not(None))
            .group_by(Repository.language)
            .order_by(func.count(Repository.id).desc())
            .limit(8)
        )
    ).all()

    # Topics (unnest)
    topic_col = func.unnest(Repository.topics).label("topic")
    subq = select(topic_col).where(Repository.is_tracked.is_(True)).subquery()
    topic_rows = (
        await db.execute(
            select(subq.c.topic, func.count().label("n"))
            .group_by(subq.c.topic)
            .order_by(func.count().desc())
            .limit(12)
        )
    ).all()

    return TrackerStats(
        total_repos=int(total_repos),
        total_stars=int(total_stars),
        avg_horse_score=round(float(avg_score), 2),
        languages=[{"language": l, "count": int(c)} for l, c in lang_rows],
        top_topics=[{"topic": t, "count": int(c)} for t, c in topic_rows],
    )


# ── Admin: sync all ─────────────────────────────────────────────────
@router.post("/admin/sync-all")
async def admin_sync_all(
    limit: int | None = Query(default=None, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Fetch fresh GitHub data for all tracked repos."""
    result = await sync_all_tracked(db, limit=limit)
    return result


# ── Admin: sync one ─────────────────────────────────────────────────
@router.post("/admin/sync-one")
async def admin_sync_one(
    full_name: str = Query(..., description="owner/repo"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    try:
        repo = await sync_one_repo(db, full_name)
    except GitHubFetchError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found on GitHub")
    return {"full_name": repo.full_name, "stars_count": repo.stars_count, "horse_score": repo.horse_score}


# ── Admin: add a repo to tracking ────────────────────────────────────
@router.post("/admin/repos", response_model=RepoListItem, status_code=status.HTTP_201_CREATED)
async def admin_add_repo(
    payload: RepoAddRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    # Idempotent — if already tracked, just re-sync
    repo = await sync_one_repo(db, payload.full_name)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found on GitHub")
    repo.is_tracked = True
    return RepoListItem.model_validate(repo)


# ── Admin: untrack ──────────────────────────────────────────────────
@router.delete("/admin/repos/{owner}/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_untrack_repo(
    owner: str,
    name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Repository).where(Repository.full_name == f"{owner}/{name}")
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Not tracked")
    repo.is_tracked = False
