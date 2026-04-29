"""
AI Content Generation Service
Generates community posts using the LLM, distributed across 4 topic categories:
  50 % — AI & Tech hotspot news
  25 % — Developer project guides / tutorials
  15 % — Entertainment (TV / movies / books)
  10 % — Life & fun moments

Bot accounts are selected round-robin based on their affinity to the topic.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.models.user import User
from app.services.llm import LLMError, complete_chat
from app.utils.uid import generate_post_uid

_log = logging.getLogger("ai_content")

# ── Topic weights (must sum to 100) ────────────────────────────────────
_TOPIC_WEIGHTS = [
    ("ai_tech",       25),
    ("dev_guide",     25),
    ("entertainment", 25),
    ("life_fun",      25),
]
_TOPICS, _WEIGHTS = zip(*_TOPIC_WEIGHTS)

# ── Bot → topic affinity ────────────────────────────────────────────────
_BOT_AFFINITY: dict[str, list[str]] = {
    "极客晓明":   ["ai_tech"],
    "码农阿杰":   ["dev_guide"],
    "文青小雨":   ["entertainment"],
    "暖暖日记":   ["life_fun"],
    "科技前沿君": ["ai_tech"],
    "量子码农":   ["dev_guide", "ai_tech"],
    "深度技术宅": ["dev_guide"],
    "云端拓荒者": ["dev_guide"],
    "算法猎手":   ["dev_guide", "ai_tech"],
    "前端魔法师": ["dev_guide"],
    "数据先锋":   ["ai_tech", "dev_guide"],
    "代码诗人":   ["dev_guide", "life_fun"],
    "硅谷观察员": ["ai_tech", "entertainment"],
    "AI布道者":   ["ai_tech"],
    "架构大师Pro": ["dev_guide"],
    "全栈探险家": ["dev_guide"],
    "开源卫道士": ["dev_guide", "ai_tech"],
    "机器学习狂": ["ai_tech"],
    "区块链信徒": ["life_fun", "entertainment"],
    "极简工程师": ["dev_guide", "life_fun"],
    "技术布道师": ["entertainment", "ai_tech"],
    "字节侠客":   ["entertainment", "ai_tech"],
    "容器船长":   ["dev_guide"],
    "安全白帽子": ["dev_guide", "life_fun"],
    "编程禅师":   ["life_fun", "dev_guide"],
    "极客潮人":   ["entertainment", "ai_tech"],
    "GPU炼金师":  ["ai_tech"],
    "API调教师":  ["dev_guide"],
    "云原生老炮": ["dev_guide"],
    "大模型玩家": ["ai_tech", "entertainment"],
}

# ── Title style hints — randomly chosen each call to maximise variety ──
# The system prompt instructs the LLM to write the title on line 1.
# These styles guide *how* that title is phrased.
_TITLE_STYLES = [
    "标题用【数字+结论】形式，例如：「5个让你...翻倍的方法」「3件...的事」",
    "标题用【反问/疑问句】形式，激发读者好奇心，例如：「你真的了解...吗？」",
    "标题用【对比+反转】形式，例如：「不是...，而是...」「别再...了，试试...」",
    "标题用【悬念+省略】形式，让读者忍不住点进来，例如：「我用...之后，彻底改变了...」",
    "标题用【痛点共鸣】形式，直击目标读者痛点，例如：「每个...都应该知道的...」",
    "标题用【结论前置+冲击力】形式，直接说出最惊人的观点，简短有力",
    "标题用【时效热点】形式，强调最新动态，例如：「2025年...的终极指南」「刚刚...」",
    "标题用【场景代入】形式，让读者觉得说的就是自己，例如：「当你...的时候，...」",
    "标题用【情绪感染】形式，带有强烈的个人观点或情感，例如：「我终于明白了...」",
    "标题用【干货承诺】形式，明确告诉读者能得到什么，例如：「...完整攻略，收藏备用」",
]

# ── Formatting templates injected into body prompts ────────────────────
_FORMAT_STYLES = [
    "正文用 2-3 个小节（## 小节名）组织，每节 2-3 段，层次清晰。",
    "正文用无序列表（- 开头）列出 5-7 个核心要点，每点后附 1-2 句说明。",
    "正文写成流畅散文，3-4 自然段，娓娓道来，不加标题。",
    "正文先写一段引言（关键词加粗），再用有序列表（1. 2. 3.）呈现核心内容。",
    "正文用 Q&A 问答形式，提出 3 个读者最想知道的问题并逐一深入回答。",
    "正文先给出一个「结论」段落，再用 2-3 段详细展开论据，最后一句话收尾点题。",
]

# ─────────────────────────────────────────────────────────────────────────────
#  Per-topic subject pools — kept large to minimise repetition
# ─────────────────────────────────────────────────────────────────────────────

_SUBJECTS_AI_TECH = [
    "大语言模型的能力边界正在被如何突破",
    "多模态 AI 已经能做到哪些令人惊讶的事",
    "开源 vs 闭源：2025 年 AI 模型的真实竞争格局",
    "AI Agent 正在悄悄改变我们的工作方式",
    "Reasoning 模型（o3、DeepSeek-R2）最新进展盘点",
    "AI 在医疗诊断中的突破：比医生更准确了吗",
    "GPU 算力成本暴跌对 AI 普及意味着什么",
    "国产大模型与 GPT-4o 的差距究竟还有多大",
    "RAG 技术为什么正在取代传统搜索",
    "AI 写代码已经达到什么水平：真实测评报告",
    "向量数据库的崛起：AI 时代的新基础设施",
    "提示工程（Prompt Engineering）还值得学吗",
    "AI 幻觉问题何时才能真正解决",
    "小模型的逆袭：SLM 凭什么挑战 GPT",
    "端侧 AI 爆发：手机里的大模型能做什么",
    "AI 视频生成已经卷到哪种程度了",
    "为什么越来越多的企业开始自建 AI 基础设施",
    "AI 安全对齐：比技术突破更重要的挑战",
    "Function Calling 让 AI 真正学会了用工具",
    "Text-to-SQL 如何让非技术人员也能玩转数据",
    "2025 年最值得关注的 10 个 AI 开源项目",
    "从 ChatGPT 到 Claude：AI 助手的进化史",
    "AI 正在重塑哪些你意想不到的传统行业",
    "知识图谱 + LLM：下一代 AI 的技术路线",
]

_SUBJECTS_DEV_GUIDE = [
    "一个让 Python 开发效率翻倍的开源神器",
    "Next.js 15 App Router 最佳实践：我踩过的那些坑",
    "Docker + GitHub Actions：零基础自动化部署教程",
    "FastAPI 异步开发的 10 个实战技巧",
    "PostgreSQL 慢查询优化：从 10s 到 100ms 的全过程",
    "Tailwind CSS 4.0 新特性：写样式变得前所未有的爽",
    "Git 高级用法：让你的提交记录像诗一样优雅",
    "本地跑 LLaMA 3 全攻略：Ollama 一键部署",
    "TypeScript 5.x 最香的新特性，你用上了吗",
    "Redis 缓存设计模式：5 种场景的最优解",
    "前端性能优化：让首屏加载快到用户感知不到",
    "用 Cursor AI 写代码：真实效率提升有多少",
    "Monorepo 实战：pnpm workspace 管理大型项目",
    "WebSocket vs SSE：实时通信该怎么选",
    "SQLAlchemy 2.0 异步 ORM：彻底告别同步阻塞",
    "k8s 入门不再痛苦：用 minikube 本地实战",
    "5 个你可能不知道的 VS Code 神级插件",
    "Pydantic v2 迁移指南：性能提升 5-50 倍",
    "GitHub Copilot 真实使用 3 个月：诚实评价",
    "用 Python 写爬虫在 2025 年还靠谱吗",
    "tRPC + Next.js：全类型安全的全栈开发体验",
    "Bun vs Node.js：JavaScript 运行时的新格局",
    "数据库选型指南：PostgreSQL / MySQL / MongoDB 怎么选",
    "CI/CD 流水线搭建：从提交代码到线上发布只需 3 分钟",
]

_SUBJECTS_ENTERTAINMENT = [
    "2025 年最值得二刷的科幻电影，你看了几部",
    "改变了我认知方式的 3 本书，每本都值得反复读",
    "被严重低估的宝藏剧：豆瓣 8.5 分却无人在聊",
    "2025 年最震撼的纪录片，看完久久无法平静",
    "关于 AI 与人类未来的 5 本必读科幻小说",
    "周末解压首选：这 5 部喜剧让我笑到头疼",
    "新海诚 vs 宫崎骏：两种截然不同的动画哲学",
    "一部让你重新思考「时间」的电影",
    "今年读过最好的一本书，没有之一",
    "为什么现在的国产剧越来越好看了",
    "漫威疲劳症：超级英雄电影还有救吗",
    "最近迷上的一部小众播客，推荐给所有人",
    "《三体》影视化的遗憾与惊喜：冷静复盘",
    "游戏比电影更能讲故事吗：《最后生还者》的启示",
    "音乐是怎么治愈我的：一份深夜歌单",
    "读完《人类简史》之后我改变了哪些看法",
    "那些年追过的动漫里，哪句台词还留在心里",
    "黑色幽默电影推荐：笑着笑着就哭了",
    "日剧的慢节奏为什么反而让人上瘾",
    "如果你只能推荐一本书给20岁的年轻人",
]

_SUBJECTS_LIFE_FUN = [
    "一个改变我早晨状态的微小习惯",
    "和 AI 对话 100 天之后，我学到了一件意外的事",
    "独居生活的 5 个让自己开心的仪式感",
    "当程序员开始认真做饭：一次厨房里的顿悟",
    "深夜 12 点，我在想什么",
    "今天发生了一件特别小但让我很开心的事",
    "比努力更重要的事：我学会了好好休息",
    "放下手机的一个周末，我过得怎么样",
    "为什么我开始喜欢散步了",
    "一个人去电影院是什么体验",
    "我是怎么戒掉刷短视频的",
    "租房五年，我终于把出租屋住出了家的感觉",
    "今年我删掉了哪些 App，生活反而更好了",
    "摸鱼的艺术：高质量发呆指南",
    "给自己写了一封信，三年后再拆开",
    "养了一株绿植之后，我变了什么",
    "第一次一个人旅行，比想象中更勇敢",
    "咖啡 vs 茶：一个转变了我的生活习惯的选择",
    "睡前不刷手机的第 30 天：意外的收获",
    "如果可以给过去的自己一个建议",
]


def _build_prompt(topic: str) -> tuple[str, str, list[str]]:
    """Return (system_prompt, user_prompt, tags) for the given topic.

    The system prompt always instructs the LLM to put an eye-catching,
    unique title on the very first line (no # prefix), followed by a blank
    line, then the body.  A randomly chosen _TITLE_STYLES hint drives
    variety across calls.
    """
    fmt        = random.choice(_FORMAT_STYLES)
    title_hint = random.choice(_TITLE_STYLES)

    # Common title instruction appended to every system prompt
    title_instruction = (
        f"【标题规则】回复的第一行必须是帖子标题，"
        f"长度 10-28 字，不加任何 # 号或「标题：」等前缀，直接是标题文字。"
        f"{title_hint}。"
        f"第二行留空，第三行起才是正文。每次标题都要独一无二、有吸引力，绝不能用千篇一律的套话。"
    )

    if topic == "ai_tech":
        tags = random.sample(
            ["大模型", "AI资讯", "科技前沿", "机器学习", "深度学习", "AIGC", "AGI", "AI工具", "技术趋势"],
            k=random.randint(2, 4),
        )
        system = (
            "你是一位科技媒体编辑，专注于 AI 与科技前沿。"
            "写作风格：专业、简洁、有洞察力，适合科技从业者和爱好者阅读。"
            f"语言：中文。正文字数：400-600 字。{title_instruction}"
        )
        subject = random.choice(_SUBJECTS_AI_TECH)
        user = f"请写一篇关于「{subject}」的科技资讯帖子。{fmt}"

    elif topic == "dev_guide":
        tags = random.sample(
            ["工具推荐", "开源项目", "教程", "前端", "后端", "Python", "DevOps", "AI学术", "效率提升", "实战经验"],
            k=random.randint(2, 4),
        )
        system = (
            "你是一位经验丰富的软件工程师，热衷于分享实用开发技巧。"
            "写作风格：实战导向，可以包含代码示例（用反引号包裹），通俗易懂。"
            f"语言：中文。正文字数：400-600 字。{title_instruction}"
        )
        subject = random.choice(_SUBJECTS_DEV_GUIDE)
        user = f"请写一篇关于「{subject}」的开发者干货帖子。{fmt}"

    elif topic == "entertainment":
        tags = random.sample(
            ["影视推荐", "书单", "好剧推荐", "科幻", "纪录片", "动漫", "文学", "游戏", "音乐"],
            k=random.randint(2, 3),
        )
        system = (
            "你是一位品味独特的文化评论者，热爱电影、电视剧、书籍和音乐。"
            "写作风格：有温度、有个人观点，带一点文艺气息，不做书单式罗列。"
            f"语言：中文。正文字数：350-550 字。{title_instruction}"
        )
        subject = random.choice(_SUBJECTS_ENTERTAINMENT)
        user = f"请写一篇关于「{subject}」的文化推荐帖子，融入你真实的感受和观点。{fmt}"

    else:  # life_fun
        tags = random.sample(
            ["随笔", "生活趣事", "情感", "日常", "分享", "成长", "自律", "治愈"],
            k=random.randint(2, 3),
        )
        system = (
            "你是一位有趣的生活观察者，喜欢分享日常的小发现和感悟。"
            "写作风格：轻松幽默，接地气，有亲切感，像在跟朋友聊天，带点真实的生活细节。"
            f"语言：中文。正文字数：300-450 字。{title_instruction}"
        )
        subject = random.choice(_SUBJECTS_LIFE_FUN)
        user = f"请写一篇关于「{subject}」的生活随笔，写出真实感和细节。{fmt}"

    return system, user, tags


def _extract_title(content: str, topic: str) -> str:
    """Pull the title from line 1; strip Markdown heading markers.

    The LLM is instructed to place the title on line 1 with no prefix.
    We still handle the case where it uses `#` / `**` / `「」` markers.
    """
    first_line = content.split("\n")[0].strip()

    # Strip Markdown heading markers (# ## ###)
    first_line = first_line.lstrip("#").strip()

    # Strip bold markers (**title**)
    if first_line.startswith("**") and first_line.endswith("**") and len(first_line) > 4:
        first_line = first_line[2:-2].strip()

    # Strip Chinese title prefix if LLM still added it
    for prefix in ("标题：", "标题:", "Title:", "title:", "【标题】"):
        if first_line.startswith(prefix):
            first_line = first_line[len(prefix):].strip()
            break

    # Accept if reasonable length
    if 4 <= len(first_line) <= 60:
        return first_line

    # Fallback — use subject pool defaults
    defaults = {
        "ai_tech":       "AI 前沿速递",
        "dev_guide":     "开发者实战分享",
        "entertainment": "值得一看的好内容",
        "life_fun":      "生活小分享",
    }
    return defaults.get(topic, "今日分享")


async def generate_ai_post(
    db: AsyncSession,
    *,
    topic: str | None = None,
    bot_username: str | None = None,
) -> Post | None:
    """
    Generate one AI community post and commit it independently.

    Each call gets its own commit/rollback so a failure never affects
    other posts in a batch — no shared dirty session state.

    Returns:
        The committed + refreshed Post (all attrs accessible), or None on error.
    """
    try:
        chosen_topic = topic or random.choices(_TOPICS, weights=_WEIGHTS, k=1)[0]

        # ── Pick bot ────────────────────────────────────────────────────────
        if bot_username:
            bot_q = await db.execute(
                select(User).where(User.username == bot_username, User.is_ai == True)  # noqa: E712
            )
            bot = bot_q.scalar_one_or_none()
        else:
            affinities = [u for u, topics in _BOT_AFFINITY.items() if chosen_topic in topics]
            candidate_name = (
                random.choice(affinities) if affinities
                else random.choice(list(_BOT_AFFINITY.keys()))
            )
            bot_q = await db.execute(
                select(User).where(User.username == candidate_name, User.is_ai == True)  # noqa: E712
            )
            bot = bot_q.scalar_one_or_none()

        if not bot:
            _log.warning("AI bot not found (topic=%s) — re-seed the DB", chosen_topic)
            return None

        # ── Call LLM ────────────────────────────────────────────────────────
        system_prompt, user_prompt, tags = _build_prompt(chosen_topic)
        raw = await complete_chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.9,
            max_tokens=900,
        )

        if not raw:
            _log.warning("LLM returned empty content for topic %s", chosen_topic)
            return None

        # ── Build title + body ──────────────────────────────────────────────
        title = _extract_title(raw, chosen_topic)
        lines = raw.split("\n")
        first = lines[0].strip().lstrip("#").strip()
        if first == title or first.replace("**", "").strip() == title:
            rest = lines[1:]
            while rest and rest[0].strip() == "":
                rest = rest[1:]
            content = "\n".join(rest).strip()
        else:
            content = raw.strip()

        if not content:
            _log.warning("Post body empty after title strip, skipping")
            return None

        # ── Dedup title ─────────────────────────────────────────────────────
        if (await db.execute(select(Post.id).where(Post.title == title))).scalar_one_or_none():
            title += random.choice(["（续）", "（二）", "（新）", "（深度）", "（2025）"])

        # ── Generate unique UID ─────────────────────────────────────────────
        uid = generate_post_uid()
        for _ in range(5):
            if not (await db.execute(select(Post.id).where(Post.post_uid == uid))).scalar_one_or_none():
                break
            uid = generate_post_uid()

        # ── Insert + commit (each post is its own transaction) ──────────────
        post = Post(
            post_uid=uid,
            author_id=bot.id,
            title=title,
            content=content,
            tags=tags,
            status="published",
        )
        db.add(post)
        await db.commit()
        # Refresh so all attributes are eagerly loaded (avoids MissingGreenlet
        # when the caller accesses post.post_uid after session expiry)
        await db.refresh(post)

        _log.info("AI post created: uid=%s topic=%s bot=%s title=%r",
                  uid, chosen_topic, bot.username, title)
        return post

    except Exception as e:
        _log.error("generate_ai_post failed: %s: %s", type(e).__name__, e)
        # Rollback only the current (uncommitted) transaction; already-committed
        # posts from earlier iterations are unaffected.
        try:
            await db.rollback()
        except Exception:
            pass
        return None


async def bulk_generate_ai_posts(db: AsyncSession, count: int = 10) -> list[Post]:
    """Generate `count` posts spread across topic weights.

    Each post is committed individually, so partial failures don't roll
    back the whole batch.
    """
    created: list[Post] = []
    for _ in range(count):
        post = await generate_ai_post(db)
        if post:
            created.append(post)
    # No final commit needed — each generate_ai_post already committed.
    return created
