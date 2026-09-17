from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ViewerProfileRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user_id: str = Field(
        ..., 
        description="Unique user identifier",
        examples=["USR-8192"]
    )
    watch_time_hours: float = Field(
        ..., 
        description="Total watch time in hours. Must be non-negative.",
        examples=[32.5]
    )
    top_genres: List[str] = Field(
        default_factory=list,
        description="List of favorite or top genres. Can be empty or contain unseen genres.",
        examples=[["Action", "Thriller"]]
    )
    avg_session_mins: float = Field(
        ..., 
        description="Average viewing session duration in minutes. Must be non-negative.",
        examples=[85.0]
    )

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("user_id cannot be empty")
        return v.strip()

    @field_validator("watch_time_hours")
    @classmethod
    def validate_watch_time(cls, v: float) -> float:
        if v < 0:
            raise ValueError("watch_time_hours cannot be negative")
        return float(v)

    @field_validator("avg_session_mins")
    @classmethod
    def validate_avg_session(cls, v: float) -> float:
        if v < 0:
            raise ValueError("avg_session_mins cannot be negative")
        return float(v)

    @field_validator("top_genres", mode="before")
    @classmethod
    def sanitize_genres(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if item is not None and str(item).strip()]
        return []


class RecommendResponse(BaseModel):
    user_id: str
    segment_id: int
    segment_name: str
    recommendations: List[str]
    distance_to_centroid: float
    raw_features: Optional[Dict[str, float]] = None
    inference_time_ms: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str = "1.0.0"
    uptime_seconds: Optional[float] = None
    model_type: Optional[str] = None
    features_count: Optional[int] = None


class ErrorResponse(BaseModel):
    detail: str
