"""
Community aggregates — leaderboard, trending tags, featured users.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.follow import UserFollow
from app.models.post import Post
from app.models.user import User
from app.schemas.community import LeaderboardEntry
from app.schemas.post import AuthorMini

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Top contributors — ranked by a weighted contribution score.

    score = posts * 1 + total_likes * 2 + followers * 3
    (emphasis: others valuing your content > raw output)
    """
    # Aggregate per user
    posts_agg = (
        select(
            Post.author_id.label("user_id"),
            func.count(Post.id).label("posts_count"),
            func.coalesce(func.sum(Post.likes_count), 0).label("total_likes"),
        )
        .where(Post.status == "published")
        .group_by(Post.author_id)
        .subquery()
    )

    follow_agg = (
        select(
            UserFollow.following_id.label("user_id"),
            func.count(UserFollow.id).label("followers_count"),
        )
        .group_by(UserFollow.following_id)
        .subquery()
    )

    query = (
        select(
            User,
            func.coalesce(posts_agg.c.posts_count, 0).label("posts_count"),
            func.coalesce(posts_agg.c.total_likes, 0).label("total_likes"),
            func.coalesce(follow_agg.c.followers_count, 0).label("followers_count"),
        )
        .outerjoin(posts_agg, User.id == posts_agg.c.user_id)
        .outerjoin(follow_agg, User.id == follow_agg.c.user_id)
        .where(User.is_active.is_(True))
    )

    rows = (await db.execute(query)).all()

    # Compute score and sort in Python (simpler than dialect-specific SQL math)
    ranked = []
    for user, posts_count, total_likes, followers_count in rows:
        score = float(posts_count) + float(total_likes) * 2.0 + float(followers_count) * 3.0
        if score <= 0:
            continue  # skip ghosts
        ranked.append(
            {
                "user": user,
                "posts_count": int(posts_count),
                "total_likes": int(total_likes),
                "followers_count": int(followers_count),
                "score": score,
            }
        )

    ranked.sort(key=lambda r: r["score"], reverse=True)
    top = ranked[:limit]

    return [
        LeaderboardEntry(
            rank=i + 1,
            user=AuthorMini.model_validate(r["user"]),
            posts_count=r["posts_count"],
            total_likes=r["total_likes"],
            followers_count=r["followers_count"],
            score=r["score"],
        )
        for i, r in enumerate(top)
    ]


@router.get("/trending-tags")
async def get_trending_tags(
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Most-used tags among published posts — flattens the tags array with unnest()."""
    tag_col = func.unnest(Post.tags).label("tag")
    # Use a subquery so we can alias the unnested column for group-by.
    subq = (
        select(tag_col)
        .where(Post.status == "published")
        .subquery()
    )
    result = await db.execute(
        select(subq.c.tag, func.count().label("count"))
        .group_by(subq.c.tag)
        .order_by(func.count().desc())
        .limit(limit)
    )
    return [{"tag": tag, "count": count} for tag, count in result.all() if tag]


@router.get("/stats")
async def get_community_stats(db: AsyncSession = Depends(get_db)):
    """Community-wide stats for hero/banner display."""
    total_posts = (
        await db.execute(select(func.count(Post.id)).where(Post.status == "published"))
    ).scalar_one()
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_follows = (await db.execute(select(func.count(UserFollow.id)))).scalar_one()

    return {
        "total_posts": int(total_posts),
        "total_users": int(total_users),
        "total_follows": int(total_follows),
    }
