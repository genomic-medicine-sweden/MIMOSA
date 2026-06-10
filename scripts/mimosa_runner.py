#!/usr/bin/env python3
import logging
import time

from mimosa_state import Status, render_pipeline_state, format_duration
from log_setup import configure_logging

configure_logging()
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

    render_pipeline_state(pipeline_state)

    try:
        result = fn(*args, **kwargs)

        entry["status"] = Status.DONE
        if count:
            entry["count"] = count

        end = time.monotonic()
        entry["finished_at"] = end
        entry["duration"] = end - entry["started_at"]

        done_msg = f"profile={profile} step={stage} status=complete duration={format_duration(entry['duration'])}"
        if count:
            done_msg += f" samples={count}"
        log.info(done_msg)
        render_pipeline_state(pipeline_state)
        return result

    except KeyboardInterrupt:
        end = time.monotonic()
        entry["status"] = Status.FAILED
        entry["finished_at"] = end
        entry["duration"] = end - entry["started_at"]
        log.warning(
            f"profile={profile} step={stage} status=interrupted duration={format_duration(entry['duration'])}"
        )
        render_pipeline_state(pipeline_state)
        raise

    except Exception:
        end = time.monotonic()
        entry["status"] = Status.FAILED
        entry["finished_at"] = end
        entry["duration"] = end - entry["started_at"]
        log.error(
            f"profile={profile} step={stage} status=failed duration={format_duration(entry['duration'])}"
        )
        render_pipeline_state(pipeline_state)
        raise
