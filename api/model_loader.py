import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import joblib

logger = logging.getLogger("audience_api.model_loader")

# Default fallback segment catalog conforming strictly to PS Section 8
DEFAULT_SEGMENTS: Dict[int, Dict[str, Any]] = {
    0: {
        "name": "High-Engagement Action Viewers",
        "description": "Viewers characterized by heavy watch hours, long sessions, and action/thriller preference.",
        "recommendations": [
            "Extraction: Rogue Directive",
            "Shadow Protocol: Berlin",
            "Quantum Paradox (Season 2)",
            "The Dark Horizon",
            "Apex Predator: Hunt"
        ],
    },
    1: {
        "name": "Casual Short-Session Viewers",
        "description": "Quick-bite mobile viewers seeking easily consumable entertainment and short session content.",
        "recommendations": [
            "Coffee Break Chronicles",
            "Stand-Up Gold: Quick Bites",
            "Daily Animation Blitz",
            "Trending Micro-Dramas",
            "10-Minute Mystery Files"
        ],
    },
    2: {
        "name": "Genre-Explorers",
        "description": "Eclectic viewers with balanced watch patterns spanning diverse adjacent genres.",
        "recommendations": [
            "Cinema Paradiso Worldwide",
            "Parallel Universes: Sci-Fi Anthology",
            "The French Detective",
            "Frontiers of Deep Space",
            "Echoes of History: The Silk Road"
        ],
    },
    3: {
        "name": "Low-Activity Viewers",
        "description": "Occasional or low-frequency viewers who respond best to universal, low-friction content.",
        "recommendations": [
            "Global Top 10: The Crown Jewel",
            "Family Game Night Championship",
            "Summer Odyssey",
            "The Reunion Special",
            "Sunday Cinema Showcase"
        ],
    },
}

DEFAULT_GENRES = [
    "Action", "Thriller", "Sci-Fi", "Drama", "Comedy",
    "Romance", "Documentary", "Animation", "Family", "Horror",
    "Crime", "Adventure"
]


class ModelManager:
    """
    Manages loading and caching of the persisted clustering pipeline and metadata.
    Never retrains during requests.
    Supports dynamic feature schema resolution and lazy reloading.
    """

    def __init__(self, model_dir: Optional[str] = None):
        self.configured_model_dir = model_dir
        self.model_dir: Optional[Path] = None
        self.pipeline: Any = None
        self.metadata: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.segments: Dict[int, Dict[str, Any]] = DEFAULT_SEGMENTS.copy()
        self.model_loaded: bool = False
        self.model_type: Optional[str] = None
        self.scaler: Any = None
        self.kmeans: Any = None

    def _resolve_model_dir(self) -> Optional[Path]:
        candidates: List[Path] = []
        
        # 1. Explicitly configured path or env var
        env_dir = os.environ.get("MODEL_DIR") or self.configured_model_dir
        if env_dir:
            candidates.append(Path(env_dir))
        
        # 2. Standard Docker shared volume path
        candidates.append(Path("/models"))
        
        # 3. Project-relative paths
        base_dir = Path(__file__).resolve().parent.parent
        candidates.append(base_dir / "models")
        candidates.append(Path(__file__).resolve().parent / "models")
        candidates.append(Path("./models"))

        for candidate in candidates:
            if candidate.exists() and candidate.is_dir():
                return candidate.resolve()
        
        return None

    def load(self, force: bool = False) -> bool:
        """
        Attempts to find and load the persisted pipeline and metadata.
        Returns True if successfully loaded, False otherwise.
        """
        if self.model_loaded and not force:
            return True

        resolved_dir = self._resolve_model_dir()
        if not resolved_dir:
            logger.warning("No valid model directory found among candidate paths.")
            return False

        self.model_dir = resolved_dir
        logger.info(f"Checking model directory: {self.model_dir}")

        # Look for pipeline artifacts
        model_filenames = [
            "pipeline.joblib",
            "model.joblib",
            "clustering_pipeline.joblib",
            "pipeline.pkl",
            "model.pkl",
        ]
        
        pipeline_path: Optional[Path] = None
        for fname in model_filenames:
            candidate = self.model_dir / fname
            if candidate.exists() and candidate.is_file():
                pipeline_path = candidate
                break

        if not pipeline_path:
            logger.info(f"No pipeline artifact found in {self.model_dir}. Trainer may still be running.")
            return False

        try:
            logger.info(f"Loading model pipeline from {pipeline_path}")
            loaded_obj = joblib.load(pipeline_path)
            self._unpack_pipeline(loaded_obj)
        except Exception as e:
            logger.error(f"Failed to load pipeline from {pipeline_path}: {e}")
            return False

        # Look for segment metadata
        metadata_filenames = [
            "metadata.json",
            "segment_metadata.json",
            "model_metadata.json",
        ]
        metadata_path: Optional[Path] = None
        for mname in metadata_filenames:
            candidate = self.model_dir / mname
            if candidate.exists() and candidate.is_file():
                metadata_path = candidate
                break

        if metadata_path:
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded segment metadata from {metadata_path}")
                self._apply_metadata()
            except Exception as e:
                logger.warning(f"Failed to parse metadata from {metadata_path}: {e}")

        self.model_loaded = True
        return True

    def _unpack_pipeline(self, obj: Any) -> None:
        """Inspects and extracts pipeline steps and feature schema."""
        self.pipeline = obj
        self.scaler = None
        self.kmeans = None
        self.model_type = type(obj).__name__

        # Scikit-learn Pipeline
        if hasattr(obj, "named_steps"):
            self.model_type = "Pipeline (" + " -> ".join(obj.named_steps.keys()) + ")"
            for name, step in obj.named_steps.items():
                lower_name = name.lower()
                step_type = type(step).__name__.lower()
                if "scale" in lower_name or "scaler" in step_type:
                    self.scaler = step
                if "kmeans" in lower_name or "cluster" in lower_name or "kmeans" in step_type:
                    self.kmeans = step

            # Check if features_names_in_ is present on pipeline or first step
            if hasattr(obj, "feature_names_in_"):
                self.feature_names = list(obj.feature_names_in_)
            elif self.scaler and hasattr(self.scaler, "feature_names_in_"):
                self.feature_names = list(self.scaler.feature_names_in_)

        # Tuple or Dict of (scaler, kmeans)
        elif isinstance(obj, (tuple, list)) and len(obj) == 2:
            self.scaler, self.kmeans = obj[0], obj[1]
            self.model_type = f"{type(self.scaler).__name__} + {type(self.kmeans).__name__}"
            if hasattr(self.scaler, "feature_names_in_"):
                self.feature_names = list(self.scaler.feature_names_in_)

        # Direct clustering estimator (e.g. KMeans)
        elif hasattr(obj, "cluster_centers_") or hasattr(obj, "predict"):
            self.kmeans = obj
            if hasattr(obj, "feature_names_in_"):
                self.feature_names = list(obj.feature_names_in_)

    def _apply_metadata(self) -> None:
        """Merges persisted metadata into segment definitions."""
        # 1. Feature schema if specified
        if "features" in self.metadata and isinstance(self.metadata["features"], list):
            self.feature_names = self.metadata["features"]
        elif "feature_names" in self.metadata and isinstance(self.metadata["feature_names"], list):
            self.feature_names = self.metadata["feature_names"]

        # 2. Segments dictionary or list
        raw_segments = self.metadata.get("segments") or self.metadata.get("clusters")
        if isinstance(raw_segments, list):
            for i, seg in enumerate(raw_segments):
                if isinstance(seg, dict):
                    seg_id = seg.get("segment_id", seg.get("id", i))
                    self.segments[int(seg_id)] = {
                        "name": seg.get("segment_name", seg.get("name", f"Segment {seg_id}")),
                        "description": seg.get("description", ""),
                        "recommendations": seg.get("recommendations", DEFAULT_SEGMENTS.get(seg_id, {}).get("recommendations", []))
                    }
        elif isinstance(raw_segments, dict):
            for key, val in raw_segments.items():
                try:
                    seg_id = int(key)
                except ValueError:
                    continue
                if isinstance(val, dict):
                    self.segments[seg_id] = {
                        "name": val.get("segment_name", val.get("name", f"Segment {seg_id}")),
                        "description": val.get("description", ""),
                        "recommendations": val.get("recommendations", DEFAULT_SEGMENTS.get(seg_id, {}).get("recommendations", []))
                    }

    def load_if_needed(self) -> bool:
        """Lazy load check; called during requests or health checks."""
        if not self.model_loaded:
            return self.load()
        return True


# Global singleton instance
model_manager = ModelManager()
