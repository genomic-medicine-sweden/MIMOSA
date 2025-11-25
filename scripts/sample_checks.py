#!/usr/bin/env python3
def get_new_sample_ids(all_samples, analyzed_ids, profile):
    """
    Extract new sample IDs for a specific profile by comparing Bonsai samples with MIMOSA-uploaded samples.
    """
    profile_samples = [s for s in all_samples if s.get("profile") == profile]
    profile_ids = {s["sample_id"] for s in profile_samples if "sample_id" in s}
    return profile_ids - analyzed_ids


def prompt_if_no_new_samples(profile, new_ids):
    """
    Prompt the user if no new samples exist for a given profile. Returns True if user wants to proceed anyway.
    """
    if not new_ids:
        user_input = input(
            f"No new samples found for profile '{profile}'. Do you want to proceed anyway? (yes/no): "
        ).strip().lower()
        return user_input in ["yes", "y"]
    return True

