"""
Dataset Generator for OTT Audience Activity
Generates realistic behavioral cohorts conforming to the Hackathon Problem Statement,
with realistic data-quality flaws (missing values, negative values, outliers, unseen genres, duplicates).
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, List, Tuple
import numpy as np
import pandas as pd

logger = logging.getLogger("audience_trainer.data_generator")


DEFAULT_GENRES = [
    "Action", "Thriller", "Sci-Fi", "Drama", "Comedy",
    "Romance", "Documentary", "Animation", "Family", "Horror",
    "Crime", "Adventure"
]

UNSEEN_GENRES = [
    "Experimental Indie Noir", "Silent Cinema", "Slow TV", "Esports Highlights", "Avant-Garde Doc"
]


def generate_synthetic_dataset(
    n_records: int = 10000,
    seed: int = 42,
    output_path: Optional[str] = None
) -> pd.DataFrame:
    """
    Generates a realistic 10,000-record OTT audience activity dataset
    composed of the 4 archetypes specified in Section 2, 5, and 8 of the Problem Statement,
    with intentional data-quality noise for testing the preprocessing pipeline.
    """
    np.random.seed(seed)
    logger.info(f"Generating synthetic OTT audience dataset with {n_records} records (seed={seed})...")

    # Cohort proportions:
    # 0: High-Engagement Action Viewers (~32%)
    # 1: Casual Short-Session Viewers (~27%)
    # 2: Genre-Explorers (~24%)
    # 3: Low-Activity Viewers (~17%)
    proportions = [0.32, 0.27, 0.24, 0.17]
    counts = [int(p * n_records) for p in proportions]
    counts[-1] = n_records - sum(counts[:-1])  # Ensure exact sum

    records: List[dict] = []
    user_id_counter = 1000

    # 1. Generate High-Engagement Action Viewers
    for _ in range(counts[0]):
        user_id_counter += 1
        watch_time = np.random.normal(38.0, 7.5)
        avg_session = np.random.normal(92.0, 14.0)
        num_sessions = int(np.clip(np.random.normal(25, 6), 5, 80))
        completion_rate = float(np.clip(np.random.normal(0.85, 0.08), 0.4, 1.0))
        weekend_ratio = float(np.clip(np.random.normal(0.42, 0.10), 0.1, 0.8))

        # Dominant Action / Thriller / Sci-Fi
        action_genres = ["Action", "Thriller", "Sci-Fi"]
        k = np.random.choice([2, 3], p=[0.6, 0.4])
        selected_genres = list(np.random.choice(action_genres, size=k, replace=False))
        if np.random.rand() < 0.2:
            selected_genres.append(np.random.choice(["Crime", "Adventure"]))

        records.append({
            "user_id": f"USR-{user_id_counter}",
            "watch_time_hours": round(float(np.clip(watch_time, 15.0, 85.0)), 2),
            "avg_session_mins": round(float(np.clip(avg_session, 50.0, 180.0)), 2),
            "top_genres": selected_genres,
            "num_sessions": num_sessions,
            "completion_rate": round(completion_rate, 3),
            "weekend_watch_ratio": round(weekend_ratio, 3),
        })

    # 2. Generate Casual Short-Session Viewers
    for _ in range(counts[1]):
        user_id_counter += 1
        watch_time = np.random.normal(8.5, 2.5)
        avg_session = np.random.normal(24.0, 5.0)
        num_sessions = int(np.clip(np.random.normal(21, 5), 4, 60))
        completion_rate = float(np.clip(np.random.normal(0.65, 0.10), 0.3, 0.95))
        weekend_ratio = float(np.clip(np.random.normal(0.35, 0.10), 0.1, 0.7))

        # Dominant Comedy / Animation
        casual_genres = ["Comedy", "Animation"]
        k = np.random.choice([1, 2], p=[0.4, 0.6])
        selected_genres = list(np.random.choice(casual_genres, size=k, replace=False))
        if np.random.rand() < 0.15:
            selected_genres.append("Romance")

        records.append({
            "user_id": f"USR-{user_id_counter}",
            "watch_time_hours": round(float(np.clip(watch_time, 1.0, 19.0)), 2),
            "avg_session_mins": round(float(np.clip(avg_session, 10.0, 42.0)), 2),
            "top_genres": selected_genres,
            "num_sessions": num_sessions,
            "completion_rate": round(completion_rate, 3),
            "weekend_watch_ratio": round(weekend_ratio, 3),
        })

    # 3. Generate Genre-Explorers
    for _ in range(counts[2]):
        user_id_counter += 1
        watch_time = np.random.normal(26.0, 5.5)
        avg_session = np.random.normal(58.0, 11.0)
        num_sessions = int(np.clip(np.random.normal(27, 6), 8, 70))
        completion_rate = float(np.clip(np.random.normal(0.78, 0.08), 0.4, 0.98))
        weekend_ratio = float(np.clip(np.random.normal(0.48, 0.12), 0.15, 0.85))

        # Diverse genres across Documentary, Drama, Mystery, Romance, Sci-Fi, Crime
        pool = ["Documentary", "Drama", "Mystery", "Romance", "Sci-Fi", "Crime", "Adventure"]
        k = np.random.randint(3, 6)
        selected_genres = list(np.random.choice(pool, size=k, replace=False))

        records.append({
            "user_id": f"USR-{user_id_counter}",
            "watch_time_hours": round(float(np.clip(watch_time, 12.0, 52.0)), 2),
            "avg_session_mins": round(float(np.clip(avg_session, 35.0, 95.0)), 2),
            "top_genres": selected_genres,
            "num_sessions": num_sessions,
            "completion_rate": round(completion_rate, 3),
            "weekend_watch_ratio": round(weekend_ratio, 3),
        })

    # 4. Generate Low-Activity Viewers
    for _ in range(counts[3]):
        user_id_counter += 1
        watch_time = np.random.normal(3.2, 1.3)
        avg_session = np.random.normal(32.0, 9.0)
        num_sessions = int(np.clip(np.random.normal(6, 2), 1, 15))
        completion_rate = float(np.clip(np.random.normal(0.38, 0.12), 0.1, 0.7))
        weekend_ratio = float(np.clip(np.random.normal(0.72, 0.12), 0.3, 1.0))  # Weekend heavy

        pool = ["Drama", "Family", "Comedy"]
        k = np.random.choice([1, 2], p=[0.6, 0.4])
        selected_genres = list(np.random.choice(pool, size=k, replace=False))

        records.append({
            "user_id": f"USR-{user_id_counter}",
            "watch_time_hours": round(float(np.clip(watch_time, 0.1, 7.5)), 2),
            "avg_session_mins": round(float(np.clip(avg_session, 10.0, 58.0)), 2),
            "top_genres": selected_genres,
            "num_sessions": num_sessions,
            "completion_rate": round(completion_rate, 3),
            "weekend_watch_ratio": round(weekend_ratio, 3),
        })

    df = pd.DataFrame(records)

    # -------------------------------------------------------------
    # Inject Realistic Data Quality Flaws (PS Section 5 & 10)
    # -------------------------------------------------------------
    total_rows = len(df)

    # 1. Duplicates (~1% duplicates)
    dup_indices = np.random.choice(total_rows, size=100, replace=False)
    dup_rows = df.iloc[dup_indices].copy()
    # Modify watch time slightly to simulate re-logging/updates
    dup_rows["watch_time_hours"] = dup_rows["watch_time_hours"] + np.random.uniform(0.1, 1.0, size=len(dup_rows))
    df = pd.concat([df, dup_rows], ignore_index=True)
    logger.info("Injected 100 duplicate user records for deduplication testing.")

    # 2. Missing values (NaNs in ~2% of records)
    nan_watch_idx = np.random.choice(total_rows, size=int(0.02 * total_rows), replace=False)
    df.loc[nan_watch_idx, "watch_time_hours"] = np.nan

    nan_session_idx = np.random.choice(total_rows, size=int(0.02 * total_rows), replace=False)
    df.loc[nan_session_idx, "avg_session_mins"] = np.nan

    # 3. Negative values (~0.5% invalid negative durations)
    neg_watch_idx = np.random.choice(total_rows, size=30, replace=False)
    df.loc[neg_watch_idx, "watch_time_hours"] = -np.abs(np.random.uniform(2.0, 25.0, size=30))

    neg_session_idx = np.random.choice(total_rows, size=25, replace=False)
    df.loc[neg_session_idx, "avg_session_mins"] = -np.abs(np.random.uniform(10.0, 60.0, size=25))

    # 4. Outliers (~0.3% extreme values)
    outlier_idx = np.random.choice(total_rows, size=20, replace=False)
    df.loc[outlier_idx, "watch_time_hours"] = np.random.uniform(500.0, 950.0, size=20)
    df.loc[outlier_idx, "avg_session_mins"] = np.random.uniform(400.0, 720.0, size=20)

    # 5. Missing / Empty top_genres
    empty_genre_idx = np.random.choice(total_rows, size=150, replace=False)
    for idx in empty_genre_idx[:75]:
        df.at[idx, "top_genres"] = []
    for idx in empty_genre_idx[75:]:
        df.at[idx, "top_genres"] = None

    # 6. Novel / Unseen genres injected into random records
    unseen_idx = np.random.choice(total_rows, size=80, replace=False)
    for idx in unseen_idx:
        current = df.at[idx, "top_genres"]
        if isinstance(current, list):
            novel_g = np.random.choice(UNSEEN_GENRES)
            df.at[idx, "top_genres"] = current + [novel_g]

    # Convert list of genres to JSON string for authentic CSV serialization
    df["top_genres"] = df["top_genres"].apply(lambda g: json.dumps(g) if g is not None else "")

    # Shuffle rows
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)

    if output_path:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(out, index=False)
        logger.info(f"Saved generated dataset ({len(df)} rows) to {out.resolve()}")

    return df


def get_or_create_dataset(preferred_path: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """
    Checks for an existing dataset file. If present, loads and returns it.
    If not, generates a synthetic dataset conforming to the Hackathon PS.
    """
    candidate_paths: List[Path] = []
    if preferred_path:
        p = Path(preferred_path)
        if not p.exists() or not p.is_file():
            raise FileNotFoundError(
                f"Specified dataset path does not exist or is not a file: {p.resolve()}\n"
                "Please provide a valid CSV path with --data-path, or omit the flag to use the default synthetic dataset."
            )
        candidate_paths.append(p)

    # Check common standard locations
    candidate_paths.extend([
        Path("trainer/data/user_activity.csv"),
        Path("data/user_activity.csv"),
        Path("trainer/user_activity.csv"),
        Path("user_activity.csv"),
        Path("../data/user_activity.csv"),
    ])

    for p in candidate_paths:
        if p.exists() and p.is_file():
            logger.info(f"Found existing dataset at: {p.resolve()}")
            return pd.read_csv(p), str(p.resolve())

    # Generate default dataset
    target_path = Path("trainer/data/user_activity.csv")
    df = generate_synthetic_dataset(n_records=10000, seed=42, output_path=str(target_path))
    return df, str(target_path.resolve())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    df, path = get_or_create_dataset()
    print(f"Dataset ready at {path} with shape {df.shape}")
