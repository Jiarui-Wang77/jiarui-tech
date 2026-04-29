"""
Background scheduler for recurring tasks.

Uses APScheduler's AsyncIOScheduler — runs inside the uvicorn event loop,
no extra process needed. Survives code reloads (APScheduler handles signals).

Current jobs:
  - tracker_sync: fetch fresh GitHub data for all tracked repos (default: every 24h)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import AsyncSessionLocal
from app.services.tracker_sync import sync_all_tracked

_log = logging.getLogger("scheduler")
_log.setLevel(logging.INFO)

scheduler = AsyncIOScheduler()


async def scheduled_tracker_sync() -> None:
    """Periodic job: pull fresh GitHub data for every tracked repo."""
    _log.info("[tracker_sync] starting scheduled sync…")
    try:
        async with AsyncSessionLocal() as db:
            try:
                result = await sync_all_tracked(db)
                await db.commit()
                _log.info("[tracker_sync] done: %s", result)
            except Exception:
                await db.rollback()
                raise
    except Exception as e:  # noqa: BLE001 — scheduler must not crash the app
        _log.exception("[tracker_sync] failed: %s", e)


def start_scheduler() -> None:
    """Attach jobs and start the scheduler. Called once from the lifespan."""
    if scheduler.running:
        return  # idempotent

    # Opt-out via env var if someone wants to disable it
    if os.getenv("TRACKER_SYNC_ENABLED", "true").lower() not in ("true", "1", "yes"):
        _log.info("[scheduler] tracker sync disabled via TRACKER_SYNC_ENABLED")
        scheduler.start()
        return

    interval_hours = float(os.getenv("TRACKER_SYNC_INTERVAL_HOURS", "24"))

    # First run 5 minutes after startup (let the app settle, give admin time to seed)
    first_run = datetime.now() + timedelta(minutes=5)

    scheduler.add_job(
        scheduled_tracker_sync,
        trigger=IntervalTrigger(hours=interval_hours),
        id="tracker_sync",
        name="GitHub tracker periodic sync",
        replace_existing=True,
        max_instances=1,           # never overlap — if a run is slow, skip the next
        coalesce=True,              # if multiple missed, collapse to one
        misfire_grace_time=3600,    # 1h grace for missed fires (e.g. laptop sleep)
        next_run_time=first_run,
    )

    scheduler.start()
    _log.info(
        "[scheduler] started — tracker sync every %sh, first run at %s",
        interval_hours,
        first_run.isoformat(timespec="minutes"),
    )


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        _log.info("[scheduler] stopped")
