"""
Pydantic schemas for training endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class TrainingDataRecord(BaseModel):
    """Single record for training data."""
    disposicion: str = Field(..., description="CANDIDATE or CONFIRMED")
    radio_planeta: float = Field(..., description="Planet radius")
    temp_planeta: float = Field(..., description="Planet temperature in Kelvin")
    periodo_orbital: float = Field(..., description="Orbital period in days")
    temp_estrella: float = Field(..., description="Star temperature in Kelvin")
    radio_estrella: float = Field(..., description="Star radius")
    loc1_ra: float = Field(..., description="Right Ascension coordinate")
    loc2_dec: float = Field(..., description="Declination coordinate")
    loc3_dist: float = Field(..., description="Distance to star in parsecs")
    id_objeto: Optional[str] = Field(None, description="Object ID (optional, will be dropped)")


class TrainModelJSONRequest(BaseModel):
    """Request model for training with JSON data."""
    data: List[TrainingDataRecord] = Field(
        ..., 
        description="List of training records",
        min_length=100  # Minimum samples for meaningful training
    )
    force: bool = Field(
        False, 
        description="Force retrain (not implemented for safety)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "disposicion": "CONFIRMED",
                        "radio_planeta": 1.0,
                        "temp_planeta": 300.0,
                        "periodo_orbital": 365.0,
                        "temp_estrella": 5778.0,
                        "radio_estrella": 1.0,
                        "loc1_ra": 180.0,
                        "loc2_dec": 0.0,
                        "loc3_dist": 100.0
                    },
                    {
                        "disposicion": "CANDIDATE",
                        "radio_planeta": 2.5,
                        "temp_planeta": 450.0,
                        "periodo_orbital": 200.0,
                        "temp_estrella": 6200.0,
                        "radio_estrella": 1.5,
                        "loc1_ra": 150.0,
                        "loc2_dec": 30.0,
                        "loc3_dist": 150.0
                    }
                ],
                "force": False
            }
        }


class TrainingMetrics(BaseModel):
    """Training metrics."""
    accuracy: float
    test_samples: int
    classification_report: Dict[str, Any]
    confusion_matrix: List[List[int]]


class TrainModelResponse(BaseModel):
    """Response model for training endpoints."""
    status: str
    message: str
    model_path: str
    metrics: TrainingMetrics
    features: List[str]
    num_features: int
    label_mapping: Dict[str, int]
    training_samples: int
    test_samples: int
    training_duration_seconds: float
    timestamp: str


class ModelStatusResponse(BaseModel):
    """Response for model existence check."""
    model_exists: bool
    model_path: str
    message: str
    can_train: bool
