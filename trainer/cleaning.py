"""
Data Quality & Cleaning Pipeline
Explicitly handles missing values, invalid negative values, duplicate records,
extreme outliers, and malformed genre representations conforming to PS Section 5.
"""

import json
import logging
import ast
from typing import Tuple, Dict, Any, List
import numpy as np
import pandas as pd

logger = logging.getLogger("audience_trainer.cleaning")


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
        # Try JSON parsing
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
        # Fallback to comma-separated splitting
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

    # 1. Deduplication (PS Section 5: "duplicate records should be handled explicitly")
    if "user_id" in df.columns:
        dup_count = df["user_id"].duplicated().sum()
        df = df.drop_duplicates(subset=["user_id"], keep="first").reset_index(drop=True)
        report["duplicate_records_dropped"] = int(dup_count)
        logger.info(f"Deduplication: removed {dup_count} duplicate user_id records.")

    # 2. Negative Numerical Rectification (PS Section 5 & 13)
    if "watch_time_hours" in df.columns:
        neg_watch_mask = df["watch_time_hours"] < 0
        neg_watch_count = int(neg_watch_mask.sum())
        report["negative_watch_time_corrected"] = neg_watch_count
        if neg_watch_count > 0:
            logger.info(f"Detected {neg_watch_count} negative watch_time_hours values; converting to NaN for imputation.")
            df.loc[neg_watch_mask, "watch_time_hours"] = np.nan

    if "avg_session_mins" in df.columns:
        neg_session_mask = df["avg_session_mins"] < 0
        neg_session_count = int(neg_session_mask.sum())
        report["negative_session_mins_corrected"] = neg_session_count
        if neg_session_count > 0:
            logger.info(f"Detected {neg_session_count} negative avg_session_mins values; converting to NaN for imputation.")
            df.loc[neg_session_mask, "avg_session_mins"] = np.nan

    # 3. Missing Value Imputation (PS Section 5: "missing values should be handled explicitly")
    if "watch_time_hours" in df.columns:
        missing_watch = int(df["watch_time_hours"].isnull().sum())
        report["missing_watch_time_imputed"] = missing_watch
        median_watch = float(df["watch_time_hours"].median())
        df["watch_time_hours"] = df["watch_time_hours"].fillna(median_watch)
        logger.info(f"Imputed {missing_watch} missing watch_time_hours with median ({median_watch:.2f}h).")

    if "avg_session_mins" in df.columns:
        missing_session = int(df["avg_session_mins"].isnull().sum())
        report["missing_session_mins_imputed"] = missing_session
        median_session = float(df["avg_session_mins"].median())
        df["avg_session_mins"] = df["avg_session_mins"].fillna(median_session)
        logger.info(f"Imputed {missing_session} missing avg_session_mins with median ({median_session:.2f}m).")

    # 4. Outlier Capping (Winsorization at 99th percentile) (PS Section 13: "Very large watch time or session duration")
    if "watch_time_hours" in df.columns:
        p99_watch = float(df["watch_time_hours"].quantile(0.99))
        outlier_watch = (df["watch_time_hours"] > p99_watch).sum()
        df["watch_time_hours"] = df["watch_time_hours"].clip(upper=p99_watch)
        report["outliers_capped"] += int(outlier_watch)

    if "avg_session_mins" in df.columns:
        p99_session = float(df["avg_session_mins"].quantile(0.99))
        outlier_session = (df["avg_session_mins"] > p99_session).sum()
        df["avg_session_mins"] = df["avg_session_mins"].clip(upper=p99_session)
        report["outliers_capped"] += int(outlier_session)

    # 5. Genre normalization and list parsing
    if "top_genres" in df.columns:
        missing_genres = df["top_genres"].isnull().sum()
        report["missing_genres_handled"] = int(missing_genres)
        df["parsed_genres"] = df["top_genres"].apply(parse_genre_field)
    else:
        df["parsed_genres"] = [[] for _ in range(len(df))]

    report["final_cleaned_record_count"] = len(df)
    logger.info(f"Cleaning complete: {report['final_cleaned_record_count']} clean records ready for modeling.")
    return df, report
