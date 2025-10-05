"""
Service for loading and managing the LightGBM exoplanet classification model.
"""
import os
import joblib
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


class ModelService:
    """Service to manage the LightGBM model for exoplanet classification."""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the model service.
        
        Args:
            model_path: Path to the joblib model file. If None, uses default path.
        """
        self.model_path = model_path or os.getenv(
            "MODEL_PATH", 
            "./models/exoplanets_lgbm_pipeline.joblib"
        )
        self.bundle: Optional[Dict[str, Any]] = None
        self.pipeline = None
        self.features: List[str] = []
        self.label_mapping: Dict[str, int] = {}
        self.reverse_mapping: Dict[int, str] = {}
        self._is_loaded = False
        
    def load_model(self) -> None:
        """Load the model from disk."""
        if self._is_loaded:
            logger.info("Model already loaded, skipping reload")
            return
            
        model_file = Path(self.model_path)
        if not model_file.exists():
            raise FileNotFoundError(
                f"Model file not found at: {self.model_path}. "
                "Please ensure the model has been trained and saved."
            )
        
        logger.info(f"Loading model from: {self.model_path}")
        
        try:
            self.bundle = joblib.load(self.model_path)
            self.pipeline = self.bundle['pipeline']
            self.features = self.bundle['features']
            self.label_mapping = self.bundle['label_mapping']
            
            # Create reverse mapping for predictions
            self.reverse_mapping = {v: k for k, v in self.label_mapping.items()}
            
            self._is_loaded = True
            logger.info(f"Model loaded successfully. Features: {len(self.features)}")
            logger.info(f"Label mapping: {self.label_mapping}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._is_loaded
    
    def get_features(self) -> List[str]:
        """Get list of required features."""
        if not self._is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        return self.features
    
    def get_label_mapping(self) -> Dict[str, int]:
        """Get label mapping."""
        if not self._is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        return self.label_mapping
    
    def predict_single(self, features_dict: Dict[str, float]) -> Dict[str, Any]:
        """
        Make a prediction for a single candidate.
        
        Args:
            features_dict: Dictionary with feature names and values
            
        Returns:
            Dictionary with prediction results
        """
        if not self._is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        # Validate features
        missing_features = set(self.features) - set(features_dict.keys())
        if missing_features:
            raise ValueError(f"Missing features: {missing_features}")
        
        # Create DataFrame with features in correct order
        df = pd.DataFrame([features_dict])[self.features]
        
        # Make prediction
        prediction = int(self.pipeline.predict(df)[0])
        probabilities = self.pipeline.predict_proba(df)[0]
        
        # For multiclass: get probabilities for all classes
        probability_dict = {
            self.reverse_mapping[i]: float(prob) 
            for i, prob in enumerate(probabilities)
        }
        max_probability = float(max(probabilities))
        
        # Determine confidence level based on max probability
        confidence = self._get_confidence_level(max_probability)
        
        return {
            "prediction": self.reverse_mapping[prediction],
            "prediction_code": prediction,
            "probabilities": probability_dict,
            "max_probability": max_probability,
            "confidence": confidence,
        }
    
    def predict_batch(self, features_list: List[Dict[str, float]]) -> List[Dict[str, Any]]:
        """
        Make predictions for multiple candidates.
        
        Args:
            features_list: List of dictionaries with feature names and values
            
        Returns:
            List of prediction results
        """
        if not self._is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        results = []
        for features_dict in features_list:
            result = self.predict_single(features_dict)
            results.append(result)
        
        return results
    
    @staticmethod
    def _get_confidence_level(probability: float) -> str:
        """
        Determine confidence level based on probability.
        
        Args:
            probability: Maximum probability value between 0 and 1
            
        Returns:
            Confidence level: 'high', 'medium', or 'low'
        """
        if probability >= 0.7:
            return "high"
        elif probability >= 0.5:
            return "medium"
        else:
            return "low"
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        if not self._is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        return {
            "model_type": self.bundle.get('best_name', 'LightGBM'),
            "model_version": "1.0.0",
            "features": self.features,
            "num_features": len(self.features),
            "labels": list(self.label_mapping.keys()),
            "label_mapping": self.label_mapping,
            "model_path": self.model_path,
        }


# Global model service instance
_model_service: Optional[ModelService] = None


def get_model_service() -> ModelService:
    """
    Get or create the global model service instance.
    
    Returns:
        ModelService instance
    """
    global _model_service
    
    if _model_service is None:
        _model_service = ModelService()
        try:
            _model_service.load_model()
        except FileNotFoundError:
            logger.warning(
                "Model file not found. The service will start but predictions will fail. "
                "Please ensure the model is properly deployed."
            )
    
    return _model_service
