"""
Article processor — downloads a URL via httpx (browser headers) then calls Claude twice:
  1. rewrite()       — bilingual rewrite (ZH + EN title + body)
  2. deep_analysis() — three-paragraph analysis (ZH + EN)

"Learning guide" module intentionally excluded per product spec.
"""
from __future__ import annotations

import asyncio
import re

import httpx
import trafilatura

from app.core.config import settings

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"

_CLAUDE_TIMEOUT = httpx.Timeout(connect=15.0, read=240.0, write=15.0, pool=5.0)
_FETCH_TIMEOUT  = httpx.Timeout(connect=15.0, read=30.0,  write=10.0, pool=5.0)

# Full browser-like headers — avoids "bot" blocks that trafilatura.fetch_url triggers
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Connection": "keep-alive",
}


# ─── helpers ──────────────────────────────────────────────────────────────────

def _split(raw: str, key: str) -> str:
    m = re.search(rf"==={key}===\s*(.+?)(?=\n===[A-Z_]+===|\Z)", raw, re.DOTALL)
    if not m:
        raise RuntimeError(f"AI 返回格式异常，找不到 ==={key}=== 段落")
    return m.group(1).strip()


def _extract(html: str) -> tuple[str, str]:
    """Pure HTML → (title, body) extraction. CPU-only, no I/O."""
    meta = trafilatura.extract_metadata(html)
    title = (meta.title if meta and meta.title else "").strip()

    body = trafilatura.extract(
        html, include_comments=False, include_tables=False, favor_precision=True
    )
    if not body or len(body.strip()) < 100:
        body = trafilatura.extract(
            html, include_comments=False, include_tables=False
        )
    if not body or len(body.strip()) < 100:
        body = trafilatura.extract(
            html, include_comments=False, include_tables=False, favor_recall=True
        )
    if not title and body:
        title = body.strip().splitlines()[0][:60]
    return title or "", (body or "").strip()


async def _claude(system: str, user: str, max_tokens: int) -> str:
    if not settings.CLAUDE_API_KEY:
        raise RuntimeError("CLAUDE_API_KEY 未配置，请在 backend/.env 中填入")
    payload = {
        "model": settings.CLAUDE_MODEL,
        "system": system,
        "messages": [{"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    headers = {
        "x-api-key": settings.CLAUDE_API_KEY,
        "anthropic-version": _ANTHROPIC_VERSION,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=_CLAUDE_TIMEOUT) as client:
        resp = await client.post(_ANTHROPIC_URL, json=payload, headers=headers)
    if resp.status_code != 200:
        raise RuntimeError(f"Claude API 错误 ({resp.status_code}): {resp.text[:300]}")
    data = resp.json()
    return "".join(
        b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"
    ).strip()


# ─── step 1: download + extract (fully native async, no thread wrapping) ──────

async def _fetch_and_extract(url: str) -> tuple[str, str]:
    """
    Strategy 1: httpx.AsyncClient with browser headers (native async — no thread needed).
    Strategy 2: trafilatura.fetch_url via run_in_executor (blocking I/O off the event loop).
    Both strategies feed into the same three-pass trafilatura extraction.
    """
    # ── Strategy 1: native async httpx ───────────────────────────────────
    raw_html: str | None = None
    for verify_ssl in (True, False):
        try:
            async with httpx.AsyncClient(
                timeout=_FETCH_TIMEOUT,
                follow_redirects=True,
                verify=verify_ssl,
                headers=_BROWSER_HEADERS,
            ) as client:
                resp = await client.get(url)

            if resp.status_code == 403:
                raise RuntimeError(
                    "网站拒绝访问（403 Forbidden），该页面可能需要登录或设有反爬限制"
                )
            if resp.status_code == 404:
                raise RuntimeError("页面不存在（404 Not Found），请检查链接是否正确")
            if resp.status_code >= 400:
                raise RuntimeError(f"网站返回 HTTP {resp.status_code}，无法获取页面内容")

            raw_html = resp.text
            break

        except RuntimeError:
            raise
        except (httpx.ConnectError, httpx.RemoteProtocolError):
            if verify_ssl:
                continue  # retry without SSL
            break
        except Exception:
            break

    if raw_html:
        title, body = _extract(raw_html)
        if body and len(body) >= 50:
            return title, body

    # ── Strategy 2: trafilatura.fetch_url in executor (identical to desktop app) ──
    loop = asyncio.get_running_loop()
    downloaded: str | None = await loop.run_in_executor(None, trafilatura.fetch_url, url)
    if downloaded:
        title, body = _extract(downloaded)
        if body and len(body) >= 50:
            return title, body

    raise RuntimeError(
        "正文提取失败（该页面正文可能由 JS 动态渲染 / 付费墙 / 严重反爬）。\n"
        "建议改用 36kr、虎嗅、量子位、TechCrunch、The Verge 等标准新闻站。"
    )


# ─── step 2: rewrite ───────────────────────────────────────────────────────────

async def _rewrite(raw_title: str, raw_body: str) -> dict[str, str]:
    system = (
        "You are a top-tier tech-media chief editor AND a professional content writer. "
        "你是顶级科技新媒体主编兼内容创作者。以自己的语言传递信息，表达自然有力，不照抄原文措辞。"
    )
    user = f"""请一次性完成 4 项任务，输出中英双语版本。

【任务 1：中文新标题】吸睛、有科技感、新媒体风格，**严格 ≤30 汉字**。
【任务 2：中文重新表达正文】**用自己的语言重新创作**，完整传递原文所有信息与观点，**篇幅不得缩减**。
  - 不得直接复制原文措辞，须以自己的表达方式重新组织语言
  - 必须按内容逻辑自动分段：每段围绕一个子主题/事实点，2–4 句为宜
  - 段落之间用一个空行分隔（Markdown 标准分段）

【任务 3：English Title】Concise, punchy, ≤12 words.
【任务 4：English Body】Rewrite in your own words, same paragraph structure as Chinese.

严格按以下格式输出（不要加代码块标记、不要前言、不要总结）：

===ZH_TITLE===
<中文新标题>

===ZH_BODY===
<用自己语言重新表达并按逻辑分段的中文正文，段落间空一行>

===EN_TITLE===
<English title>

===EN_BODY===
<English body rewritten in own words, paragraphed to match Chinese>

---
原标题：{raw_title}

原正文：
{raw_body}
"""
    out = await _claude(system, user, max_tokens=6000)
    return {
        "zh_title": _split(out, "ZH_TITLE").strip("《》\"'"),
        "zh_body": _split(out, "ZH_BODY"),
        "en_title": _split(out, "EN_TITLE").strip("\"'"),
        "en_body": _split(out, "EN_BODY"),
    }


# ─── step 3: deep analysis only (no learning guide) ───────────────────────────

async def _deep_analysis(zh_title: str, zh_body: str) -> tuple[str, str]:
    system = "你是资深科技行业分析师兼内容创作者，擅长从多维视角解读新闻事件的深远影响。"
    user = f"""针对以下文章撰写【深度解读】，严格按三段结构输出，每段独立成段，段落间空一行：

**第一段：文章总结**
简明概括文章的核心内容与关键事实（3–4 句），让读者快速了解事件全貌。

**第二段：中国视角**
结合中国的国情、市场环境、用户群体、政策背景、产业发展现状，深入探讨此事件对中国的意义与影响。

**第三段：全球视角**
结合全球科技趋势、国际竞争格局、世界市场动态，分析此事件在全球层面的影响与未来走向。

【中文版】三段结构如上，每段 3–5 句，观点具体、避免空话。
【English version】Same three-section structure, same depth, natural professional English.

严格按以下格式输出（不要加代码块）：

===ZH===
<中文深度解读，三段，段落间空一行>

===EN===
<English deep analysis, three paragraphs>

---
标题：{zh_title}

正文：
{zh_body}
"""
    out = await _claude(system, user, max_tokens=3000)
    return _split(out, "ZH"), _split(out, "EN")


# ─── public entry point ────────────────────────────────────────────────────────

async def process_url(url: str) -> dict[str, str]:
    """
    Full pipeline: download → extract → rewrite → deep_analysis.
    Returns keys: title_zh, title_en, content_zh, content_en,
                  deep_analysis_zh, deep_analysis_en
    """
    raw_title, raw_body = await _fetch_and_extract(url)
    rewritten = await _rewrite(raw_title, raw_body)
    analysis_zh, analysis_en = await _deep_analysis(
        rewritten["zh_title"], rewritten["zh_body"]
    )
    return {
        "title_zh": rewritten["zh_title"],
        "title_en": rewritten["en_title"],
        "content_zh": rewritten["zh_body"],
        "content_en": rewritten["en_body"],
        "deep_analysis_zh": analysis_zh,
        "deep_analysis_en": analysis_en,
    }
