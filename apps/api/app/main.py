"""
FastAPI application for exoplanet classification model inference.
"""
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging
import tempfile
import os

from app.services.model_service import get_model_service, ModelService
from app.services.training_service import get_training_service, TrainingService
from app.schemas.training import (
    TrainModelJSONRequest,
    TrainModelResponse,
    ModelStatusResponse,
    TrainingMetrics
)

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
    pl_rade: float = Field(..., description="Planet radius in Earth radii")
    pl_eqt: float = Field(..., description="Planet equilibrium temperature in Kelvin")
    pl_orbper: float = Field(..., description="Orbital period in days")
    st_teff: float = Field(..., description="Star effective temperature in Kelvin")
    st_rad: float = Field(..., description="Star radius in solar radii")
    st_logg: float = Field(..., description="Star surface gravity (log g)")
    st_tmag: float = Field(..., description="Star TESS magnitude (brightness)")
    ra: float = Field(..., description="Right Ascension (celestial longitude)")
    dec: float = Field(..., description="Declination (celestial latitude)")
    st_dist: float = Field(..., description="Distance to star in parsecs")

    class Config:
        json_schema_extra = {
            "example": {
                "pl_rade": 1.0,
                "pl_eqt": 300.0,
                "pl_orbper": 365.0,
                "st_teff": 5778.0,
                "st_rad": 1.0,
                "st_logg": 4.4,
                "st_tmag": 10.0,
                "ra": 180.0,
                "dec": 0.0,
                "st_dist": 100.0
            }
        }


class PredictionResponse(BaseModel):
    """Response model for prediction endpoint."""
    prediction: str = Field(..., description="Predicted class: CANDIDATE, CONFIRMED, FALSE POSITIVE, or REFUTED")
    prediction_code: int = Field(..., description="Class code: 0=CANDIDATE, 1=CONFIRMED, 2=FALSE POSITIVE, 3=REFUTED")
    probabilities: dict = Field(..., description="Probabilities for all classes")
    max_probability: float = Field(..., description="Maximum probability (confidence in prediction)")
    confidence: str = Field(..., description="Confidence level: high, medium, or low")
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


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    logger.info("Starting up API...")
    try:
        model_service = get_model_service()
        if model_service.is_loaded():
            logger.info("Model loaded successfully on startup")
        else:
            logger.warning("Model not loaded on startup")
    except Exception as e:
        logger.error(f"Error during startup: {e}")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Exoplanet Classification API",
        "docs": "/api/docs",
        "health": "/api/v1/health"
    }


@app.get("/api/v1/health", response_model=HealthResponse, tags=["Health"])
async def health_check(model_service: ModelService = Depends(get_model_service)):
    """
    Check API health and model status.
    """
    return HealthResponse(
        status="healthy",
        model_loaded=model_service.is_loaded(),
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


@app.post("/api/v1/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(
    features: ExoplanetFeatures,
    model_service: ModelService = Depends(get_model_service)
):
    """
    Classify a single exoplanet candidate.
    
    This endpoint uses the trained LightGBM model to predict whether
    a candidate is CONFIRMED or CANDIDATE based on its features.
    """
    logger.info(f"Prediction request received: {features.dict()}")
    
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs and ensure model file exists."
        )
    
    try:
        # Convert Pydantic model to dict
        features_dict = features.dict()
        
        # Make prediction
        result = model_service.predict_single(features_dict)
        
        # Add timestamp
        result["timestamp"] = datetime.utcnow().isoformat() + "Z"
        
        logger.info(f"Prediction result: {result['prediction']} (prob: {result['max_probability']:.4f})")
        
        return PredictionResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/api/v1/predict/batch", response_model=BatchPredictionResponse, tags=["Prediction"])
async def predict_batch(
    request: BatchPredictionRequest,
    model_service: ModelService = Depends(get_model_service)
):
    """
    Classify multiple exoplanet candidates in a single request.
    
    This endpoint allows batch processing of multiple candidates.
    """
    logger.info(f"Batch prediction request received: {len(request.candidates)} candidates")
    
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs and ensure model file exists."
        )
    
    try:
        # Convert candidates to list of dicts
        features_list = [candidate.dict() for candidate in request.candidates]
        
        # Make predictions
        results = model_service.predict_batch(features_list)
        
        # Add timestamps to all results
        timestamp = datetime.utcnow().isoformat() + "Z"
        predictions = []
        for result in results:
            result["timestamp"] = timestamp
            predictions.append(PredictionResponse(**result))
        
        logger.info(f"Batch prediction completed: {len(predictions)} predictions")
        
        return BatchPredictionResponse(
            predictions=predictions,
            total_processed=len(predictions)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/v1/model/info", tags=["Model Management"])
async def model_info(model_service: ModelService = Depends(get_model_service)):
    """
    Get information about the loaded model.
    """
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs and ensure model file exists."
        )
    
    try:
        return model_service.get_model_info()
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/v1/training/status", response_model=ModelStatusResponse, tags=["Training"])
async def check_training_status(training_service: TrainingService = Depends(get_training_service)):
    """
    Check if a model exists and if training is possible.
    
    This endpoint is useful to verify before attempting to train a new model.
    """
    model_exists = training_service.model_exists()
    
    if model_exists:
        message = f"Model already exists at {training_service.model_path}. Cannot train without deleting existing model."
        can_train = False
    else:
        message = f"No model found at {training_service.model_path}. Ready to train."
        can_train = True
    
    return ModelStatusResponse(
        model_exists=model_exists,
        model_path=training_service.model_path,
        message=message,
        can_train=can_train
    )


@app.post("/api/v1/training/train-csv", response_model=TrainModelResponse, tags=["Training"])
async def train_model_csv(
    file: UploadFile = File(..., description="CSV file with training data"),
    training_service: TrainingService = Depends(get_training_service)
):
    """
    Train a new model from CSV file upload.
    
    **Requirements:**
    - CSV must contain 'disposicion' column with values: 'CANDIDATE' or 'CONFIRMED'
    - CSV must contain all required feature columns
    - Minimum 100 samples recommended for meaningful training
    - Model must NOT already exist (check /api/v1/training/status first)
    
    **CSV Format:**
    ```
    disposicion,radio_planeta,temp_planeta,periodo_orbital,temp_estrella,radio_estrella,loc1_ra,loc2_dec,loc3_dist
    CONFIRMED,1.0,300.0,365.0,5778.0,1.0,180.0,0.0,100.0
    CANDIDATE,2.5,450.0,200.0,6200.0,1.5,150.0,30.0,150.0
    ```
    
    **Performance Note:** For large datasets (>10MB), CSV upload is more efficient than JSON.
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a CSV file."
        )
    
    # Check if model already exists
    if training_service.model_exists():
        raise HTTPException(
            status_code=409,
            detail=f"Model already exists at {training_service.model_path}. "
                   "Cannot train a new model. Please delete the existing model first."
        )
    
    logger.info(f"Received CSV file for training: {file.filename}")
    
    # Save uploaded file to temporary location
    try:
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        logger.info(f"CSV saved to temporary file: {tmp_file_path}")
        
        # Train model
        result = training_service.train_from_csv(tmp_file_path, force=False)
        
        # Clean up temporary file
        os.unlink(tmp_file_path)
        logger.info("Temporary file cleaned up")
        
        # Format response
        response = TrainModelResponse(
            status=result['status'],
            message=f"Model trained successfully from CSV file '{file.filename}'",
            model_path=result['model_path'],
            metrics=TrainingMetrics(**result['metrics']),
            features=result['features'],
            num_features=result['num_features'],
            label_mapping=result['label_mapping'],
            training_samples=result['training_samples'],
            test_samples=result['test_samples'],
            training_duration_seconds=result['training_duration_seconds'],
            timestamp=result['timestamp']
        )
        
        logger.info(f"Training completed successfully. Accuracy: {result['metrics']['accuracy']:.4f}")
        
        return response
        
    except FileExistsError as e:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
        raise HTTPException(status_code=400, detail=f"Invalid training data: {str(e)}")
    except Exception as e:
        if 'tmp_file_path' in locals() and os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post("/api/v1/training/train-json", response_model=TrainModelResponse, tags=["Training"])
async def train_model_json(
    request: TrainModelJSONRequest,
    training_service: TrainingService = Depends(get_training_service)
):
    """
    Train a new model from JSON data.
    
    **Requirements:**
    - Each record must have 'disposicion' field with values: 'CANDIDATE' or 'CONFIRMED'
    - Each record must contain all required feature fields
    - Minimum 100 samples required
    - Model must NOT already exist (check /api/v1/training/status first)
    
    **Use Cases:**
    - Small to medium datasets (<10,000 records)
    - Integration with Directus CMS or other APIs
    - When data is already in JSON format
    
    **Performance Note:** 
    - For datasets >10MB, consider using CSV upload for better efficiency
    - JSON parsing and validation adds overhead but provides better error messages
    """
    # Check if model already exists
    if training_service.model_exists():
        raise HTTPException(
            status_code=409,
            detail=f"Model already exists at {training_service.model_path}. "
                   "Cannot train a new model. Please delete the existing model first."
        )
    
    logger.info(f"Received JSON data for training: {len(request.data)} records")
    
    try:
        # Convert Pydantic models to dicts
        data_dicts = [record.dict() for record in request.data]
        
        # Train model
        result = training_service.train_from_json(data_dicts, force=request.force)
        
        # Format response
        response = TrainModelResponse(
            status=result['status'],
            message=f"Model trained successfully from {len(request.data)} JSON records",
            model_path=result['model_path'],
            metrics=TrainingMetrics(**result['metrics']),
            features=result['features'],
            num_features=result['num_features'],
            label_mapping=result['label_mapping'],
            training_samples=result['training_samples'],
            test_samples=result['test_samples'],
            training_duration_seconds=result['training_duration_seconds'],
            timestamp=result['timestamp']
        )
        
        logger.info(f"Training completed successfully. Accuracy: {result['metrics']['accuracy']:.4f}")
        
        return response
        
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid training data: {str(e)}")
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
