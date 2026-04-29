import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_optional_user
from app.database import get_db
from app.models.article import Article, ArticleComment, ArticleCommentLike
from app.models.category import Category
from app.models.user import User
from app.schemas.article import (
    ArticleListResponse,
    ArticlePublic,
    CommentCreate,
    CommentPublic,
)

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    need_category_join = bool(category and category != "all")

    # ── Reusable WHERE conditions ─────────────────────────────────────
    conditions = [Article.status == "published"]

    if need_category_join:
        conditions.append(Category.slug == category)

    if search:
        term = f"%{search}%"
        conditions.append(
            Article.title_zh.ilike(term)
            | Article.title_en.ilike(term)
            | Article.article_uid.ilike(term)
        )

    # ── COUNT — simple scalar query, no ORM entity, no subquery ──────
    count_q = select(func.count(Article.id)).where(*conditions)
    if need_category_join:
        count_q = count_q.join(Category, Article.category_id == Category.id)
    total: int = (await db.execute(count_q)).scalar_one()

    # ── DATA — with eager loading ─────────────────────────────────────
    data_q = (
        select(Article)
        .where(*conditions)
        .options(selectinload(Article.category), selectinload(Article.author))
        .order_by(Article.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if need_category_join:
        data_q = data_q.join(Category, Article.category_id == Category.id)

    items = (await db.execute(data_q)).scalars().all()

    return ArticleListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/recommended/{article_id}", response_model=list)
async def get_recommended(
    article_id: int,
    db: AsyncSession = Depends(get_db),
):
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    result = await db.execute(
        select(Article)
        .where(
            Article.status == "published",
            Article.category_id == article.category_id,
            Article.id != article_id,
        )
        .options(selectinload(Article.category), selectinload(Article.author))
        .order_by(func.random())
        .limit(5)
    )
    return result.scalars().all()


@router.get("/{uid}", response_model=ArticlePublic)
async def get_article(
    uid: str,
    db: AsyncSession = Depends(get_db),
    _current_user: User | None = Depends(get_optional_user),
):
    result = await db.execute(
        select(Article)
        .where(Article.article_uid == uid, Article.status == "published")
        .options(selectinload(Article.category), selectinload(Article.author))
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.view_count += 1
    return article


@router.get("/{uid}/comments", response_model=list[CommentPublic])
async def get_comments(
    uid: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    article = (
        await db.execute(select(Article).where(Article.article_uid == uid))
    ).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    all_rows = (
        await db.execute(
            select(ArticleComment)
            .where(ArticleComment.article_id == article.id)
            .options(selectinload(ArticleComment.user))
            .order_by(ArticleComment.created_at.asc())
        )
    ).scalars().all()

    # Resolve which comments the current user has liked
    liked_ids: set[int] = set()
    if current_user:
        liked_ids = set(
            (
                await db.execute(
                    select(ArticleCommentLike.comment_id).where(
                        ArticleCommentLike.user_id == current_user.id
                    )
                )
            ).scalars().all()
        )

    # Build threaded tree (1-level deep: top-level + replies)
    comment_map: dict[int, CommentPublic] = {}
    top_level: list[CommentPublic] = []
    for c in all_rows:
        pub = CommentPublic(
            id=c.id,
            content="" if c.is_deleted else c.content,
            user=c.user,
            created_at=c.created_at,
            parent_id=c.parent_id,
            likes_count=c.likes_count,
            is_deleted=c.is_deleted,
            liked_by_me=c.id in liked_ids,
            replies=[],
        )
        comment_map[c.id] = pub
        if c.parent_id is None:
            top_level.append(pub)
        else:
            parent = comment_map.get(c.parent_id)
            if parent:
                parent.replies.append(pub)

    return top_level


@router.post("/{uid}/comments", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
async def post_comment(
    uid: str,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = (
        await db.execute(select(Article).where(Article.article_uid == uid))
    ).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Validate parent exists (if replying)
    if payload.parent_id is not None:
        parent = (
            await db.execute(
                select(ArticleComment).where(ArticleComment.id == payload.parent_id)
            )
        ).scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment not found")

    comment = ArticleComment(
        article_id=article.id,
        user_id=current_user.id,
        content=payload.content,
        parent_id=payload.parent_id,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment, ["user"])
    return CommentPublic(
        id=comment.id,
        content=comment.content,
        user=comment.user,
        created_at=comment.created_at,
        parent_id=comment.parent_id,
        likes_count=0,
        is_deleted=False,
        liked_by_me=False,
        replies=[],
    )


@router.delete("/{uid}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    uid: str,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = (
        await db.execute(select(ArticleComment).where(ArticleComment.id == comment_id))
    ).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    comment.is_deleted = True
    comment.content = ""


@router.post("/{uid}/comments/{comment_id}/like")
async def toggle_comment_like(
    uid: str,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    comment = (
        await db.execute(select(ArticleComment).where(ArticleComment.id == comment_id))
    ).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing = (
        await db.execute(
            select(ArticleCommentLike).where(
                ArticleCommentLike.user_id == current_user.id,
                ArticleCommentLike.comment_id == comment_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        await db.delete(existing)
        comment.likes_count = max(0, comment.likes_count - 1)
        liked = False
    else:
        db.add(ArticleCommentLike(user_id=current_user.id, comment_id=comment_id))
        comment.likes_count += 1
        liked = True

    return {"liked": liked, "likes_count": comment.likes_count}
