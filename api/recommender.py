import time
import logging
from typing import Dict, Any, List
import numpy as np
import pandas as pd

from api.schemas import ViewerProfileRequest, RecommendResponse
from api.model_loader import ModelManager, DEFAULT_GENRES, DEFAULT_SEGMENTS

logger = logging.getLogger("audience_api.recommender")


def extract_features(profile: ViewerProfileRequest, expected_features: List[str]) -> pd.DataFrame:
    """
    Transforms a ViewerProfileRequest into a feature DataFrame conforming to expected_features.
    Handles unseen genres, missing genres, and arbitrary feature columns gracefully.
    """
    # Normalize user genres for case-insensitive matching
    user_genres_lower = {g.strip().lower() for g in profile.top_genres if g and g.strip()}

    # Base feature dictionary with common representations
    feature_dict: Dict[str, float] = {
        "watch_time_hours": float(profile.watch_time_hours),
        "avg_session_mins": float(profile.avg_session_mins),
        "genre_count": float(len(user_genres_lower)),
        "watch_time_mins": float(profile.watch_time_hours * 60.0),
        "estimated_sessions": float((profile.watch_time_hours * 60.0) / max(profile.avg_session_mins, 1.0)),
    }

    # Populate genre indicator variations (e.g., Action, genre_Action, is_action)
    for g in DEFAULT_GENRES:
        val = 1.0 if g.lower() in user_genres_lower else 0.0
        feature_dict[g] = val
        feature_dict[g.lower()] = val
        feature_dict[f"genre_{g}"] = val
        feature_dict[f"genre_{g.lower()}"] = val
        feature_dict[f"top_genre_{g}"] = val
        feature_dict[f"is_{g.lower()}"] = val

    if expected_features:
        row = [feature_dict.get(col, 0.0) for col in expected_features]
        df = pd.DataFrame([row], columns=expected_features)
    else:
        # Fallback schema if model does not expose feature_names_in_
        fallback_cols = ["watch_time_hours", "avg_session_mins"] + [f"genre_{g}" for g in DEFAULT_GENRES]
        row = [feature_dict.get(c, 0.0) for c in fallback_cols]
        df = pd.DataFrame([row], columns=fallback_cols)

    return df


def generate_recommendation(
    profile: ViewerProfileRequest, 
    model_mgr: ModelManager
) -> RecommendResponse:
    """
    Performs inference to predict user segment and generate personalized recommendations.
    Never retrains the model.
    """
    start_time = time.perf_counter()

    if not model_mgr.model_loaded:
        raise RuntimeError("Clustering pipeline is not loaded.")

    pipeline = model_mgr.pipeline
    raw_profile_df = pd.DataFrame([{
        "user_id": profile.user_id,
        "watch_time_hours": profile.watch_time_hours,
        "avg_session_mins": profile.avg_session_mins,
        "top_genres": profile.top_genres,
    }])

    # 1. Predict cluster / segment_id via the persisted pipeline
    has_extractor = hasattr(pipeline, "named_steps") and "extractor" in pipeline.named_steps
    segment_id = 0
    distance_to_centroid = 0.0

    if has_extractor:
        try:
            # Direct inference from raw profile through the unified persisted pipeline:
            # raw profile -> ViewerFeatureExtractor -> StandardScaler -> KMeans
            segment_pred = pipeline.predict(raw_profile_df)
            segment_id = int(segment_pred[0])

            # 2. Calculate distance to cluster centroid using pipeline steps
            extractor = pipeline.named_steps["extractor"]
            scaler = pipeline.named_steps.get("scaler")
            kmeans = pipeline.named_steps.get("kmeans")

            X_features = extractor.transform(raw_profile_df)
            X_scaled = scaler.transform(X_features) if scaler is not None else X_features.to_numpy()

            if kmeans is not None and hasattr(kmeans, "transform"):
                distances = kmeans.transform(X_scaled)
                if segment_id < distances.shape[1]:
                    distance_to_centroid = float(distances[0][segment_id])
                else:
                    distance_to_centroid = float(distances[0][0])
            elif kmeans is not None and hasattr(kmeans, "cluster_centers_"):
                centroid = kmeans.cluster_centers_[segment_id]
                distance_to_centroid = float(np.linalg.norm(X_scaled[0] - centroid))

        except Exception as e:
            logger.error(f"Unified pipeline inference error: {e}")
            raise RuntimeError(f"Model inference failed: {e}")

    else:
        # Fallback for 2-step pipeline or mock models without extractor step
        expected_features = model_mgr.feature_names
        df_features = extract_features(profile, expected_features)
        try:
            segment_pred = pipeline.predict(df_features)
            segment_id = int(segment_pred[0])
        except Exception as e:
            logger.error(f"Inference error during predict(): {e}")
            try:
                segment_pred = pipeline.predict(df_features.to_numpy())
                segment_id = int(segment_pred[0])
            except Exception as e2:
                logger.error(f"Inference retry failed: {e2}")
                raise RuntimeError(f"Model inference failed: {e2}")

        try:
            if model_mgr.kmeans is not None:
                kmeans = model_mgr.kmeans
                scaler = model_mgr.scaler
                if scaler is not None:
                    try:
                        X_scaled = scaler.transform(df_features)
                    except Exception:
                        X_scaled = scaler.transform(df_features.to_numpy())
                else:
                    X_scaled = df_features.to_numpy()

                if hasattr(kmeans, "transform"):
                    distances = kmeans.transform(X_scaled)
                    if segment_id < distances.shape[1]:
                        distance_to_centroid = float(distances[0][segment_id])
                    else:
                        distance_to_centroid = float(distances[0][0])
                elif hasattr(kmeans, "cluster_centers_"):
                    centroid = kmeans.cluster_centers_[segment_id]
                    distance_to_centroid = float(np.linalg.norm(X_scaled[0] - centroid))

            elif hasattr(pipeline, "transform"):
                distances = pipeline.transform(df_features)
                if segment_id < distances.shape[1]:
                    distance_to_centroid = float(distances[0][segment_id])
        except Exception as dist_err:
            logger.warning(f"Could not compute centroid distance: {dist_err}")
            distance_to_centroid = 0.0

    distance_to_centroid = round(float(distance_to_centroid), 4)

    # 3. Lookup segment metadata and recommendation catalog
    seg_info = model_mgr.segments.get(segment_id) or DEFAULT_SEGMENTS.get(segment_id % len(DEFAULT_SEGMENTS), {})
    segment_name = seg_info.get("name", f"Segment {segment_id}")
    recommendations = seg_info.get("recommendations", [])

    if not recommendations:
        fallback = DEFAULT_SEGMENTS.get(segment_id % len(DEFAULT_SEGMENTS), {})
        recommendations = fallback.get("recommendations", ["Featured Showcase A", "Featured Showcase B"])

    inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

    raw_features_summary = {
        "watch_time_hours": profile.watch_time_hours,
        "avg_session_mins": profile.avg_session_mins,
        "genres_count": float(len(profile.top_genres)),
    }

    return RecommendResponse(
        user_id=profile.user_id,
        segment_id=segment_id,
        segment_name=segment_name,
        recommendations=recommendations,
        distance_to_centroid=distance_to_centroid,
        raw_features=raw_features_summary,
        inference_time_ms=inference_time_ms,
    )
