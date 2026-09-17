"""
Unified Preprocessing Pipeline for Training and Independent Evaluation.
Ensures exact mathematical parity between the training feature space and evaluator feature space:
- Deduplication by user_id
- Safe numeric type conversion
- Negative numeric value rectification (converted to NaN and imputed)
- Missing value median imputation
- Robust multi-format genre parsing (JSON, literal, comma-separated)
- Canonical one-hot genre indicator encoding (12 canonical genres)
- Unique genre_count computation
- 99th-percentile Winsorization outlier treatment
"""

import json
import ast
import logging
from typing import Tuple, Dict, Any, List
import numpy as np
import pandas as pd

logger = logging.getLogger("audience.preprocessing")

CANONICAL_GENRES: List[str] = [
    "Action", "Thriller", "Sci-Fi", "Drama", "Comedy",
    "Romance", "Documentary", "Animation", "Family", "Horror",
    "Crime", "Adventure"
]
DEFAULT_GENRES = CANONICAL_GENRES

FEATURE_COLUMNS: List[str] = (
    ["watch_time_hours", "avg_session_mins", "genre_count"] +
    [f"genre_{g}" for g in CANONICAL_GENRES]
)


def parse_genre_field(val: Any) -> List[str]:
    """
    Safely parses diverse genre representations (JSON string, Python literal, comma list, or list)
    into a clean list of string genres.
    """
    if val is None:
        return []
    if isinstance(val, (list, tuple, np.ndarray)):
        return [str(x).strip() for x in val if x is not None and str(x).strip()]
    if isinstance(val, (float, np.floating)) and np.isnan(val):
        return []
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str or val_str.lower() in ("nan", "none", "null", "[]"):
            return []
        if (val_str.startswith("[") and val_str.endswith("]")) or (val_str.startswith("{") and val_str.endswith("}")):
            try:
                parsed = json.loads(val_str)
                if isinstance(parsed, list):
                    return [str(x).strip() for x in parsed if x is not None and str(x).strip()]
            except Exception:
                pass
            try:
                parsed = ast.literal_eval(val_str)
                if isinstance(parsed, (list, tuple)):
                    return [str(x).strip() for x in parsed if x is not None and str(x).strip()]
            except Exception:
                pass
        return [g.strip() for g in val_str.replace(";", ",").split(",") if g.strip()]
    return []


def clean_dataset(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Executes comprehensive data hygiene and quality handling on raw viewer activity records.
    Returns:
        (df_cleaned, quality_report)
    """
    report: Dict[str, Any] = {
        "raw_record_count": len(df_raw),
        "duplicate_records_dropped": 0,
        "negative_watch_time_corrected": 0,
        "negative_session_mins_corrected": 0,
        "missing_watch_time_imputed": 0,
        "missing_session_mins_imputed": 0,
        "missing_genres_handled": 0,
        "outliers_capped": 0,
        "final_cleaned_record_count": 0,
    }

    df = df_raw.copy()

    # 1. Deduplication
    if "user_id" in df.columns:
        dup_count = df["user_id"].duplicated().sum()
        df = df.drop_duplicates(subset=["user_id"], keep="first").reset_index(drop=True)
        report["duplicate_records_dropped"] = int(dup_count)

    # 2. Numeric conversion & Negative rectification
    if "watch_time_hours" in df.columns:
        df["watch_time_hours"] = pd.to_numeric(df["watch_time_hours"], errors="coerce")
        neg_watch_mask = df["watch_time_hours"] < 0
        neg_watch_count = int(neg_watch_mask.sum())
        report["negative_watch_time_corrected"] = neg_watch_count
        if neg_watch_count > 0:
            df.loc[neg_watch_mask, "watch_time_hours"] = np.nan

    if "avg_session_mins" in df.columns:
        df["avg_session_mins"] = pd.to_numeric(df["avg_session_mins"], errors="coerce")
        neg_session_mask = df["avg_session_mins"] < 0
        neg_session_count = int(neg_session_mask.sum())
        report["negative_session_mins_corrected"] = neg_session_count
        if neg_session_count > 0:
            df.loc[neg_session_mask, "avg_session_mins"] = np.nan

    # 3. Missing Value Imputation (Median)
    if "watch_time_hours" in df.columns:
        missing_watch = int(df["watch_time_hours"].isnull().sum())
        report["missing_watch_time_imputed"] = missing_watch
        median_watch = float(df["watch_time_hours"].median()) if not pd.isna(df["watch_time_hours"].median()) else 15.0
        df["watch_time_hours"] = df["watch_time_hours"].fillna(median_watch)

    if "avg_session_mins" in df.columns:
        missing_session = int(df["avg_session_mins"].isnull().sum())
        report["missing_session_mins_imputed"] = missing_session
        median_session = float(df["avg_session_mins"].median()) if not pd.isna(df["avg_session_mins"].median()) else 45.0
        df["avg_session_mins"] = df["avg_session_mins"].fillna(median_session)

    # 4. Outlier Capping (99th-percentile Winsorization)
    if "watch_time_hours" in df.columns:
        p99_watch = float(df["watch_time_hours"].quantile(0.99))
        outlier_watch = int((df["watch_time_hours"] > p99_watch).sum())
        df["watch_time_hours"] = df["watch_time_hours"].clip(upper=p99_watch)
        report["outliers_capped"] += outlier_watch

    if "avg_session_mins" in df.columns:
        p99_session = float(df["avg_session_mins"].quantile(0.99))
        outlier_session = int((df["avg_session_mins"] > p99_session).sum())
        df["avg_session_mins"] = df["avg_session_mins"].clip(upper=p99_session)
        report["outliers_capped"] += outlier_session

    # 5. Genre Parsing
    if "top_genres" in df.columns:
        missing_genres = int(df["top_genres"].isnull().sum())
        report["missing_genres_handled"] = missing_genres
        df["parsed_genres"] = df["top_genres"].apply(parse_genre_field)
    else:
        df["parsed_genres"] = [[] for _ in range(len(df))]

    report["final_cleaned_record_count"] = len(df)
    return df, report


def extract_features_df(df_cleaned: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms a cleaned DataFrame into the exact numeric feature matrix X
    with named columns expected by the StandardScaler + KMeans pipeline and API.
    """
    n_rows = len(df_cleaned)
    features_dict = {
        "watch_time_hours": (
            df_cleaned["watch_time_hours"].astype(float).values
            if "watch_time_hours" in df_cleaned.columns
            else np.zeros(n_rows, dtype=np.float64)
        ),
        "avg_session_mins": (
            df_cleaned["avg_session_mins"].astype(float).values
            if "avg_session_mins" in df_cleaned.columns
            else np.zeros(n_rows, dtype=np.float64)
        ),
    }

    if "parsed_genres" in df_cleaned.columns:
        genres_series = df_cleaned["parsed_genres"]
    elif "top_genres" in df_cleaned.columns:
        genres_series = df_cleaned["top_genres"]
    else:
        genres_series = [[] for _ in range(n_rows)]

    genre_counts = []
    genre_indicators = {f"genre_{g}": np.zeros(n_rows, dtype=np.float64) for g in CANONICAL_GENRES}

    for i, g_list in enumerate(genres_series):
        if not isinstance(g_list, list):
            g_list = []
        user_genres_lower = {str(x).strip().lower() for x in g_list if x and str(x).strip()}
        genre_counts.append(float(len(user_genres_lower)))

        for g in CANONICAL_GENRES:
            if g.lower() in user_genres_lower:
                genre_indicators[f"genre_{g}"][i] = 1.0

    features_dict["genre_count"] = np.array(genre_counts, dtype=np.float64)
    features_dict.update(genre_indicators)

    X_df = pd.DataFrame(features_dict)[FEATURE_COLUMNS]
    return X_df


def extract_features_from_raw(df_raw: pd.DataFrame) -> pd.DataFrame:
    """
    Unified entrypoint for both Trainer and Evaluator.
    Ingests raw DataFrame, performs deduplication, negative rectification,
    median imputation, 99th-percentile outlier clipping, genre parsing,
    and constructs the standardized 15-feature matrix.
    """
    df_cleaned, _ = clean_dataset(df_raw)
    return extract_features_df(df_cleaned)


def clean_and_extract_features(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Returns (X_features_df, df_cleaned, quality_report) for pipeline logging and persistence.
    """
    df_cleaned, report = clean_dataset(df_raw)
    X_df = extract_features_df(df_cleaned)
    return X_df, df_cleaned, report
