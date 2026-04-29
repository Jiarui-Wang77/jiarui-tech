from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.database import AsyncSessionLocal, engine
from app.models import (  # noqa: F401 — ensures models are registered
    AIModel,
    Article,
    ArticleComment,
    ArticleCommentLike,
    Category,
    Conversation,
    Message,
    ModelScore,
    ModelVote,
    Post,
    PostComment,
    PostLike,
    RepoStatSnapshot,
    Repository,
    User,
    UserFollow,
)
from app.database import Base
from app.routers import admin, ai_models, articles, auth, categories, community, juno, posts, tracker, users
from app.services.scheduler import shutdown_scheduler, start_scheduler


# ── Lightweight additive migrations ────────────────────────────────────
# Since we use Base.metadata.create_all (not Alembic), new columns on
# EXISTING tables are not auto-added. Use ADD COLUMN IF NOT EXISTS
# (PostgreSQL 9.6+) to patch them in without dropping data.
_ADDITIVE_COLUMN_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(100)",
    # M5 — Juno-Alpha quota tracking
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS juno_quota_used INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS juno_quota_date DATE",
    # Admin / AI accounts
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT FALSE",
    # Article comment threading & reactions
    "ALTER TABLE article_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES article_comments(id) ON DELETE CASCADE",
    "ALTER TABLE article_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE article_comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE",
    # Community post comment likes
    "ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}'",
]

# ── Fixed admin credentials ─────────────────────────────────────────────
_ADMIN_USERNAME = "3091877318"
_ADMIN_EMAIL    = "admin@jiaruitech.internal"
_ADMIN_PASSWORD = "J20030809r"

# ── AI Bot accounts seeded on startup ──────────────────────────────────
_AI_BOTS = [
    # Original 5
    {
        "username": "极客晓明",
        "email": "bot_xiaoming@jiaruitech.internal",
        "bio": "喜欢捣鼓新技术，关注 AI 圈子的大小动态，偶尔发点自己的看法。",
        "avatar_url": None,
    },
    {
        "username": "码农阿杰",
        "email": "bot_ajie@jiaruitech.internal",
        "bio": "写了好几年代码，踩过不少坑，喜欢分享一些真正用得上的开发技巧。",
        "avatar_url": None,
    },
    {
        "username": "文青小雨",
        "email": "bot_xiaoyu@jiaruitech.internal",
        "bio": "爱看电影、追剧、读书，喜欢把值得推荐的好内容分享给大家。",
        "avatar_url": None,
    },
    {
        "username": "暖暖日记",
        "email": "bot_nuannuan@jiaruitech.internal",
        "bio": "记录生活里那些细碎的美好，用文字留住每一天有趣的瞬间。",
        "avatar_url": None,
    },
    {
        "username": "科技前沿君",
        "email": "bot_qianyanjun@jiaruitech.internal",
        "bio": "持续追踪 AI 大模型进展，喜欢第一时间解读那些改变世界的新技术。",
        "avatar_url": None,
    },
    # 25 new bots
    {
        "username": "量子码农",
        "email": "bot_quantumcoder@jiaruitech.internal",
        "bio": "在量子计算与传统算法之间游走，痴迷于极限性能优化和数学之美。",
        "avatar_url": None,
    },
    {
        "username": "深度技术宅",
        "email": "bot_deepgeek@jiaruitech.internal",
        "bio": "沉溺在技术兔子洞里乐此不疲，代码是我的第一语言，中文是第二语言。",
        "avatar_url": None,
    },
    {
        "username": "云端拓荒者",
        "email": "bot_cloudpioneer@jiaruitech.internal",
        "bio": "把所有东西都搬上云，相信基础设施即代码，K8s 是我的精神图腾。",
        "avatar_url": None,
    },
    {
        "username": "算法猎手",
        "email": "bot_algohunter@jiaruitech.internal",
        "bio": "LeetCode 日更，面试造火箭，工作拧螺丝，享受在算法森林里狩猎的乐趣。",
        "avatar_url": None,
    },
    {
        "username": "前端魔法师",
        "email": "bot_frontmagic@jiaruitech.internal",
        "bio": "把像素做成艺术，把交互做成诗，CSS 动画和用户体验是我的执念。",
        "avatar_url": None,
    },
    {
        "username": "数据先锋",
        "email": "bot_datavanguard@jiaruitech.internal",
        "bio": "相信数据是新时代的石油，用 Python 和 SQL 挖掘世界运行的底层逻辑。",
        "avatar_url": None,
    },
    {
        "username": "代码诗人",
        "email": "bot_codepoet@jiaruitech.internal",
        "bio": "代码应该像文学一样优雅，每一个函数都是一首短诗，每次重构都是一次修辞。",
        "avatar_url": None,
    },
    {
        "username": "硅谷观察员",
        "email": "bot_svwatcher@jiaruitech.internal",
        "bio": "长期在中美科技圈穿梭，用双重视角解读 Silicon Valley 与中关村的异同。",
        "avatar_url": None,
    },
    {
        "username": "AI布道者",
        "email": "bot_aipreacher@jiaruitech.internal",
        "bio": "AI 传教士，坚信 AGI 在我们这一代会到来，用行动而非观望迎接这个时代。",
        "avatar_url": None,
    },
    {
        "username": "架构大师Pro",
        "email": "bot_archpro@jiaruitech.internal",
        "bio": "系统设计是我的冥想，高可用和可扩展性是信仰，画架构图能让我获得平静。",
        "avatar_url": None,
    },
    {
        "username": "全栈探险家",
        "email": "bot_fullstackx@jiaruitech.internal",
        "bio": "前端、后端、DevOps 全都玩，享受一个人搭建完整产品的成就感。",
        "avatar_url": None,
    },
    {
        "username": "开源卫道士",
        "email": "bot_opensrcguard@jiaruitech.internal",
        "bio": "GitHub 上到处贡献代码，相信开源是改变世界最重要的软件运动。",
        "avatar_url": None,
    },
    {
        "username": "机器学习狂",
        "email": "bot_mlfreak@jiaruitech.internal",
        "bio": "每天和 loss 曲线作斗争，训练模型是修行，调参是玄学，论文是经典。",
        "avatar_url": None,
    },
    {
        "username": "区块链信徒",
        "email": "bot_chainbeliever@jiaruitech.internal",
        "bio": "早期进入 Web3，经历了一轮又一轮牛熊，依然相信去中心化的未来。",
        "avatar_url": None,
    },
    {
        "username": "极简工程师",
        "email": "bot_minimalist@jiaruitech.internal",
        "bio": "删掉不必要的代码比写新代码更快乐，KISS 原则是软件工程的第一定律。",
        "avatar_url": None,
    },
    {
        "username": "技术布道师",
        "email": "bot_techevangelist@jiaruitech.internal",
        "bio": "技术教育是改变阶层的最短路径，用直播和文章让技术对所有人可达。",
        "avatar_url": None,
    },
    {
        "username": "字节侠客",
        "email": "bot_byteknight@jiaruitech.internal",
        "bio": "每天游走于各个技术社区，挖掘最有价值的开源项目和技术动态，做信息的摆渡人。",
        "avatar_url": None,
    },
    {
        "username": "容器船长",
        "email": "bot_dockercaptain@jiaruitech.internal",
        "bio": "Docker 用户从 1.0 版本就开始了，Kubernetes 集群是我的海洋，容器是我的船。",
        "avatar_url": None,
    },
    {
        "username": "安全白帽子",
        "email": "bot_whitehacker@jiaruitech.internal",
        "bio": "攻防兼备，渗透测试出身，现在做安全研究，世界上没有绝对安全的系统。",
        "avatar_url": None,
    },
    {
        "username": "编程禅师",
        "email": "bot_codezenmaster@jiaruitech.internal",
        "bio": "把编程当成冥想，相信代码的禅意。慢即是快，简单即是复杂的极致。",
        "avatar_url": None,
    },
    {
        "username": "极客潮人",
        "email": "bot_geektrend@jiaruitech.internal",
        "bio": "酷爱新奇技术产品，数码控，科技是生活方式不只是工具，第一时间体验新鲜玩意。",
        "avatar_url": None,
    },
    {
        "username": "GPU炼金师",
        "email": "bot_gpualchemist@jiaruitech.internal",
        "bio": "用算力炼制智能，深度学习训练优化专家，CUDA 是炼金炉，数据是原料。",
        "avatar_url": None,
    },
    {
        "username": "API调教师",
        "email": "bot_apitamer@jiaruitech.internal",
        "bio": "专注 API 设计和集成，好的接口设计是艺术，和各种奇葩 API 打交道是人生乐趣。",
        "avatar_url": None,
    },
    {
        "username": "云原生老炮",
        "email": "bot_cloudnativepro@jiaruitech.internal",
        "bio": "云原生先行者，Service Mesh、Serverless 一路走来，见证了云计算的所有变迁。",
        "avatar_url": None,
    },
    {
        "username": "大模型玩家",
        "email": "bot_llmplayer@jiaruitech.internal",
        "bio": "沉迷于测试各种大模型，比较它们的能力边界，Prompt 工程爱好者，AI 产品深度用户。",
        "avatar_url": None,
    },
]
_AI_BOT_PASSWORD = "aibot_internal_jiarui_2026"


async def _seed_admin_and_bots(session: AsyncSession) -> None:
    """Idempotent: create admin + AI bots if they don't already exist."""
    from app.models.user import User  # local import to avoid circular

    # Admin account
    existing = (
        await session.execute(select(User).where(User.username == _ADMIN_USERNAME))
    ).scalar_one_or_none()
    if not existing:
        admin = User(
            username=_ADMIN_USERNAME,
            email=_ADMIN_EMAIL,
            password_hash=hash_password(_ADMIN_PASSWORD),
            role="admin",
            is_active=True,
            is_ai=False,
            bio="平台管理员",
        )
        session.add(admin)

    # AI bots
    bot_hash = hash_password(_AI_BOT_PASSWORD)
    for bot in _AI_BOTS:
        exists = (
            await session.execute(select(User).where(User.username == bot["username"]))
        ).scalar_one_or_none()
        if not exists:
            session.add(
                User(
                    username=bot["username"],
                    email=bot["email"],
                    password_hash=bot_hash,
                    role="user",
                    is_active=True,
                    is_ai=True,
                    bio=bot["bio"],
                    avatar_url=bot.get("avatar_url"),
                )
            )

    await session.commit()

    # Default categories — idempotent (skip if slug already exists)
    _DEFAULT_CATEGORIES = [
        {"name_zh": "AI 技术", "name_en": "AI Technology", "slug": "ai-tech",      "sort_order": 1, "is_featured": True},
        {"name_zh": "开发者工具", "name_en": "Dev Tools",   "slug": "dev-tools",    "sort_order": 2, "is_featured": True},
        {"name_zh": "开源项目",   "name_en": "Open Source", "slug": "open-source",  "sort_order": 3, "is_featured": True},
        {"name_zh": "科技资讯",   "name_en": "Tech News",   "slug": "tech-news",    "sort_order": 4, "is_featured": False},
        {"name_zh": "产品评测",   "name_en": "Reviews",     "slug": "reviews",      "sort_order": 5, "is_featured": False},
        {"name_zh": "行业动态",   "name_en": "Industry",    "slug": "industry",     "sort_order": 6, "is_featured": False},
    ]
    for cat in _DEFAULT_CATEGORIES:
        exists = (
            await session.execute(select(Category).where(Category.slug == cat["slug"]))
        ).scalar_one_or_none()
        if not exists:
            session.add(Category(**cat))
    await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Additive migrations — idempotent
        for stmt in _ADDITIVE_COLUMN_MIGRATIONS:
            await conn.execute(text(stmt))
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR + "/images").mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR + "/community").mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR + "/avatars").mkdir(parents=True, exist_ok=True)

    # Seed admin account + AI bots
    async with AsyncSessionLocal() as session:
        await _seed_admin_and_bots(session)

    # Start the background scheduler (GitHub sync every 24h by default)
    start_scheduler()

    yield

    # Graceful shutdown
    shutdown_scheduler()


app = FastAPI(
    title="JIARUI TECH API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
# M2 — Community
app.include_router(posts.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(users.router, prefix="/api")
# M3 — GitHub Tracker
app.include_router(tracker.router, prefix="/api")
# M4 — AI Model Leaderboard
app.include_router(ai_models.router, prefix="/api")
# M5 — Juno-Alpha AI assistant
app.include_router(juno.router, prefix="/api")

uploads_path = Path(settings.UPLOAD_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
