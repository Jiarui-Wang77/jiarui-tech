"""
Dual-provider LLM client:

  stream_chat_completion  →  DeepSeek  (OpenAI-compatible, used by Juno chat)
  complete_chat           →  Anthropic Claude  (used by AI post generation)

DeepSeek gives real-time conversational responses for Juno.
Claude generates fresh, up-to-date community post content.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator

import httpx

from app.core.config import settings

_log = logging.getLogger("llm")


class LLMError(Exception):
    """Raised on any LLM-side failure (network, API, rate-limit, auth)."""


# ═══════════════════════════════════════════════════════════════════════════════
#  PROVIDER 1 — DeepSeek  (OpenAI-compatible streaming, for Juno chat)
# ═══════════════════════════════════════════════════════════════════════════════

async def stream_chat_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int = 1500,
) -> AsyncGenerator[str, None]:
    """Yield content deltas as they arrive from DeepSeek (Juno chat).

    Args:
        messages: [{"role": "system"|"user"|"assistant", "content": "..."}]
        temperature: 0.0 – 1.0
        max_tokens: upper bound on response length

    Yields:
        Individual string chunks (the delta text to append).

    Raises:
        LLMError: if the provider returns non-2xx or streaming fails.
    """
    if not settings.LLM_API_KEY:
        raise LLMError("LLM_API_KEY not configured. Add it to backend/.env")

    url = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model":       settings.LLM_MODEL,
        "messages":    messages,
        "temperature": temperature,
        "max_tokens":  max_tokens,
        "stream":      True,
    }
    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type":  "application/json",
        "Accept":        "text/event-stream",
    }
    timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=5.0)
    _MAX_RETRIES = 2

    for attempt in range(_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", url, json=payload, headers=headers) as resp:

                    if resp.status_code == 429:
                        if attempt < _MAX_RETRIES:
                            wait = 2.0 * (attempt + 1)
                            _log.warning(
                                "DeepSeek rate-limited (429), retrying in %.0fs (attempt %d/%d)",
                                wait, attempt + 1, _MAX_RETRIES,
                            )
                            await asyncio.sleep(wait)
                            continue
                        raise LLMError("API 请求频率超限（429），请稍等片刻再发送消息")

                    if resp.status_code != 200:
                        body = await resp.aread()
                        _log.error("DeepSeek error %d: %s", resp.status_code, body[:500])
                        raise LLMError(
                            f"Provider returned {resp.status_code}: "
                            f"{body.decode('utf-8', errors='replace')[:300]}"
                        )

                    async for line in resp.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data_str = line[len("data:"):].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            event = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        choices = event.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta") or {}
                        content = delta.get("content")
                        if content:
                            yield content

                        finish = choices[0].get("finish_reason")
                        if finish and finish != "null":
                            break

                    return  # streaming done

        except LLMError:
            raise
        except httpx.ReadTimeout as e:
            raise LLMError("LLM 响应超时（120s），请重试") from e
        except httpx.ConnectTimeout as e:
            raise LLMError("无法连接到 AI 服务（连接超时），请检查网络") from e
        except httpx.HTTPError as e:
            raise LLMError(f"网络错误：{e}") from e


# ═══════════════════════════════════════════════════════════════════════════════
#  PROVIDER 2 — Anthropic Claude  (non-streaming, for AI post generation)
# ═══════════════════════════════════════════════════════════════════════════════

_ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"


def _build_claude_payload(
    messages: list[dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
) -> tuple[dict, dict[str, str]]:
    """Build Anthropic Messages API payload + headers.

    Extracts the first system message (if any) into the top-level
    "system" field; all other messages stay in "messages".
    """
    system: str | None = None
    user_msgs: list[dict] = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
        else:
            user_msgs.append({"role": m["role"], "content": m["content"]})

    payload: dict = {
        "model":       settings.CLAUDE_MODEL,
        "messages":    user_msgs,
        "temperature": temperature,
        "max_tokens":  max_tokens,
    }
    if system:
        payload["system"] = system

    headers = {
        "x-api-key":         settings.CLAUDE_API_KEY,
        "anthropic-version": _ANTHROPIC_VERSION,
        "Content-Type":      "application/json",
    }
    return payload, headers


async def complete_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int = 800,
) -> str:
    """Non-streaming Claude request — used for AI community post generation.

    Args:
        messages:    [{"role": "system"|"user"|"assistant", "content": "..."}]
        temperature: 0.0 – 1.0
        max_tokens:  upper bound on response length

    Returns:
        The assistant message text as a plain string.

    Raises:
        LLMError: on any network or API error.
    """
    if not settings.CLAUDE_API_KEY:
        raise LLMError("CLAUDE_API_KEY not configured. Add it to backend/.env")

    payload, headers = _build_claude_payload(
        messages, temperature=temperature, max_tokens=max_tokens
    )
    timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=5.0)
    _MAX_RETRIES = 2

    for attempt in range(_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(_ANTHROPIC_URL, json=payload, headers=headers)

            if resp.status_code == 429:
                if attempt < _MAX_RETRIES:
                    wait = 2.0 * (attempt + 1)
                    _log.warning(
                        "Claude rate-limited (429), retrying in %.0fs (attempt %d/%d)",
                        wait, attempt + 1, _MAX_RETRIES,
                    )
                    await asyncio.sleep(wait)
                    continue
                raise LLMError("Claude API 请求频率超限（429），请稍后重试")

            if resp.status_code != 200:
                _log.error("Claude API error %d: %s", resp.status_code, resp.text[:500])
                raise LLMError(
                    f"Claude returned {resp.status_code}: {resp.text[:300]}"
                )

            data = resp.json()
            # Anthropic response: {"content": [{"type": "text", "text": "..."}]}
            content_blocks = data.get("content", [])
            text = "".join(
                block.get("text", "")
                for block in content_blocks
                if block.get("type") == "text"
            )
            return text.strip()

        except LLMError:
            raise
        except httpx.TimeoutException as e:
            raise LLMError("Claude 响应超时，请重试") from e
        except httpx.HTTPError as e:
            raise LLMError(f"网络错误：{e}") from e

    raise LLMError("超过最大重试次数")


# ═══════════════════════════════════════════════════════════════════════════════
#  Title generation (pure string, no LLM call)
# ═══════════════════════════════════════════════════════════════════════════════

_STRIP_PREFIXES_ZH = ["请帮我", "帮帮我", "帮我", "请问一下", "请问", "你好，", "嗨，", "hi，"]
_STRIP_PREFIXES_EN = ["please help me ", "please ", "can you ", "could you ", "hey, ", "hi, "]


def generate_title(user_message: str) -> str:
    """Generate a short conversation title from the first user message.

    Pure string operation — instant, no I/O, no LLM call.
    """
    text = user_message.strip().replace("\n", " ").replace("\r", " ")

    for prefix in _STRIP_PREFIXES_ZH:
        if text.startswith(prefix):
            text = text[len(prefix):].lstrip(" ，,")
            break

    lower = text.lower()
    for prefix in _STRIP_PREFIXES_EN:
        if lower.startswith(prefix):
            text = text[len(prefix):].lstrip()
            if text and text[0].isalpha():
                text = text[0].upper() + text[1:]
            break

    max_len = 28
    if len(text) > max_len:
        cut = text[:max_len]
        for sep in ("，", "。", "？", "！", ",", ".", "?", "!", " "):
            idx = cut.rfind(sep)
            if idx > max_len // 2:
                cut = cut[:idx]
                break
        return cut.rstrip() + "…"

    return text or user_message[:20].strip()
