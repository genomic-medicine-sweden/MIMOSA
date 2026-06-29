#!/usr/bin/env python3
import logging
import os

log = logging.getLogger(__name__)


def _sample_id(sample):
    return sample.get("sample_id")


def _bonsai_id_candidates(sample):
    candidates = sample.get("bonsai_id_candidates") or [sample.get("sample_id")]
    return [candidate for candidate in candidates if candidate]


def _conflict_action_from_env():
    action = os.getenv("CHEWBBACA_CONFLICT")
    if not action:
        return None

    action = action.strip().lower()
    if action not in {"use_bonsai", "use_chewbbaca", "skip"}:
        raise SystemExit(
            "CHEWBBACA_CONFLICT must be 'use_bonsai', 'use_chewbbaca', or 'skip'."
        )
    return action


def resolve_bonsai_chewbbaca_conflicts(
    chewbbaca_samples,
    bonsai_samples,
    is_interactive,
):
    """
    Identify chewBBACA samples that share an ID with a Bonsai sample and resolve each conflict.

    """
    bonsai_ids = {_sample_id(s) for s in bonsai_samples if _sample_id(s)}
    conflict_pairs = []
    chewbbaca_ready = []

    for sample in chewbbaca_samples:
        chewbbaca_id = sample.get("sample_id")
        bonsai_match = next(
            (c for c in _bonsai_id_candidates(sample) if c in bonsai_ids),
            None,
        )
        if bonsai_match:
            conflict_pairs.append((bonsai_match, chewbbaca_id))
        elif chewbbaca_id:
            chewbbaca_ready.append(chewbbaca_id)

    chewbbaca_ready = sorted(chewbbaca_ready)
    conflicts = sorted(bonsai_id for bonsai_id, _ in conflict_pairs)
    use_bonsai = []
    use_chewbbaca = []
    excluded = []

    if conflict_pairs:
        log.warning(
            "event=chewbbaca_bonsai_conflict count=%s samples=%s",
            len(conflict_pairs),
            ",".join(conflicts),
        )

    forced_action = _conflict_action_from_env()
    decisions = []

    for bonsai_id, chewbbaca_id in sorted(conflict_pairs):
        if forced_action:
            action = forced_action
        elif is_interactive:
            answer = (
                input(
                    f"Sample {bonsai_id} exists in both Bonsai and your chewBBACA input.\n"
                    "Use [b]onsai (default), [c]hewBBACA, or [s]kip? [B/c/s] "
                )
                .strip()
                .lower()
            )
            if answer in ("c", "chewbbaca"):
                action = "use_chewbbaca"
            elif answer in ("s", "skip"):
                action = "skip"
            else:
                action = "use_bonsai"
        else:
            action = "use_bonsai"

        log.warning(
            "event=chewbbaca_bonsai_conflict sample=%s chewbbaca_sample=%s action=%s",
            bonsai_id,
            chewbbaca_id,
            action,
        )

        decisions.append(
            {"bonsai_id": bonsai_id, "chewbbaca_id": chewbbaca_id, "action": action}
        )

        if action == "use_bonsai":
            use_bonsai.append(chewbbaca_id)
        elif action == "use_chewbbaca":
            use_chewbbaca.append(chewbbaca_id)
        else:
            excluded.append(chewbbaca_id)

    return {
        "conflicts": conflicts,
        "chewbbaca_ready": chewbbaca_ready,
        "use_bonsai": use_bonsai,
        "use_chewbbaca": use_chewbbaca,
        "excluded": excluded,
        "decisions": decisions,
    }


def _duplicate_action_from_env():
    action = os.getenv("CHEWBBACA_DUPLICATE_ACTION")
    if not action:
        return None

    action = action.strip().lower()
    if action not in {"skip", "replace"}:
        raise SystemExit("CHEWBBACA_DUPLICATE_ACTION must be 'skip' or 'replace'.")
    return action


def _duplicate_action(sample_id, analysis_profile, is_interactive):
    forced_action = _duplicate_action_from_env()
    if forced_action:
        return forced_action

    if not is_interactive:
        return "skip"

    answer = (
        input(
            f"Sample {sample_id} (profile: {analysis_profile}) was already imported. "
            "Overwrite with new allele data? [y/N] "
        )
        .strip()
        .lower()
    )
    return "replace" if answer in {"y", "yes"} else "skip"
