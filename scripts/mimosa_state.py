#!/usr/bin/env python3
import os
from enum import Enum


class Status(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    SKIPPED = "skipped"
    FAILED = "failed"


PIPELINE_STAGES = [
    "fetch_samples",
    "prepare_metadata",
    "run_reportree",
    "process_features",
    "upload_features",
    "upload_clustering",
    "upload_distance",
    "run_similarity",
    "upload_similarity",
]


PROFILE_DISPLAY_PIPELINE = [
    ("Sample preparation", ["fetch_samples", "prepare_metadata"]),
    ("ReporTree analysis", ["run_reportree"]),
    ("Prepare results", ["process_features"]),
    (
        "Upload results",
        [
            "upload_features",
            "upload_clustering",
            "upload_distance",
        ],
    ),
]


GLOBAL_DISPLAY_PIPELINE = [
    ("Similarity analysis", ["run_similarity"]),
    ("Upload similarity", ["upload_similarity"]),
]


UPLOAD_LABELS = {
    "upload_features": "features",
    "upload_clustering": "clustering",
    "upload_distance": "distance",
}


_STATUS_ORDER = {
    Status.FAILED: 4,
    Status.RUNNING: 3,
    Status.PENDING: 2,
    Status.DONE: 1,
    Status.SKIPPED: 0,
}


GLOBAL_PROFILE = "__global__"


def init_pipeline_state(profiles):
    return {
        profile: {
            stage: {
                "status": Status.PENDING,
                "count": 0,
                "done": 0,
                "total": 0,
                "started_at": None,
                "finished_at": None,
                "duration": None,
            }
            for stage in PIPELINE_STAGES
        }
        for profile in profiles
    }


def _aggregate_status(stages):
    return max(
        (s["status"] for s in stages),
        key=lambda s: _STATUS_ORDER[s],
    )


def _aggregate_progress(stages):
    done = sum(s.get("done", 0) for s in stages)
    total = sum(s.get("total", 0) for s in stages)
    return done, total


def _sum_duration(stages):
    return sum(s["duration"] or 0 for s in stages)


def format_duration(seconds):
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, seconds = divmod(int(seconds), 60)
    return f"{minutes}m {seconds}s"


LABEL_WIDTH = 26


def render_pipeline_state(state):
    os.system("clear")

    print("MIMOSA\n")

    for profile, stages in state.items():
        if profile == GLOBAL_PROFILE:
            continue

        sample_count = stages["fetch_samples"]["count"]
        if sample_count:
            print(f"{profile} ({sample_count} samples)")
        else:
            print(profile)

        for label, internal in PROFILE_DISPLAY_PIPELINE:
            entries = [stages[s] for s in internal]
            status = _aggregate_status(entries).value

            if label == "Upload results":
                print(f"  {label:<{LABEL_WIDTH}}{status}")

                for stage in internal:
                    entry = stages[stage]
                    artefact = UPLOAD_LABELS.get(stage, stage)
                    print(
                        f"    - {artefact:<{LABEL_WIDTH-4}}" f"{entry['status'].value}"
                    )
            else:
                print(f"  {label:<{LABEL_WIDTH}}{status}")

        print()

    global_state = state.get(GLOBAL_PROFILE)
    if global_state:
        similarity_stages = (
            global_state["run_similarity"],
            global_state["upload_similarity"],
        )

        if all(s["status"] == Status.SKIPPED for s in similarity_stages):
            print("Similarity skipped\n")
            return

        print("Similarity")

        for label, internal in GLOBAL_DISPLAY_PIPELINE:
            entries = [global_state[s] for s in internal]
            status = _aggregate_status(entries).value

            if label == "Similarity analysis":
                done, total = _aggregate_progress(entries)
                suffix = f" ({done}/{total})" if total else ""
                print(f"  {label:<{LABEL_WIDTH}}" f"{status}{suffix}")
            else:
                print(f"  {label:<{LABEL_WIDTH}}" f"{status}")

        print()


def render_runtime_summary(state):
    print("\nRuntime summary\n")

    total_run_time = 0.0

    for profile, stages in state.items():
        if profile == GLOBAL_PROFILE:
            continue

        duration = _sum_duration(stages.values())
        total_run_time += duration

        print(f"{profile:<{LABEL_WIDTH}}" f"{format_duration(duration)}")

    global_state = state.get(GLOBAL_PROFILE)
    if global_state:
        similarity_stages = (
            global_state["run_similarity"],
            global_state["upload_similarity"],
        )

        if any(s["status"] == Status.DONE for s in similarity_stages):
            similarity_time = _sum_duration(similarity_stages)
            total_run_time += similarity_time

            print(
                f"{'Similarity':<{LABEL_WIDTH}}" f"{format_duration(similarity_time)}"
            )

    print(f"\n{'Total':<{LABEL_WIDTH}}" f"{format_duration(total_run_time)}")
