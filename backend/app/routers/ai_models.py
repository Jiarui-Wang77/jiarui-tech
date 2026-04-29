"""
AI Model leaderboard public routes + community voting + admin CRUD.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_admin, get_current_user, get_optional_user
from app.database import get_db
from app.models.ai_model import AIModel, ModelScore, ModelVote
from app.models.user import User
from app.schemas.ai_model import (
    AIModelCreate,
    AIModelDetail,
    AIModelListItem,
    AIModelListResponse,
    AIModelUpdate,
    ModelStats,
    ScoreInput,
    ScoreItem,
    UserVoteInfo,
    VoteInput,
    VoteResponse,
)
from app.utils.model_scoring import DOMAINS, compute_overall_score

router = APIRouter(prefix="/ai-models", tags=["ai_models"])


# ── Helpers ────────────────────────────────────────────────────────────
def _domain_scores_dict(model: AIModel) -> dict[str, float]:
    """Flatten Model.scores into {domain: score}. Missing domains → 0."""
    return {s.domain: float(s.score) for s in (model.scores or [])}


async def _recompute_overall(db: AsyncSession, model: AIModel) -> None:
    """Recompute model.overall_score from current scores + votes."""
    # Ensure scores loaded
    scores_q = await db.execute(
        select(ModelScore).where(ModelScore.model_id == model.id)
    )
    scores_list = list(scores_q.scalars().all())

    domain_map = {s.domain: float(s.score) for s in scores_list}
    model.overall_score = compute_overall_score(
        scores_by_domain=domain_map,
        community_rating=float(model.community_rating),
        votes_count=int(model.votes_count),
    )


async def _recompute_vote_stats(db: AsyncSession, model: AIModel) -> None:
    """Refresh community_rating + votes_count from current ModelVote rows."""
    agg = (
        await db.execute(
            select(
                func.count(ModelVote.id),
                func.coalesce(func.avg(ModelVote.rating), 0.0),
            ).where(ModelVote.model_id == model.id)
        )
    ).first()
    votes_count, avg_rating = agg if agg else (0, 0.0)
    model.votes_count = int(votes_count or 0)
    model.community_rating = round(float(avg_rating or 0.0), 2)


def _serialize_list_item(model: AIModel) -> AIModelListItem:
    return AIModelListItem(
        id=model.id,
        slug=model.slug,
        name=model.name,
        vendor=model.vendor,
        logo_url=model.logo_url,
        brand_color=model.brand_color,
        overall_score=model.overall_score,
        community_rating=model.community_rating,
        votes_count=model.votes_count,
        status=model.status,
        domain_scores=_domain_scores_dict(model),
    )


# ── Public: list ───────────────────────────────────────────────────────
@router.get("", response_model=AIModelListResponse)
async def list_models(
    vendor: str | None = Query(default=None),
    domain: str | None = Query(default=None),
    sort: str = Query(default="overall", pattern="^(overall|coding|academic|office|lifestyle|community|newest)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if vendor:
        conditions.append(AIModel.vendor == vendor)
    if status_filter:
        conditions.append(AIModel.status == status_filter)
    else:
        # Default: active + preview (hide deprecated)
        conditions.append(AIModel.status.in_(["active", "preview"]))

    # Sort
    if sort == "overall":
        order = [desc(AIModel.overall_score), desc(AIModel.sort_order)]
    elif sort == "community":
        order = [desc(AIModel.community_rating), desc(AIModel.votes_count)]
    elif sort == "newest":
        order = [desc(AIModel.release_date), desc(AIModel.created_at)]
    elif sort in _DOMAIN_SORT_KEYS:
        # Sort by a specific domain score — needs JOIN
        pass  # handled below
    else:
        order = [desc(AIModel.overall_score)]

    total = (await db.execute(select(func.count(AIModel.id)).where(*conditions))).scalar_one()

    if sort in _DOMAIN_SORT_KEYS:
        # JOIN on ModelScore for the requested domain
        data_q = (
            select(AIModel)
            .join(ModelScore, (ModelScore.model_id == AIModel.id) & (ModelScore.domain == sort))
            .where(*conditions)
            .options(selectinload(AIModel.scores))
            .order_by(desc(ModelScore.score), desc(AIModel.id))
        )
    else:
        data_q = (
            select(AIModel)
            .where(*conditions)
            .options(selectinload(AIModel.scores))
            .order_by(*order, desc(AIModel.id))
        )

    items = (await db.execute(data_q)).scalars().all()

    # Optional: filter by domain presence (show only models with that domain score)
    if domain:
        items = [m for m in items if any(s.domain == domain for s in (m.scores or []))]

    return AIModelListResponse(
        items=[_serialize_list_item(m) for m in items],
        total=int(total),
    )


_DOMAIN_SORT_KEYS = {"coding", "academic", "office", "lifestyle"}


# ── Public: detail by slug ─────────────────────────────────────────────
@router.get("/{slug}", response_model=AIModelDetail)
async def get_model(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    result = await db.execute(
        select(AIModel)
        .where(AIModel.slug == slug)
        .options(selectinload(AIModel.scores))
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    # Load user vote if logged in
    my_vote_data = None
    if current_user:
        v_result = await db.execute(
            select(ModelVote).where(
                ModelVote.model_id == model.id,
                ModelVote.user_id == current_user.id,
            )
        )
        v = v_result.scalar_one_or_none()
        if v:
            my_vote_data = UserVoteInfo(
                rating=v.rating, comment=v.comment, updated_at=v.updated_at
            )

    return AIModelDetail(
        id=model.id,
        slug=model.slug,
        name=model.name,
        vendor=model.vendor,
        logo_url=model.logo_url,
        brand_color=model.brand_color,
        description_zh=model.description_zh,
        description_en=model.description_en,
        release_date=model.release_date,
        context_window=model.context_window,
        price_input_per_1m=model.price_input_per_1m,
        price_output_per_1m=model.price_output_per_1m,
        official_url=model.official_url,
        overall_score=model.overall_score,
        community_rating=model.community_rating,
        votes_count=model.votes_count,
        status=model.status,
        scores=[ScoreItem.model_validate(s) for s in (model.scores or [])],
        my_vote=my_vote_data,
    )


# ── Public: aggregate stats ────────────────────────────────────────────
@router.get("/-/stats", response_model=ModelStats)
async def stats(db: AsyncSession = Depends(get_db)):
    total_models = (await db.execute(select(func.count(AIModel.id)))).scalar_one()
    total_votes = (await db.execute(select(func.count(ModelVote.id)))).scalar_one()

    # By vendor
    vendor_rows = (
        await db.execute(
            select(
                AIModel.vendor,
                func.count(AIModel.id).label("n"),
                func.coalesce(func.avg(AIModel.overall_score), 0).label("avg"),
            )
            .group_by(AIModel.vendor)
            .order_by(func.count(AIModel.id).desc())
        )
    ).all()

    # Domain leaders — best model per domain
    domain_leaders: dict = {}
    for domain in DOMAINS:
        leader_q = await db.execute(
            select(AIModel, ModelScore.score)
            .join(ModelScore, ModelScore.model_id == AIModel.id)
            .where(ModelScore.domain == domain, AIModel.status.in_(["active", "preview"]))
            .order_by(ModelScore.score.desc())
            .limit(1)
        )
        row = leader_q.first()
        if row:
            m, score = row
            domain_leaders[domain] = {"slug": m.slug, "name": m.name, "score": float(score)}

    return ModelStats(
        total_models=int(total_models),
        total_votes=int(total_votes),
        by_vendor=[{"vendor": v, "count": int(n), "avg_score": round(float(a), 2)} for v, n, a in vendor_rows],
        domain_leaders=domain_leaders,
    )


# ── Voting ─────────────────────────────────────────────────────────────
@router.post("/{slug}/vote", response_model=VoteResponse)
async def vote(
    slug: str,
    payload: VoteInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = (
        await db.execute(select(AIModel).where(AIModel.slug == slug))
    ).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    existing = (
        await db.execute(
            select(ModelVote).where(
                ModelVote.model_id == model.id,
                ModelVote.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
        existing.updated_at = datetime.now(timezone.utc)
        vote_row = existing
    else:
        vote_row = ModelVote(
            user_id=current_user.id,
            model_id=model.id,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(vote_row)

    await db.flush()
    await _recompute_vote_stats(db, model)
    await _recompute_overall(db, model)

    return VoteResponse(
        community_rating=model.community_rating,
        votes_count=model.votes_count,
        overall_score=model.overall_score,
        my_vote=UserVoteInfo(
            rating=vote_row.rating, comment=vote_row.comment, updated_at=vote_row.updated_at
        ),
    )


@router.delete("/{slug}/vote", status_code=status.HTTP_204_NO_CONTENT)
async def remove_vote(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = (
        await db.execute(select(AIModel).where(AIModel.slug == slug))
    ).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    existing = (
        await db.execute(
            select(ModelVote).where(
                ModelVote.model_id == model.id,
                ModelVote.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()
        await _recompute_vote_stats(db, model)
        await _recompute_overall(db, model)


# ═══════════════════════════════════════════════════════════════════════
#  ADMIN
# ═══════════════════════════════════════════════════════════════════════
@router.post("/admin/create", response_model=AIModelDetail, status_code=status.HTTP_201_CREATED)
async def admin_create_model(
    payload: AIModelCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    # Dedupe
    exists = (
        await db.execute(select(AIModel).where(AIModel.slug == payload.slug))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail=f"Slug '{payload.slug}' already exists")

    scores_data = payload.scores
    model_data = payload.model_dump(exclude={"scores"})
    model = AIModel(**model_data)
    db.add(model)
    await db.flush()

    for s in scores_data:
        db.add(ModelScore(
            model_id=model.id,
            domain=s.domain,
            score=s.score,
            breakdown=s.breakdown,
            notes_zh=s.notes_zh,
            notes_en=s.notes_en,
        ))

    await db.flush()
    await _recompute_overall(db, model)

    # Reload with scores
    fresh = (
        await db.execute(
            select(AIModel).where(AIModel.id == model.id).options(selectinload(AIModel.scores))
        )
    ).scalar_one()
    return AIModelDetail(
        id=fresh.id,
        slug=fresh.slug,
        name=fresh.name,
        vendor=fresh.vendor,
        logo_url=fresh.logo_url,
        brand_color=fresh.brand_color,
        description_zh=fresh.description_zh,
        description_en=fresh.description_en,
        release_date=fresh.release_date,
        context_window=fresh.context_window,
        price_input_per_1m=fresh.price_input_per_1m,
        price_output_per_1m=fresh.price_output_per_1m,
        official_url=fresh.official_url,
        overall_score=fresh.overall_score,
        community_rating=fresh.community_rating,
        votes_count=fresh.votes_count,
        status=fresh.status,
        scores=[ScoreItem.model_validate(s) for s in (fresh.scores or [])],
        my_vote=None,
    )


@router.patch("/admin/{slug}")
async def admin_update_model(
    slug: str,
    payload: AIModelUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    model = (
        await db.execute(select(AIModel).where(AIModel.slug == slug))
    ).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(model, k, v)

    await db.flush()
    await _recompute_overall(db, model)
    return {"slug": model.slug, "overall_score": model.overall_score}


@router.put("/admin/{slug}/score")
async def admin_upsert_score(
    slug: str,
    payload: ScoreInput,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    model = (
        await db.execute(select(AIModel).where(AIModel.slug == slug))
    ).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    existing = (
        await db.execute(
            select(ModelScore).where(
                ModelScore.model_id == model.id, ModelScore.domain == payload.domain
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.score = payload.score
        existing.breakdown = payload.breakdown
        existing.notes_zh = payload.notes_zh
        existing.notes_en = payload.notes_en
    else:
        db.add(ModelScore(
            model_id=model.id,
            domain=payload.domain,
            score=payload.score,
            breakdown=payload.breakdown,
            notes_zh=payload.notes_zh,
            notes_en=payload.notes_en,
        ))

    await db.flush()
    await _recompute_overall(db, model)
    return {"slug": model.slug, "domain": payload.domain, "overall_score": model.overall_score}


@router.delete("/admin/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_model(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    model = (
        await db.execute(select(AIModel).where(AIModel.slug == slug))
    ).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.delete(model)
