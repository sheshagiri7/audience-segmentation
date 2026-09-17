"""
Master Training Pipeline Orchestrator
Executes data ingestion, data cleaning, feature extraction, K evaluation,
pipeline fitting (StandardScaler + KMeans), metadata generation, and artifact persistence.
"""

import os
import sys
import json
import logging
import argparse
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

import joblib
import numpy as np
import pandas as pd

from trainer.data_generator import get_or_create_dataset
from trainer.cleaning import clean_dataset
from trainer.feature_engineering import extract_features_df, FEATURE_COLUMNS
from trainer.clustering import evaluate_cluster_range, train_clustering_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("audience_trainer.train")


def run_training_pipeline(
    data_path: Optional[str] = None,
    output_dir: str = "models",
    target_k: int = 4,
    random_seed: int = 42
) -> Dict[str, Any]:
    """
    Executes the complete end-to-end training and persistence lifecycle.
    """
    logger.info("=" * 60)
    logger.info("Starting Containerized Audience Segmentation Training Pipeline")
    logger.info("=" * 60)

    # 1. Ingestion
    logger.info("Step 1/6: Ingesting dataset...")
    df_raw, source_path = get_or_create_dataset(data_path)
    if df_raw is None or len(df_raw) == 0:
        raise ValueError("Dataset is empty. Cannot proceed with model training.")
    if len(df_raw) < target_k:
        raise ValueError(f"Dataset contains {len(df_raw)} records, fewer than K={target_k} required for clustering.")
    logger.info(f"Loaded {len(df_raw)} raw records from: {source_path}")

    # 2. Data Cleaning & Quality Assurance
    logger.info("Step 2/6: Handling data quality, deduplication, and outliers...")
    df_cleaned, quality_report = clean_dataset(df_raw)
    logger.info(
        f"Data quality audit: dropped {quality_report['duplicate_records_dropped']} duplicates, "
        f"imputed {quality_report['missing_watch_time_imputed']} watch_time nulls and "
        f"{quality_report['missing_session_mins_imputed']} session nulls, "
        f"corrected {quality_report['negative_watch_time_corrected'] + quality_report['negative_session_mins_corrected']} negative values, "
        f"capped {quality_report['outliers_capped']} outliers."
    )

    # 3. Feature Extraction
    logger.info("Step 3/6: Extracting standardized behavioral feature matrix...")
    X_df = extract_features_df(df_cleaned)

    # 4. K Evaluation & Defensible Cluster Selection
    logger.info("Step 4/6: Conducting K selection analysis (silhouette + inertia)...")
    optimal_k, k_eval_results = evaluate_cluster_range(X_df, k_range=range(2, 9), seed=random_seed)
    chosen_k = target_k if target_k is not None else optimal_k
    logger.info(f"Selected K={chosen_k} for deployment. Rationale: {k_eval_results['selection_rationale']}")

    # 5. Fit Preprocessing + Clustering Pipeline
    logger.info("Step 5/6: Training unified StandardScaler + KMeans pipeline...")
    pipeline, metadata = train_clustering_pipeline(X_df, k=chosen_k, seed=random_seed)

    # Merge quality report and K evaluation into metadata for comprehensive evaluation transparency
    metadata["data_quality_report"] = quality_report
    metadata["k_evaluation_analysis"] = k_eval_results

    # 6. Artifact Persistence
    logger.info("Step 6/6: Persisting pipeline and metadata artifacts...")
    target_dirs = [Path(output_dir)]

    # If running inside Docker container where /models is the shared volume mount
    docker_shared = Path("/models")
    if docker_shared.exists() and os.access(docker_shared, os.W_OK) and docker_shared.resolve() != target_dirs[0].resolve():
        target_dirs.append(docker_shared)

    saved_locations = []
    for t_dir in target_dirs:
        t_dir.mkdir(parents=True, exist_ok=True)

        pipeline_file = t_dir / "pipeline.joblib"
        metadata_file = t_dir / "metadata.json"

        # Save scikit-learn pipeline atomically (temp file + rename)
        with tempfile.NamedTemporaryFile(delete=False, dir=t_dir, suffix=".joblib") as tmp_jl:
            tmp_jl_path = tmp_jl.name
        joblib.dump(pipeline, tmp_jl_path)
        os.chmod(tmp_jl_path, 0o666)
        os.replace(tmp_jl_path, pipeline_file)
        logger.info(f"Persisted clustering pipeline -> {pipeline_file.resolve()}")

        # Save segment metadata atomically
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False, dir=t_dir, suffix=".json") as tmp_js:
            json.dump(metadata, tmp_js, indent=2)
            tmp_js_path = tmp_js.name
        os.chmod(tmp_js_path, 0o666)
        os.replace(tmp_js_path, metadata_file)
        logger.info(f"Persisted segment metadata -> {metadata_file.resolve()}")

        saved_locations.append(str(t_dir.resolve()))

    # 7. Self-Verification Smoke Test
    logger.info("Running post-training self-verification test...")
    test_profile = pd.DataFrame([{
        "watch_time_hours": 32.5,
        "avg_session_mins": 85.0,
        "genre_count": 2.0,
        "genre_Action": 1.0,
        "genre_Thriller": 1.0,
        "genre_Sci-Fi": 0.0,
        "genre_Drama": 0.0,
        "genre_Comedy": 0.0,
        "genre_Romance": 0.0,
        "genre_Documentary": 0.0,
        "genre_Animation": 0.0,
        "genre_Family": 0.0,
        "genre_Horror": 0.0,
        "genre_Crime": 0.0,
        "genre_Adventure": 0.0,
    }])[FEATURE_COLUMNS]

    pred_cluster = int(pipeline.predict(test_profile)[0])
    seg_name = metadata["segments"][pred_cluster]["segment_name"]
    logger.info(f"Self-test prediction: USR-8192 sample -> Segment {pred_cluster} ('{seg_name}')")

    logger.info("=" * 60)
    logger.info("Training Pipeline Completed Successfully!")
    logger.info(f"Artifacts saved in: {', '.join(saved_locations)}")
    logger.info(f"Silhouette Score: {metadata['metrics']['silhouette_score']}")
    logger.info(f"Inertia: {metadata['metrics']['inertia']}")
    logger.info("=" * 60)

    return metadata


def parse_args():
    parser = argparse.ArgumentParser(description="Audience Segmentation Clustering Trainer")
    parser.add_argument("--data-path", type=str, default=None, help="Path to input user activity CSV")
    parser.add_argument("--output-dir", type=str, default="models", help="Directory to store pipeline artifacts")
    parser.add_argument("--k", type=int, default=4, help="Number of clusters (default: 4)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        run_training_pipeline(
            data_path=args.data_path,
            output_dir=args.output_dir,
            target_k=args.k,
            random_seed=args.seed
        )
    except Exception as e:
        logger.error(f"Training pipeline execution failed: {e}")
        sys.exit(1)
