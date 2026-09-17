"""
Unit tests for the evaluator module's data cleaning, feature extraction,
and metric calculation functions.
"""

import pytest
import numpy as np
import pandas as pd
from evaluator.evaluate import extract_features_from_raw, FEATURE_COLUMNS, CANONICAL_GENRES


def test_extract_features_schema():
    """Verify feature matrix contains exactly 15 standardized columns."""
    sample_df = pd.DataFrame([
        {
            "user_id": "USR-001",
            "watch_time_hours": 25.5,
            "avg_session_mins": 60.0,
            "top_genres": '["Action", "Thriller"]',
        },
        {
            "user_id": "USR-002",
            "watch_time_hours": 5.0,
            "avg_session_mins": 15.0,
            "top_genres": '["Comedy"]',
        }
    ])
    
    X = extract_features_from_raw(sample_df)
    assert list(X.columns) == FEATURE_COLUMNS
    assert len(X) == 2
    assert X["genre_Action"].iloc[0] == 1.0
    assert X["genre_Comedy"].iloc[0] == 0.0
    assert X["genre_Action"].iloc[1] == 0.0
    assert X["genre_Comedy"].iloc[1] == 1.0
    assert X["genre_count"].iloc[0] == 2.0
    assert X["genre_count"].iloc[1] == 1.0


def test_extract_features_handles_negatives_and_nulls():
    """Verify cleaning handles negative numbers and null values."""
    sample_df = pd.DataFrame([
        {
            "user_id": "USR-003",
            "watch_time_hours": -10.0,
            "avg_session_mins": None,
            "top_genres": None,
        }
    ])
    
    X = extract_features_from_raw(sample_df)
    assert len(X) == 1
    assert X["watch_time_hours"].iloc[0] == 10.0  # Absolute value
    assert not pd.isna(X["avg_session_mins"].iloc[0])
    assert X["genre_count"].iloc[0] == 0.0


def test_extract_features_unseen_genre():
    """Verify unseen genres do not crash feature extraction."""
    sample_df = pd.DataFrame([
        {
            "user_id": "USR-004",
            "watch_time_hours": 12.0,
            "avg_session_mins": 30.0,
            "top_genres": '["Experimental Indie Noir", "Action"]',
        }
    ])
    
    X = extract_features_from_raw(sample_df)
    assert len(X) == 1
    assert X["genre_Action"].iloc[0] == 1.0
    assert X["genre_count"].iloc[0] == 2.0
