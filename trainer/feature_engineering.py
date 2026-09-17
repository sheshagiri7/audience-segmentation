"""
Feature Engineering Module
Re-exports unified feature definitions to guarantee parity with the evaluator.
"""
from common.preprocessing import (
    DEFAULT_GENRES,
    CANONICAL_GENRES,
    FEATURE_COLUMNS,
    extract_features_df,
    extract_features_from_raw,
    ViewerFeatureExtractor,
)

__all__ = [
    "DEFAULT_GENRES",
    "CANONICAL_GENRES",
    "FEATURE_COLUMNS",
    "extract_features_df",
    "extract_features_from_raw",
    "ViewerFeatureExtractor",
]
