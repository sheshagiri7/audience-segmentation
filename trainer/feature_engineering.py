"""
Feature Engineering Module
Constructs compact, discriminative behavioral feature representations
fully aligned with api/recommender.py and Section 5 of the Hackathon PS.
"""

import logging
from typing import List, Tuple
import numpy as np
import pandas as pd

logger = logging.getLogger("audience_trainer.features")

# Standard catalog genres conforming to api/model_loader.py and recommender
DEFAULT_GENRES: List[str] = [
    "Action", "Thriller", "Sci-Fi", "Drama", "Comedy",
    "Romance", "Documentary", "Animation", "Family", "Horror",
    "Crime", "Adventure"
]

FEATURE_COLUMNS: List[str] = (
    ["watch_time_hours", "avg_session_mins", "genre_count"] +
    [f"genre_{g}" for g in DEFAULT_GENRES]
)


def extract_features_df(df_cleaned: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms a cleaned DataFrame into the exact numeric feature matrix X
    with named columns expected by the StandardScaler + KMeans pipeline and API.
    """
    n_rows = len(df_cleaned)
    features_dict = {
        "watch_time_hours": df_cleaned["watch_time_hours"].astype(float).values,
        "avg_session_mins": df_cleaned["avg_session_mins"].astype(float).values,
    }

    # Extract parsed genres list
    genres_series = df_cleaned["parsed_genres"] if "parsed_genres" in df_cleaned.columns else df_cleaned["top_genres"]

    # Compute genre counts
    genre_counts = []
    genre_indicators = {f"genre_{g}": np.zeros(n_rows, dtype=np.float64) for g in DEFAULT_GENRES}

    for i, g_list in enumerate(genres_series):
        if not isinstance(g_list, list):
            g_list = []
        user_genres_lower = {str(x).strip().lower() for x in g_list if x and str(x).strip()}
        genre_counts.append(float(len(user_genres_lower)))

        for g in DEFAULT_GENRES:
            if g.lower() in user_genres_lower:
                genre_indicators[f"genre_{g}"][i] = 1.0

    features_dict["genre_count"] = np.array(genre_counts, dtype=np.float64)
    features_dict.update(genre_indicators)

    X_df = pd.DataFrame(features_dict)[FEATURE_COLUMNS]
    logger.info(f"Constructed feature matrix with shape {X_df.shape} ({len(FEATURE_COLUMNS)} features).")
    return X_df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from trainer.data_generator import get_or_create_dataset
    from trainer.cleaning import clean_dataset
    
    raw_df, _ = get_or_create_dataset()
    clean_df, _ = clean_dataset(raw_df)
    X = extract_features_df(clean_df)
    print("Feature columns:", list(X.columns))
    print(X.describe().T[["mean", "std", "min", "max"]])
