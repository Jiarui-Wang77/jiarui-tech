"""
GitHub REST API client for the tracker.

Uses httpx (async, already a dep). Optional auth via GITHUB_TOKEN env var —
unauthenticated = 60 req/hr, authenticated = 5000 req/hr.

No 3rd-party lib needed — we only need ~3 endpoints.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings

_GH_API = "https://api.github.com"
_UA = "JIARUI-TECH-Tracker/1.0"


class GitHubFetchError(Exception):
    """Raised when GitHub API returns a non-404 error (rate limit, network, etc.)."""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _headers() -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "User-Agent": _UA,
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = settings.GITHUB_TOKEN
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


async def fetch_repo(full_name: str) -> dict[str, Any] | None:
    """GET /repos/{owner}/{repo}.
    Returns None on 404 (repo not found).
    Raises GitHubFetchError for rate-limit (403/429) or network failures.
    """
    url = f"{_GH_API}/repos/{full_name}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, headers=_headers())
            if r.status_code == 404:
                return None
            if r.status_code in (403, 429):
                raise GitHubFetchError(
                    429,
                    "GitHub API rate limit exceeded — set GITHUB_TOKEN in .env for 5000 req/hr",
                )
            r.raise_for_status()
            return r.json()
    except GitHubFetchError:
        raise
    except httpx.HTTPError as e:
        raise GitHubFetchError(502, f"GitHub API unreachable: {e}")


async def fetch_repo_topics(full_name: str) -> list[str]:
    """GET /repos/{owner}/{repo}/topics (returned via main endpoint too, but extra insurance)."""
    url = f"{_GH_API}/repos/{full_name}/topics"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, headers=_headers())
            r.raise_for_status()
            data = r.json()
            return list(data.get("names", []))
    except httpx.HTTPError:
        return []


async def search_trending_ai(min_stars: int = 500, per_page: int = 30) -> list[dict[str, Any]]:
    """Search for AI-related repos with momentum.

    GitHub's search API supports: topic:xxx, stars:>N, pushed:>YYYY-MM-DD, etc.
    We use "topic:ai OR topic:llm OR topic:machine-learning" and sort by stars
    descending among recently pushed.
    """
    url = f"{_GH_API}/search/repositories"
    # Recent push → weeds out abandoned repos
    query = (
        f"(topic:llm OR topic:ai OR topic:machine-learning OR topic:deep-learning OR topic:transformers) "
        f"stars:>{min_stars} pushed:>2024-01-01"
    )
    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": min(per_page, 100),
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, headers=_headers(), params=params)
            r.raise_for_status()
            return list(r.json().get("items", []))
    except httpx.HTTPError:
        return []


def parse_gh_datetime(s: str | None) -> datetime | None:
    """Parse GitHub's ISO8601 timestamp (e.g. '2024-01-20T12:34:56Z')."""
    if not s:
        return None
    try:
        # datetime.fromisoformat handles '+00:00' but not 'Z' in <3.11 — replace.
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def extract_repo_fields(gh_data: dict[str, Any]) -> dict[str, Any]:
    """Map GitHub's JSON → our Repository column dict."""
    owner_obj = gh_data.get("owner") or {}
    return {
        "full_name": gh_data["full_name"],
        "owner": owner_obj.get("login", gh_data["full_name"].split("/")[0]),
        "name": gh_data.get("name", gh_data["full_name"].split("/")[-1]),
        "description": (gh_data.get("description") or "")[:4000] or None,
        "html_url": gh_data.get("html_url") or f"https://github.com/{gh_data['full_name']}",
        "homepage": gh_data.get("homepage") or None,
        "language": gh_data.get("language") or None,
        "topics": list(gh_data.get("topics") or []),
        "owner_avatar_url": owner_obj.get("avatar_url") or None,
        "stars_count": int(gh_data.get("stargazers_count") or 0),
        "forks_count": int(gh_data.get("forks_count") or 0),
        "open_issues_count": int(gh_data.get("open_issues_count") or 0),
        "watchers_count": int(gh_data.get("watchers_count") or 0),
        "gh_created_at": parse_gh_datetime(gh_data.get("created_at")),
        "gh_pushed_at": parse_gh_datetime(gh_data.get("pushed_at")),
    }
