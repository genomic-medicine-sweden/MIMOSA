#!/usr/bin/env python3
import logging
import os
import sys
from pathlib import Path

_configured = False


def configure_logging():
    global _configured
    if _configured:
        return
    _configured = True

    log_path_env = os.getenv("MIMOSA_LOG_PATH")
    if log_path_env:
        log_path = Path(log_path_env)
    else:
        project_root = Path(__file__).resolve().parent.parent
        log_path = project_root / ".mimosa.log"

    log_path.parent.mkdir(parents=True, exist_ok=True)

    fmt = logging.Formatter(
        "%(asctime)s %(levelname)-5s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    try:
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setFormatter(fmt)
        root.addHandler(file_handler)
    except (PermissionError, OSError) as exc:
        print(
            f"WARNING: cannot write to log file {log_path}: {exc}",
            file=sys.stderr,
            flush=True,
        )

    if not sys.stdin.isatty():
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(fmt)
        root.addHandler(stream_handler)
