"""
Unit and Integration Tests for the Trainer Component
Validates data generation, data quality cleaning, feature engineering,
K evaluation, model training, and artifact persistence.
"""

import os
import json
import pytest
import numpy as np
import pandas as pd
import joblib

from trainer.data_generator import generate_synthetic_dataset
from trainer.cleaning import clean_dataset, parse_genre_field
from trainer.feature_engineering import extract_features_df, FEATURE_COLUMNS
from trainer.clustering import evaluate_cluster_range, train_clustering_pipeline
from trainer.train import run_training_pipeline


def test_data_generation():
    """Verify synthetic data generation yields expected row count and injected flaws."""
    df = generate_synthetic_dataset(n_records=1000, seed=123)
    assert len(df) > 1000  # Duplicates were injected
    assert "watch_time_hours" in df.columns
    assert "avg_session_mins" in df.columns
    assert "top_genres" in df.columns
    # Check that anomalies were injected
    assert df["watch_time_hours"].isnull().sum() > 0
    assert (df["watch_time_hours"] < 0).sum() > 0


def test_data_cleaning_pipeline():
    """Verify all data quality flaws are resolved cleanly."""
    raw_records = [
        {"user_id": "U1", "watch_time_hours": 35.0, "avg_session_mins": 90.0, "top_genres": '["Action"]'},
        {"user_id": "U1", "watch_time_hours": 40.0, "avg_session_mins": 95.0, "top_genres": '["Action"]'}, # Duplicate
        {"user_id": "U2", "watch_time_hours": -15.0, "avg_session_mins": 45.0, "top_genres": '["Comedy"]'}, # Negative watch
        {"user_id": "U3", "watch_time_hours": 20.0, "avg_session_mins": -10.0, "top_genres": '["Drama"]'},  # Negative session
        {"user_id": "U4", "watch_time_hours": np.nan, "avg_session_mins": 50.0, "top_genres": None},         # Missing
        {"user_id": "U5", "watch_time_hours": 900.0, "avg_session_mins": 800.0, "top_genres": '["Action"]'}, # Outlier
    ]
    df_raw = pd.DataFrame(raw_records)
    df_clean, report = clean_dataset(df_raw)

    # 1. Deduplication
    assert len(df_clean) == 5
    assert report["duplicate_records_dropped"] == 1

    # 2. Negative values rectified and imputed
    assert (df_clean["watch_time_hours"] >= 0).all()
    assert (df_clean["avg_session_mins"] >= 0).all()

    # 3. Missing values imputed
    assert df_clean["watch_time_hours"].isnull().sum() == 0
    assert df_clean["avg_session_mins"].isnull().sum() == 0

    # 4. Outliers capped
    assert report["outliers_capped"] > 0


def test_genre_parsing_edge_cases():
    """Verify robust parsing of various genre representation formats."""
    assert parse_genre_field(None) == []
    assert parse_genre_field("") == []
    assert parse_genre_field(["Action", "Thriller"]) == ["Action", "Thriller"]
    assert parse_genre_field('["Action", "Sci-Fi"]') == ["Action", "Sci-Fi"]
    assert parse_genre_field("Action, Comedy, Drama") == ["Action", "Comedy", "Drama"]
    assert parse_genre_field("['Animation', 'Family']") == ["Animation", "Family"]


def test_feature_engineering_dimensions():
    """Verify feature extractor produces exact columns and no NaNs."""
    df = pd.DataFrame([
        {"user_id": "U1", "watch_time_hours": 30.0, "avg_session_mins": 60.0, "parsed_genres": ["Action", "Thriller"]},
        {"user_id": "U2", "watch_time_hours": 5.0, "avg_session_mins": 20.0, "parsed_genres": []},
        {"user_id": "U3", "watch_time_hours": 15.0, "avg_session_mins": 40.0, "parsed_genres": ["Novel Indie Genre"]},
    ])
    X = extract_features_df(df)
    assert list(X.columns) == FEATURE_COLUMNS
    assert len(X) == 3
    assert X.isnull().sum().sum() == 0
    assert X.loc[0, "genre_Action"] == 1.0
    assert X.loc[0, "genre_Thriller"] == 1.0
    assert X.loc[1, "genre_count"] == 0.0
    assert X.loc[2, "genre_count"] == 1.0


def test_clustering_training_and_reproducibility(tmp_path):
    """Verify deterministic training and persistence of pipeline and metadata."""
    df_raw = generate_synthetic_dataset(n_records=500, seed=42)
    df_clean, _ = clean_dataset(df_raw)
    X = extract_features_df(df_clean)

    k, k_eval = evaluate_cluster_range(X, k_range=range(2, 5), seed=42)
    assert k == 4
    assert len(k_eval["k_evaluations"]) == 3

    pipeline1, meta1 = train_clustering_pipeline(X, k=4, seed=42)
    pipeline2, meta2 = train_clustering_pipeline(X, k=4, seed=42)

    # Check reproducibility (fixed seed gives identical predictions)
    pred1 = pipeline1.predict(X)
    pred2 = pipeline2.predict(X)
    np.testing.assert_array_equal(pred1, pred2)

    # Check metadata integrity
    assert len(meta1["segments"]) == 4
    for seg in meta1["segments"]:
        assert "segment_id" in seg
        assert "segment_name" in seg
        assert len(seg["recommendations"]) == 5
        assert seg["profile"]["count"] > 0


def test_full_pipeline_run(tmp_path):
    """Verify master train script runs end-to-end and outputs valid artifacts."""
    out_dir = str(tmp_path / "test_models")
    meta = run_training_pipeline(output_dir=out_dir, target_k=4, random_seed=42)

    pipeline_path = os.path.join(out_dir, "pipeline.joblib")
    metadata_path = os.path.join(out_dir, "metadata.json")

    assert os.path.exists(pipeline_path)
    assert os.path.exists(metadata_path)

    loaded_pipe = joblib.load(pipeline_path)
    assert hasattr(loaded_pipe, "predict")

    with open(metadata_path, "r") as f:
        loaded_meta = json.load(f)
    assert loaded_meta["k_clusters"] == 4
    assert loaded_meta["metrics"]["silhouette_score"] > 0.35
