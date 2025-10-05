"""
FastAPI application for exoplanet classification model inference.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Exoplanet Classification API",
    description="API for classifying exoplanet candidates using LightGBM model",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response validation
class ExoplanetFeatures(BaseModel):
    """Features required for exoplanet classification."""
    radio_planeta: float = Field(..., description="Planet radius")
    temp_planeta: float = Field(..., description="Planet temperature in Kelvin")
    periodo_orbital: float = Field(..., description="Orbital period in days")
    temp_estrella: float = Field(..., description="Star temperature in Kelvin")
    radio_estrella: float = Field(..., description="Star radius")
    loc1_ra: float = Field(..., description="Right Ascension coordinate")
    loc2_dec: float = Field(..., description="Declination coordinate")
    loc3_dist: float = Field(..., description="Distance to star in parsecs")

    class Config:
        json_schema_extra = {
            "example": {
                "radio_planeta": 1.0,
                "temp_planeta": 300.0,
                "periodo_orbital": 365.0,
                "temp_estrella": 5778.0,
                "radio_estrella": 1.0,
                "loc1_ra": 180.0,
                "loc2_dec": 0.0,
                "loc3_dist": 100.0
            }
        }


class PredictionResponse(BaseModel):
    """Response model for prediction endpoint."""
    prediction: str = Field(..., description="CONFIRMED or CANDIDATE")
    prediction_code: int = Field(..., description="1 for CONFIRMED, 0 for CANDIDATE")
    probability: float = Field(..., description="Probability of being CONFIRMED")
    confidence: str = Field(..., description="high, medium, or low")
    timestamp: str = Field(..., description="Prediction timestamp")


class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions."""
    candidates: List[ExoplanetFeatures]


class BatchPredictionResponse(BaseModel):
    """Response model for batch predictions."""
    predictions: List[PredictionResponse]
    total_processed: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    timestamp: str


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Exoplanet Classification API",
        "docs": "/api/docs",
        "health": "/api/v1/health"
    }


@app.get("/api/v1/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Check API health and model status.
    """
    # TODO: Add actual model loading check
    return HealthResponse(
        status="healthy",
        model_loaded=False,  # Will be True once model is implemented
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


@app.post("/api/v1/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(features: ExoplanetFeatures):
    """
    Classify a single exoplanet candidate.
    
    This endpoint will use the trained LightGBM model to predict whether
    a candidate is CONFIRMED or CANDIDATE based on its features.
    """
    # TODO: Implement actual model inference
    # For now, return a mock response
    logger.info(f"Prediction request received: {features.dict()}")
    
    raise HTTPException(
        status_code=501,
        detail="Model inference not yet implemented. Awaiting migration from notebook."
    )


@app.post("/api/v1/predict/batch", response_model=BatchPredictionResponse, tags=["Prediction"])
async def predict_batch(request: BatchPredictionRequest):
    """
    Classify multiple exoplanet candidates in a single request.
    
    This endpoint allows batch processing of multiple candidates.
    """
    # TODO: Implement batch prediction
    logger.info(f"Batch prediction request received: {len(request.candidates)} candidates")
    
    raise HTTPException(
        status_code=501,
        detail="Batch prediction not yet implemented. Awaiting migration from notebook."
    )


@app.get("/api/v1/model/info", tags=["Model Management"])
async def model_info():
    """
    Get information about the loaded model.
    """
    # TODO: Return actual model metadata
    return {
        "model_type": "LightGBM",
        "model_version": "not_loaded",
        "features": [
            "radio_planeta",
            "temp_planeta",
            "periodo_orbital",
            "temp_estrella",
            "radio_estrella",
            "loc1_ra",
            "loc2_dec",
            "loc3_dist"
        ],
        "labels": ["CANDIDATE", "CONFIRMED"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
