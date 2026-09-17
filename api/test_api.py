import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from api.main import app
from api.model_loader import model_manager, DEFAULT_SEGMENTS


client = TestClient(app)


def test_health_check_initial():
    """Verify healthcheck endpoint before model is loaded or in starting state."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data


def test_recommend_without_model():
    """Verify clean 503 response if recommend is requested before model is loaded."""
    if not model_manager.model_loaded:
        payload = {
            "user_id": "USR-8192",
            "watch_time_hours": 32.5,
            "top_genres": ["Action", "Thriller"],
            "avg_session_mins": 85.0
        }
        response = client.post("/recommend", json=payload)
        assert response.status_code == 503
        assert "detail" in response.json()
        assert "not finished loading" in response.json()["detail"].lower()


def test_validation_errors():
    """Verify clean 422 responses on invalid inputs without stack traces."""
    # 1. Missing required field (watch_time_hours)
    res1 = client.post("/recommend", json={
        "user_id": "USR-1",
        "top_genres": ["Action"],
        "avg_session_mins": 45.0
    })
    assert res1.status_code == 422
    assert "Validation error" in res1.json()["detail"]

    # 2. String supplied for numeric field
    res2 = client.post("/recommend", json={
        "user_id": "USR-2",
        "watch_time_hours": "twenty",
        "top_genres": ["Action"],
        "avg_session_mins": 45.0
    })
    assert res2.status_code == 422
    assert "Validation error" in res2.json()["detail"]

    # 3. Negative watch time
    res3 = client.post("/recommend", json={
        "user_id": "USR-3",
        "watch_time_hours": -10.0,
        "top_genres": ["Action"],
        "avg_session_mins": 45.0
    })
    assert res3.status_code == 422
    assert "cannot be negative" in res3.json()["detail"]

    # 4. Negative avg session
    res4 = client.post("/recommend", json={
        "user_id": "USR-4",
        "watch_time_hours": 10.0,
        "top_genres": ["Action"],
        "avg_session_mins": -5.0
    })
    assert res4.status_code == 422
    assert "cannot be negative" in res4.json()["detail"]

    # 5. Empty user_id
    res5 = client.post("/recommend", json={
        "user_id": "   ",
        "watch_time_hours": 10.0,
        "top_genres": ["Action"],
        "avg_session_mins": 45.0
    })
    assert res5.status_code == 422
    assert "cannot be empty" in res5.json()["detail"]


class TestWithMockTrainedModel:
    @pytest.fixture(autouse=True)
    def setup_mock_model(self):
        """Build and inject a minimal scikit-learn clustering pipeline into model_manager."""
        feature_cols = [
            "watch_time_hours", "avg_session_mins", 
            "genre_Action", "genre_Thriller", "genre_Comedy", "genre_Drama"
        ]
        # Generate dummy data for 4 clusters
        np.random.seed(42)
        X_dummy = np.random.uniform(0, 100, size=(40, len(feature_cols)))
        
        scaler = StandardScaler()
        kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
        
        # Fit pipeline with feature names
        df_dummy = pd.DataFrame(X_dummy, columns=feature_cols)
        pipeline = Pipeline([
            ("scaler", scaler),
            ("kmeans", kmeans)
        ])
        pipeline.fit(df_dummy)
        
        # Inject into model_manager
        model_manager._unpack_pipeline(pipeline)
        model_manager.feature_names = feature_cols
        model_manager.model_loaded = True
        model_manager.segments = DEFAULT_SEGMENTS.copy()
        
        yield
        
        # Teardown / reset if necessary

    def test_health_with_model_loaded(self):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True
        assert data["features_count"] == 6

    def test_standard_recommendation(self):
        payload = {
            "user_id": "USR-8192",
            "watch_time_hours": 32.5,
            "top_genres": ["Action", "Thriller"],
            "avg_session_mins": 85.0
        }
        res = client.post("/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "USR-8192"
        assert isinstance(data["segment_id"], int)
        assert isinstance(data["segment_name"], str)
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) > 0
        assert isinstance(data["distance_to_centroid"], float)
        assert data["distance_to_centroid"] >= 0.0

    def test_unseen_genre_graceful_handling(self):
        """Verify that unknown/unseen genres do not cause KeyError or crash."""
        payload = {
            "user_id": "USR-9901",
            "watch_time_hours": 15.0,
            "top_genres": ["Experimental Indie Noir", "Obscure Cinema"],
            "avg_session_mins": 45.0
        }
        res = client.post("/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["segment_id"] in [0, 1, 2, 3]

    def test_empty_top_genres(self):
        """Verify that an empty list of genres works gracefully."""
        payload = {
            "user_id": "USR-9902",
            "watch_time_hours": 20.0,
            "top_genres": [],
            "avg_session_mins": 50.0
        }
        res = client.post("/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["segment_id"] in [0, 1, 2, 3]

    def test_zero_watch_time(self):
        """Verify cold start user with 0.0 watch time."""
        payload = {
            "user_id": "USR-9903",
            "watch_time_hours": 0.0,
            "top_genres": ["Comedy"],
            "avg_session_mins": 0.0
        }
        res = client.post("/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["distance_to_centroid"] >= 0.0

    def test_extreme_watch_time(self):
        """Verify large watch time values without overflow or errors."""
        payload = {
            "user_id": "USR-9904",
            "watch_time_hours": 500.0,
            "top_genres": ["Action", "Sci-Fi"],
            "avg_session_mins": 360.0
        }
        res = client.post("/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["distance_to_centroid"] >= 0.0

    def test_determinism_repeated_requests(self):
        """Verify identical repeated requests yield deterministic responses."""
        payload = {
            "user_id": "USR-8192",
            "watch_time_hours": 32.5,
            "top_genres": ["Action", "Thriller"],
            "avg_session_mins": 85.0
        }
        res1 = client.post("/recommend", json=payload).json()
        res2 = client.post("/recommend", json=payload).json()
        
        assert res1["segment_id"] == res2["segment_id"]
        assert res1["segment_name"] == res2["segment_name"]
        assert res1["recommendations"] == res2["recommendations"]
        assert res1["distance_to_centroid"] == res2["distance_to_centroid"]


# ---------------------------------------------------------------------------
# GET /segments  &  GET /metrics
# ---------------------------------------------------------------------------

def test_segments_no_model():
    """When model is not loaded, /segments returns 503."""
    if not model_manager.model_loaded:
        res = client.get("/segments")
        assert res.status_code == 503
        assert "detail" in res.json()


def test_metrics_missing_artifact(tmp_path, monkeypatch):
    """When no metrics file exists, /metrics returns 404."""
    import api.main as main_mod
    orig_candidates = getattr(main_mod, "_METRICS_CANDIDATES", None)
    # Override with a path that doesn't exist
    monkeypatch.setattr(main_mod, "_METRICS_CANDIDATES",
                        [tmp_path / "nonexistent.json"], raising=False)
    orig_meta = model_manager.metadata
    model_manager.metadata = {}
    try:
        res = client.get("/metrics")
        assert res.status_code == 404
    finally:
        model_manager.metadata = orig_meta
        if orig_candidates is not None:
            monkeypatch.setattr(main_mod, "_METRICS_CANDIDATES",
                                orig_candidates, raising=False)


class TestLiveDataEndpoints:
    """Tests that require real on-disk artifacts; skipped if unavailable."""

    def test_segments_valid_structure(self):
        if not model_manager.model_loaded:
            pytest.skip("Model not loaded.")
        res = client.get("/segments")
        assert res.status_code == 200
        data = res.json()
        assert "k_clusters" in data or "segments" in data

    def test_segments_list_format(self):
        if not model_manager.model_loaded:
            pytest.skip("Model not loaded.")
        res = client.get("/segments?format=list")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_metrics_valid_structure(self):
        res = client.get("/metrics")
        if res.status_code == 404:
            pytest.skip("No metrics artifact; acceptable pre-evaluation.")
        assert res.status_code == 200
        data = res.json()
        assert "silhouette_score" in data
        assert "k_clusters" in data
        assert isinstance(data["cluster_sizes"], list)


def test_recommend_with_persisted_extractor_pipeline():
    """Verify inference works directly when the pipeline embeds ViewerFeatureExtractor."""
    from common.preprocessing import ViewerFeatureExtractor

    raw_records = pd.DataFrame([
        {"user_id": f"U{i}", "watch_time_hours": float(i * 10), "avg_session_mins": float(i * 20), "top_genres": ["Action"]}
        for i in range(10)
    ])

    pipeline = Pipeline([
        ("extractor", ViewerFeatureExtractor()),
        ("scaler", StandardScaler()),
        ("kmeans", KMeans(n_clusters=4, random_state=42, n_init=10))
    ])
    pipeline.fit(raw_records)

    orig_pipe = model_manager.pipeline
    orig_loaded = model_manager.model_loaded
    orig_segments = model_manager.segments

    try:
        model_manager._unpack_pipeline(pipeline)
        model_manager.model_loaded = True
        model_manager.segments = DEFAULT_SEGMENTS.copy()

        payload = {
            "user_id": "USR-EXTRACTOR-TEST",
            "watch_time_hours": 35.0,
            "top_genres": ["Action", "Thriller"],
            "avg_session_mins": 80.0
        }
        res = client.post("/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "USR-EXTRACTOR-TEST"
        assert isinstance(data["segment_id"], int)
        assert isinstance(data["distance_to_centroid"], float)
        assert data["distance_to_centroid"] >= 0.0
    finally:
        model_manager.pipeline = orig_pipe
        model_manager.model_loaded = orig_loaded
        model_manager.segments = orig_segments
