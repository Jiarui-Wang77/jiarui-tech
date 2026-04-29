"""
Run once to seed the database with default categories, an admin user,
and an initial batch of tracked AI repositories.

Usage:  python seed.py
Add  --with-repos  to ALSO hit GitHub for fresh repo data (requires network).
"""

import asyncio
import sys
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.ai_model import AIModel, ModelScore
from app.models.category import Category
from app.models.repository import Repository
from app.models.user import User
from app.services.tracker_sync import sync_one_repo
from app.utils.model_scoring import compute_overall_score

DEFAULT_CATEGORIES = [
    {"name_zh": "科技", "name_en": "Tech", "slug": "tech", "sort_order": 1},
    {"name_zh": "金融", "name_en": "Finance", "slug": "finance", "sort_order": 2},
    {"name_zh": "AI", "name_en": "AI", "slug": "ai", "sort_order": 3, "is_featured": True},
    {"name_zh": "生活", "name_en": "Lifestyle", "slug": "life", "sort_order": 4},
    {"name_zh": "产品", "name_en": "Product", "slug": "product", "sort_order": 5},
]

ADMIN_USER = {
    "username": "admin",
    "email": "admin@jiarui.tech",
    "password": "Admin@123456",
    "role": "admin",
    "is_active": True,
    "is_verified": True,
}

# ── Curated tracker seed — well-known AI/LLM repos ────────────────────
# Stats here are *placeholders* — real values are fetched on first sync.
# We just need the full_name so sync_one_repo can hit GitHub.
TRACKED_REPOS = [
    # Foundation models & LLM infra
    "ggerganov/llama.cpp",
    "vllm-project/vllm",
    "huggingface/transformers",
    "pytorch/pytorch",
    "openai/openai-python",
    "anthropics/anthropic-sdk-python",
    # LLM app / agent frameworks
    "langchain-ai/langchain",
    "run-llama/llama_index",
    "microsoft/autogen",
    "crewAIInc/crewAI",
    # Vector / RAG
    "chroma-core/chroma",
    "weaviate/weaviate",
    "qdrant/qdrant",
    # Dev tools / IDEs
    "continuedev/continue",
    "cline/cline",
    "All-Hands-AI/OpenHands",
    # UI / Chat
    "vercel/ai",
    "lobehub/lobe-chat",
    # Training / fine-tuning
    "hiyouga/LLaMA-Factory",
    "unslothai/unsloth",
]

# Offline fallback — if sync fails (no network / rate-limited),
# populate with static placeholder rows so the UI isn't empty.
OFFLINE_PLACEHOLDERS = [
    {
        "full_name": fn,
        "owner": fn.split("/")[0],
        "name": fn.split("/")[1],
        "description": None,
        "html_url": f"https://github.com/{fn}",
        "stars_count": 0,
        "topics": [],
    }
    for fn in TRACKED_REPOS
]


# ══════════════════════════════════════════════════════════════════════
# M4 — AI Models seed
# ══════════════════════════════════════════════════════════════════════
# Scores reflect mid-2026 industry benchmarks (proprietary composite).
AI_MODELS_SEED = [
    {
        "slug": "gpt-5",
        "name": "GPT-5",
        "vendor": "OpenAI",
        "logo_url": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/openai.svg",
        "brand_color": "#10a37f",
        "description_zh": "OpenAI 新一代旗舰模型，原生多模态 + 超长上下文，推理能力领先。",
        "description_en": "OpenAI's flagship — native multimodal, ultra-long context, leading reasoning.",
        "context_window": 400000,
        "price_input_per_1m": 2.5,
        "price_output_per_1m": 10.0,
        "official_url": "https://openai.com",
        "sort_order": 100,
        "scores": [
            {"domain": "coding", "score": 96, "breakdown": {"code_gen": 97, "debugging": 95, "architecture": 96}},
            {"domain": "academic", "score": 94, "breakdown": {"research": 94, "literature": 93, "reasoning": 95}},
            {"domain": "office", "score": 93, "breakdown": {"writing": 94, "charts": 92, "communication": 93}},
            {"domain": "lifestyle", "score": 88, "breakdown": {"planning": 89, "gaming": 85, "casual": 90}},
        ],
    },
    {
        "slug": "claude-sonnet-4-6",
        "name": "Claude Sonnet 4.6",
        "vendor": "Anthropic",
        "brand_color": "#cc785c",
        "description_zh": "Anthropic 安全对齐旗舰，代码与学术能力业内顶尖，长文档处理出色。",
        "description_en": "Anthropic's safe & aligned flagship — best-in-class code & academic, long-doc mastery.",
        "context_window": 500000,
        "price_input_per_1m": 3.0,
        "price_output_per_1m": 15.0,
        "official_url": "https://anthropic.com",
        "sort_order": 95,
        "scores": [
            {"domain": "coding", "score": 95, "breakdown": {"code_gen": 94, "debugging": 96, "architecture": 95}},
            {"domain": "academic", "score": 96, "breakdown": {"research": 95, "literature": 97, "reasoning": 96}},
            {"domain": "office", "score": 94, "breakdown": {"writing": 96, "charts": 92, "communication": 94}},
            {"domain": "lifestyle", "score": 89, "breakdown": {"planning": 91, "gaming": 85, "casual": 91}},
        ],
    },
    {
        "slug": "gemini-ultra-2",
        "name": "Gemini Ultra 2",
        "vendor": "Google",
        "brand_color": "#4285f4",
        "description_zh": "Google 超大规模多模态模型，原生支持视频，推理链路强劲。",
        "description_en": "Google's multimodal powerhouse — native video, powerful reasoning chains.",
        "context_window": 2000000,
        "price_input_per_1m": 1.25,
        "price_output_per_1m": 5.0,
        "official_url": "https://gemini.google.com",
        "sort_order": 90,
        "scores": [
            {"domain": "coding", "score": 91, "breakdown": {"code_gen": 90, "debugging": 92, "architecture": 91}},
            {"domain": "academic", "score": 93, "breakdown": {"research": 93, "literature": 92, "reasoning": 94}},
            {"domain": "office", "score": 90, "breakdown": {"writing": 89, "charts": 93, "communication": 88}},
            {"domain": "lifestyle", "score": 85, "breakdown": {"planning": 87, "gaming": 82, "casual": 86}},
        ],
    },
    {
        "slug": "grok-4",
        "name": "Grok 4",
        "vendor": "xAI",
        "brand_color": "#1d9bf0",
        "description_zh": "xAI 实时数据模型，接入 X 平台信息流，幽默感与时效性拉满。",
        "description_en": "xAI's real-time model wired to X — unmatched currency & personality.",
        "context_window": 256000,
        "price_input_per_1m": 5.0,
        "price_output_per_1m": 15.0,
        "official_url": "https://x.ai",
        "sort_order": 80,
        "scores": [
            {"domain": "coding", "score": 87, "breakdown": {"code_gen": 86, "debugging": 88, "architecture": 87}},
            {"domain": "academic", "score": 82, "breakdown": {"research": 81, "literature": 80, "reasoning": 85}},
            {"domain": "office", "score": 85, "breakdown": {"writing": 84, "charts": 85, "communication": 86}},
            {"domain": "lifestyle", "score": 84, "breakdown": {"planning": 83, "gaming": 86, "casual": 83}},
        ],
    },
    {
        "slug": "llama-3-3",
        "name": "Llama 3.3",
        "vendor": "Meta",
        "brand_color": "#7c3aed",
        "description_zh": "Meta 开源权重旗舰，405B 参数版本性能接近闭源顶级，可自托管。",
        "description_en": "Meta's open-weight flagship — 405B variant rivals closed-source, self-hostable.",
        "context_window": 128000,
        "price_input_per_1m": None,
        "price_output_per_1m": None,
        "official_url": "https://llama.meta.com",
        "sort_order": 70,
        "scores": [
            {"domain": "coding", "score": 82, "breakdown": {"code_gen": 83, "debugging": 81, "architecture": 82}},
            {"domain": "academic", "score": 84, "breakdown": {"research": 84, "literature": 83, "reasoning": 85}},
            {"domain": "office", "score": 81, "breakdown": {"writing": 80, "charts": 79, "communication": 82}},
            {"domain": "lifestyle", "score": 80, "breakdown": {"planning": 80, "gaming": 79, "casual": 81}},
        ],
    },
    {
        "slug": "mistral-large-3",
        "name": "Mistral Large 3",
        "vendor": "Mistral",
        "brand_color": "#f59e0b",
        "description_zh": "法国 Mistral AI 欧洲旗舰，推理性价比出色，合规友好。",
        "description_en": "France's Mistral AI — strong reasoning, excellent value, GDPR-friendly.",
        "context_window": 128000,
        "price_input_per_1m": 2.0,
        "price_output_per_1m": 6.0,
        "official_url": "https://mistral.ai",
        "sort_order": 60,
        "scores": [
            {"domain": "coding", "score": 79, "breakdown": {"code_gen": 80, "debugging": 78, "architecture": 79}},
            {"domain": "academic", "score": 80, "breakdown": {"research": 79, "literature": 81, "reasoning": 80}},
            {"domain": "office", "score": 83, "breakdown": {"writing": 84, "charts": 81, "communication": 84}},
            {"domain": "lifestyle", "score": 78, "breakdown": {"planning": 79, "gaming": 76, "casual": 78}},
        ],
    },
    {
        "slug": "deepseek-v3",
        "name": "DeepSeek V3",
        "vendor": "DeepSeek",
        "brand_color": "#1e40af",
        "description_zh": "深度求索 V3，671B 专家混合模型，代码与数学推理惊艳，极致性价比。",
        "description_en": "DeepSeek V3 — 671B MoE with stellar coding & math, unbeatable price-performance.",
        "context_window": 128000,
        "price_input_per_1m": 0.27,
        "price_output_per_1m": 1.10,
        "official_url": "https://deepseek.com",
        "sort_order": 65,
        "scores": [
            {"domain": "coding", "score": 89, "breakdown": {"code_gen": 90, "debugging": 88, "architecture": 89}},
            {"domain": "academic", "score": 85, "breakdown": {"research": 83, "literature": 82, "reasoning": 90}},
            {"domain": "office", "score": 80, "breakdown": {"writing": 79, "charts": 81, "communication": 80}},
            {"domain": "lifestyle", "score": 75, "breakdown": {"planning": 76, "gaming": 73, "casual": 76}},
        ],
    },
    {
        "slug": "qwen-3",
        "name": "Qwen 3",
        "vendor": "Alibaba",
        "brand_color": "#615cff",
        "description_zh": "阿里通义千问 3 代，中文原生最强，多模态完整，开源生态繁荣。",
        "description_en": "Alibaba's Qwen 3 — best-in-class Chinese, full multimodal, thriving OSS ecosystem.",
        "context_window": 256000,
        "price_input_per_1m": 0.5,
        "price_output_per_1m": 2.0,
        "official_url": "https://tongyi.aliyun.com",
        "sort_order": 55,
        "scores": [
            {"domain": "coding", "score": 86, "breakdown": {"code_gen": 85, "debugging": 86, "architecture": 87}},
            {"domain": "academic", "score": 83, "breakdown": {"research": 82, "literature": 85, "reasoning": 82}},
            {"domain": "office", "score": 82, "breakdown": {"writing": 83, "charts": 80, "communication": 83}},
            {"domain": "lifestyle", "score": 76, "breakdown": {"planning": 77, "gaming": 74, "casual": 77}},
        ],
    },
]


async def seed():
    with_repos = "--with-repos" in sys.argv

    async with AsyncSessionLocal() as db:
        # ── Categories ───────────────────────────────────────────────
        print("📂 Seeding categories...")
        for cat_data in DEFAULT_CATEGORIES:
            existing = await db.execute(
                select(Category).where(Category.slug == cat_data["slug"])
            )
            if not existing.scalar_one_or_none():
                db.add(Category(**cat_data))
                print(f"  + {cat_data['name_zh']}")
            else:
                print(f"  = {cat_data['name_zh']} (exists)")

        # ── Admin user ───────────────────────────────────────────────
        print("\n👤 Seeding admin user...")
        existing_admin = await db.execute(
            select(User).where(User.email == ADMIN_USER["email"])
        )
        if not existing_admin.scalar_one_or_none():
            admin = User(
                username=ADMIN_USER["username"],
                email=ADMIN_USER["email"],
                password_hash=hash_password(ADMIN_USER["password"]),
                role=ADMIN_USER["role"],
                is_active=ADMIN_USER["is_active"],
                is_verified=ADMIN_USER["is_verified"],
            )
            db.add(admin)
            print(f"  + {ADMIN_USER['email']} / {ADMIN_USER['password']}")
        else:
            print("  = admin user (exists)")

        await db.commit()

        # ── Tracker repos ────────────────────────────────────────────
        print(f"\n🐙 Seeding {len(TRACKED_REPOS)} tracked repos...")
        if with_repos:
            print("  Mode: fetching live data from GitHub API")
            for full_name in TRACKED_REPOS:
                try:
                    repo = await sync_one_repo(db, full_name)
                    if repo:
                        print(f"  ✓ {full_name}  ⭐ {repo.stars_count}  🐎 {repo.horse_score}")
                    else:
                        print(f"  ✗ {full_name}  (not found / rate-limited)")
                except Exception as e:  # noqa: BLE001 — log & keep going
                    print(f"  ! {full_name}  → {e}")
                await db.commit()
        else:
            print("  Mode: offline placeholder rows (pass --with-repos to fetch live)")
            for p in OFFLINE_PLACEHOLDERS:
                existing = await db.execute(
                    select(Repository).where(Repository.full_name == p["full_name"])
                )
                if not existing.scalar_one_or_none():
                    db.add(Repository(
                        **p,
                        forks_count=0,
                        open_issues_count=0,
                        watchers_count=0,
                        stars_24h=0,
                        stars_7d=0,
                        horse_score=0.0,
                        is_tracked=True,
                        first_seen_at=datetime.now(timezone.utc),
                        last_synced_at=datetime.now(timezone.utc),
                    ))
                    print(f"  + {p['full_name']}")
                else:
                    print(f"  = {p['full_name']} (exists)")
            await db.commit()

        # ── AI Models (M4) ──────────────────────────────────────────
        print(f"\n🤖 Seeding {len(AI_MODELS_SEED)} AI models...")
        for m_data in AI_MODELS_SEED:
            slug = m_data["slug"]
            existing = await db.execute(select(AIModel).where(AIModel.slug == slug))
            existing_model = existing.scalar_one_or_none()
            if existing_model:
                print(f"  = {slug} (exists, skipping)")
                continue

            scores_data = m_data.pop("scores")
            model = AIModel(**m_data)
            db.add(model)
            await db.flush()

            # Insert scores
            score_map: dict[str, float] = {}
            for s in scores_data:
                db.add(ModelScore(
                    model_id=model.id,
                    domain=s["domain"],
                    score=s["score"],
                    breakdown=s.get("breakdown") or {},
                ))
                score_map[s["domain"]] = s["score"]

            # Compute overall
            model.overall_score = compute_overall_score(
                scores_by_domain=score_map,
                community_rating=0.0,
                votes_count=0,
            )
            await db.commit()
            print(f"  + {slug}  🏆 overall={model.overall_score}")

        print("\n✅ Seed complete.")
        if not with_repos:
            print("\nNext: log in as admin and hit POST /api/tracker/admin/sync-all")
            print("      (or re-run: python seed.py --with-repos)")


if __name__ == "__main__":
    asyncio.run(seed())
