#!/usr/bin/env python3
import argparse
import difflib
import os

from constants import AVAILABLE_PROFILES


def parse_exclusions(values):
    """
    Return a set of IDs from an inline list or a file path.
    """
    if not values:
        return set()
    if len(values) == 1 and os.path.isfile(values[0]):
        ids = set()
        with open(values[0], newline="", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                ids.add(line.split(",")[0].strip())
        return ids
    return set(values)


def parse_bool(value):
    if isinstance(value, bool):
        return value

    value = str(value).strip().lower()
    if value == "true":
        return True
    if value == "false":
        return False
    raise argparse.ArgumentTypeError("Expected true or false.")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Process sample data, run ReporTree, and upload results to MIMOSA."
    )

    parser.add_argument("--credentials", required=False, default=None)
    parser.add_argument("--profile", required=False, nargs="+", default=None)
    parser.add_argument("--groups", required=False, nargs="+", default=None)
    parser.add_argument("--output", required=False)
    parser.add_argument("--save_files", action="store_true")
    parser.add_argument("--supplementary_metadata", required=False, default=None)
    parser.add_argument(
        "--bonsai",
        required=False,
        type=parse_bool,
        default=True,
        help="Whether to fetch samples from Bonsai. Defaults to true.",
    )
    parser.add_argument(
        "--chewbbaca",
        required=False,
        action="append",
        default=None,
        metavar="PATH",
        help="Local chewBBACA TSV, directory, or CSV manifest. Can be repeated for multiple inputs.",
    )
    parser.add_argument(
        "--chewbbaca_profile",
        required=False,
        action="append",
        default=None,
        metavar="PROFILE",
        help="Analysis profile for the corresponding --chewbbaca input.",
    )

    parser.add_argument("--update-only", action="store_true")
    parser.add_argument("--run-similarity", action="store_true")
    parser.add_argument(
        "--re-cluster",
        action="store_true",
        help="Force clustering even if no new samples are detected.",
    )
    parser.add_argument("--debug", action="store_true")
    parser.add_argument(
        "--email",
        nargs="?",
        const="",
        default=None,
        metavar="ADDRESS",
        help="Send a failure alert email on errors. Without a value, sends to the authenticated user. With a value, sends to that address.",
    )
    parser.add_argument(
        "--exclude-samples",
        required=False,
        nargs="+",
        default=None,
        metavar="ID_OR_FILE",
        help="Sample IDs to exclude, or path to a file with one ID per line.",
    )
    parser.add_argument(
        "--exclude-groups",
        required=False,
        nargs="+",
        default=None,
        metavar="ID_OR_FILE",
        help="Group IDs to exclude, or path to a file with one ID per line.",
    )
    parser.add_argument(
        "--delete-samples",
        required=False,
        nargs="+",
        default=None,
        metavar="SAMPLE_ID",
        help="Delete the specified sample IDs from MIMOSA (features + allele profiles), then optionally re-run the pipeline.",
    )

    args = parser.parse_args()

    if args.save_files and not args.output:
        parser.error("--save_files requires --output")

    if args.profile is None and args.groups is None:
        target_profiles = AVAILABLE_PROFILES
    elif args.profile is None:
        target_profiles = AVAILABLE_PROFILES
    elif any(x.lower() == "all" for x in args.profile):
        target_profiles = AVAILABLE_PROFILES
    else:
        requested = [x.lower() for x in args.profile]
        target_profiles = [p for p in AVAILABLE_PROFILES if p in requested]

    if not target_profiles:
        lines = []
        for p in args.profile or []:
            close = difflib.get_close_matches(p.lower(), AVAILABLE_PROFILES, n=1)
            if close:
                lines.append(f"Invalid profile '{p}', did you mean '{close[0]}'?")
            else:
                lines.append(
                    f"Invalid profile '{p}'. "
                    f"Available profiles: {', '.join(AVAILABLE_PROFILES)}"
                )
        raise SystemExit(
            "\n".join(lines)
            if lines
            else f"No valid profiles selected. Available profiles: {', '.join(AVAILABLE_PROFILES)}"
        )

    # Pair each --chewbbaca path with its analysis profile.
    if args.chewbbaca:
        chewbbaca_paths = args.chewbbaca
        profile_args = args.chewbbaca_profile or []

        if not profile_args:
            if len(target_profiles) == 1:
                profile_args = [target_profiles[0]] * len(chewbbaca_paths)
            else:
                parser.error(
                    "--chewbbaca requires --chewbbaca_profile when --profile "
                    "is not a single profile"
                )
        elif len(profile_args) == 1:
            profile_args = profile_args * len(chewbbaca_paths)
        elif len(profile_args) != len(chewbbaca_paths):
            parser.error(
                f"--chewbbaca_profile count ({len(profile_args)}) must match "
                f"--chewbbaca count ({len(chewbbaca_paths)}), or be 1"
            )

        available_lower = {p.lower(): p for p in AVAILABLE_PROFILES}
        resolved = []
        for p in profile_args:
            canonical = available_lower.get(p.lower())
            if canonical is None:
                close = difflib.get_close_matches(p.lower(), AVAILABLE_PROFILES, n=1)
                if close:
                    parser.error(f"Invalid profile '{p}', did you mean '{close[0]}'?")
                else:
                    parser.error(
                        f"Invalid profile '{p}'. "
                        f"Available: {', '.join(AVAILABLE_PROFILES)}"
                    )
            resolved.append(canonical)

        args.chewbbaca_inputs = [
            {"path": path, "profile": profile}
            for path, profile in zip(chewbbaca_paths, resolved)
        ]

        for p in resolved:
            if p not in target_profiles:
                target_profiles.append(p)
    else:
        args.chewbbaca_inputs = []

    return args, target_profiles


def source_mode(args):
    if not args.bonsai:
        return "chewbbaca"
    if args.chewbbaca:
        return "bonsai_chewbbaca"
    return "bonsai"
