#!/usr/bin/env python3
import logging
import time

from mimosa_state import Status, render_pipeline_state, format_duration

log = logging.getLogger(__name__)


def run_stage(
    pipeline_state,
    profile,
    stage,
    fn,
    *args,
    count=0,
    **kwargs,
):
    entry = pipeline_state[profile][stage]
    entry["status"] = Status.RUNNING
    entry["started_at"] = time.monotonic()

    log.info(f"[{profile}] {stage} — starting...")
    render_pipeline_state(pipeline_state)

    try:
        result = fn(*args, **kwargs)

        entry["status"] = Status.DONE
        if count:
            entry["count"] = count

        end = time.monotonic()
        entry["finished_at"] = end
        entry["duration"] = end - entry["started_at"]

        log.info(f"[{profile}] {stage} — done ({format_duration(entry['duration'])})")
        render_pipeline_state(pipeline_state)
        return result

    except Exception:
        entry["status"] = Status.FAILED

        end = time.monotonic()
        entry["finished_at"] = end
        entry["duration"] = end - entry["started_at"]

        log.error(f"[{profile}] {stage} — failed")
        render_pipeline_state(pipeline_state)
        raise
