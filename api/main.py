import json
import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.schemas import (
    ViewerProfileRequest,
    RecommendResponse,
    HealthResponse,
    ErrorResponse,
)
from api.model_loader import model_manager
from api.recommender import generate_recommendation

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("audience_api")

APP_START_TIME = time.time()

# Ordered candidate paths for the evaluator metrics artifact.
# Exposed at module level so tests can monkeypatch without touching the handler.
_METRICS_CANDIDATES: list = [
    Path("/output/metrics.json"),
    Path("/models/metrics.json"),
    Path("metrics.json"),
    Path("/app/metrics.json"),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for clean startup and resource handling."""
    logger.info("Starting Audience Segmentation & Personalization API Service...")
    # Attempt initial model pipeline loading
    loaded = model_manager.load()
    if loaded:
        logger.info(
            f"Clustering pipeline ready: {model_manager.model_type} with "
            f"{len(model_manager.feature_names)} features and {len(model_manager.segments)} segments."
        )
    else:
        logger.warning("Pipeline artifact not loaded at startup; will retry on incoming requests.")
    yield
    logger.info("Shutting down Audience Segmentation API Service.")


app = FastAPI(
    title="Audience Segmentation & Personalization Service",
    description="Containerized REST API for behavioral clustering and personalized content recommendations.",
    version="1.0.0",
    lifespan=lifespan,
    responses={
        422: {"model": ErrorResponse, "description": "Validation Error"},
        503: {"model": ErrorResponse, "description": "Service Unavailable / Model Pending"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)

# CORS configuration to support frontend and evaluator interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Format request validation errors cleanly without exposing internal stack traces.
    """
    error_messages = []
    for err in exc.errors():
        field_loc = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        msg = err.get("msg", "Invalid input")
        error_messages.append(f"{field_loc}: {msg}" if field_loc else msg)
    
    clean_detail = "Validation error: " + "; ".join(error_messages)
    logger.warning(f"Request validation failed for {request.url.path}: {clean_detail}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": clean_detail},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Return clean HTTP error messages."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler ensuring no internal stack traces leak to the caller.
    """
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred while processing the request."},
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Healthcheck endpoint"
)
async def health_check() -> HealthResponse:
    """
    Exposes service health status.
    If the model was not ready at startup, attempts a lazy reload from /models.
    """
    model_manager.load_if_needed()
    uptime = round(time.time() - APP_START_TIME, 2)
    
    if model_manager.model_loaded:
        return HealthResponse(
            status="ok",
            model_loaded=True,
            version="1.0.0",
            uptime_seconds=uptime,
            model_type=model_manager.model_type,
            features_count=len(model_manager.feature_names) if model_manager.feature_names else None,
        )
    
    return HealthResponse(
        status="starting",
        model_loaded=False,
        version="1.0.0",
        uptime_seconds=uptime,
        model_type=None,
        features_count=None,
    )


@app.post(
    "/recommend",
    response_model=RecommendResponse,
    tags=["Inference"],
    summary="Assign audience segment and return personalized recommendations",
)
async def recommend(profile: ViewerProfileRequest) -> RecommendResponse:
    """
    Predicts the audience segment for the given viewer profile and generates
    personalized content recommendations with distance to cluster centroid.
    Never retrains during requests.
    """
    # Attempt lazy-load if model wasn't ready at startup
    if not model_manager.model_loaded:
        model_manager.load_if_needed()

    if not model_manager.model_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model pipeline has not finished loading. Please wait for model artifact generation.",
        )

    try:
        response = generate_recommendation(profile, model_manager)
        return response
    except Exception as e:
        logger.error(f"Recommendation generation error for user {profile.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendation for the specified user profile.",
        )


@app.get(
    "/segments",
    tags=["Inference"],
    summary="Get current persisted segment metadata",
)
async def get_segments(format: Optional[str] = None) -> Any:
    """
    Returns current persisted segment metadata from /models/metadata.json.
    Never retrains during requests.
    """
    model_manager.load_if_needed()
    if not model_manager.model_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model pipeline has not finished loading. Please wait for model artifact generation.",
        )

    meta_candidates = [
        Path("/models/metadata.json"),
        Path("models/metadata.json"),
        Path("/app/models/metadata.json"),
    ]
    meta_dict = None
    for p in meta_candidates:
        if p.exists() and p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    meta_dict = json.load(f)
                    break
            except Exception as e:
                logger.warning(f"Failed to read metadata file {p}: {e}")

    if meta_dict is None and model_manager.metadata:
        meta_dict = model_manager.metadata

    if meta_dict is None:
        meta_dict = {
            "segments": list(model_manager.segments.values()),
            "k_clusters": len(model_manager.segments),
            "total_training_samples": 10000,
            "model_version": "1.0.0",
            "algorithm": model_manager.model_type or "StandardScaler + KMeans",
        }

    if format == "list":
        return meta_dict.get("segments", [])
    return meta_dict


@app.get(
    "/metrics",
    tags=["System"],
    summary="Get current evaluator metrics",
)
async def get_metrics() -> Dict[str, Any]:
    """
    Returns current evaluator metrics from the generated metrics artifact.
    """
    for p in _METRICS_CANDIDATES:
        if p.exists() and p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading metrics artifact {p}: {e}")

    if model_manager.metadata and "metrics" in model_manager.metadata:
        return model_manager.metadata["metrics"]

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Metrics artifact not available yet.",
    )


@app.get("/", tags=["System"])
async def root() -> Dict[str, Any]:
    """Service metadata and documentation link."""
    return {
        "service": "Audience Segmentation & Personalization API",
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/health",
        "segments_url": "/segments",
        "metrics_url": "/metrics",
    }
