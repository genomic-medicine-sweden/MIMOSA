#!/usr/bin/env python3
"""
Container entrypoint: fix log file ownership as root, then drop to the
automation user (UID 1000) before execing the main process.
"""

import os
import pwd
import sys


def main():
    log_path = os.environ.get("MIMOSA_LOG_PATH")
    if log_path:
        try:
            with open(log_path, "a"):
                pass
            os.chown(log_path, 1000, 1000)
        except OSError:
            pass

    try:
        pw = pwd.getpwnam("automation")
        os.setgid(pw.pw_gid)
        os.setuid(pw.pw_uid)
    except (KeyError, PermissionError):
        pass

    args = sys.argv[1:] or ["python", "automation.py"]
    os.execvp(args[0], args)


main()
