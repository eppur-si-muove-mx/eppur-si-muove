"""
Service for training the LightGBM exoplanet classification model.
"""
import os
import joblib
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb

logger = logging.getLogger(__name__)


class TrainingService:
    """Service to train the LightGBM model for exoplanet classification."""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the training service.
        
        Args:
            model_path: Path where the model will be saved. If None, uses default path.
        """
        self.model_path = model_path or os.getenv(
            "MODEL_PATH", 
            "./models/exoplanets_lgbm_pipeline.joblib"
        )
        # Updated label mapping for 4-class classification
        # Including FALSE POSITIVE and REFUTED for improved prediction quality
        self.label_mapping = {
            'CANDIDATE': 0, 
            'CONFIRMED': 1, 
            'FALSE POSITIVE': 2, 
            'REFUTED': 3
        }
        
    def model_exists(self) -> bool:
        """Check if a trained model already exists."""
        return Path(self.model_path).exists()
    
    def prepare_data(self, df: pd.DataFrame) -> tuple:
        """
        Prepare data for training following the notebook logic.
        
        Args:
            df: DataFrame with training data
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test, numeric_features)
        """
        logger.info(f"Preparing data. Shape: {df.shape}")
        
        # Drop id_obj column if exists (updated column name)
        if 'id_obj' in df.columns:
            df = df.drop(columns=['id_obj'])
            logger.info("Dropped 'id_obj' column")
        
        # Validate disposition column (updated column name)
        if 'disposition' not in df.columns:
            raise ValueError("Missing required column: 'disposition'")
        
        # Map disposition to class labels (4 classes)
        df['disposition'] = df['disposition'].map(self.label_mapping)
        
        # Check for unmapped values
        if df['disposition'].isna().any():
            unmapped_values = df[df['disposition'].isna()]['disposition'].unique()
            raise ValueError(
                f"Invalid values in 'disposition' column: {unmapped_values}. "
                "Expected: 'CANDIDATE', 'CONFIRMED', 'FALSE POSITIVE', or 'REFUTED'"
            )
        
        # Separate features and target
        X = df.drop(columns=['disposition'])
        y = df['disposition'].astype(int)
        
        # Get numeric features
        numeric_features = X.columns.tolist()
        logger.info(f"Numeric features: {numeric_features}")
        
        # Check class balance
        class_counts = y.value_counts()
        logger.info(f"Class distribution: {class_counts.to_dict()}")
        
        if len(class_counts) < 2:
            raise ValueError("Training data must contain at least 2 different disposition classes")
        
        # Stratified split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        logger.info(f"Train shape: {X_train.shape}, Test shape: {X_test.shape}")
        
        return X_train, X_test, y_train, y_test, numeric_features
    
    def create_pipeline(self, numeric_features: List[str]) -> Pipeline:
        """
        Create the preprocessing and model pipeline.
        
        Args:
            numeric_features: List of numeric feature names
            
        Returns:
            sklearn Pipeline with preprocessing and LightGBM model
        """
        # Preprocessing pipeline
        numeric_preprocess = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])
        
        preprocess = ColumnTransformer(
            transformers=[('num', numeric_preprocess, numeric_features)],
            remainder='drop'
        )
        
        # Full pipeline with LightGBM for multiclass classification
        pipeline = Pipeline(steps=[
            ('preprocess', preprocess),
            ('model', lgb.LGBMClassifier(
                objective='multiclass',  # Changed from 'binary' to 'multiclass'
                num_class=4,  # 4 disposition classes
                random_state=42,
                n_estimators=100,
                learning_rate=0.1,
                num_leaves=31,
                verbose=-1  # Suppress LightGBM output
            ))
        ])
        
        return pipeline
    
    def evaluate_model(self, pipeline: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
        """
        Evaluate the trained model.
        
        Args:
            pipeline: Trained pipeline
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary with evaluation metrics
        """
        y_pred = pipeline.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Get classification report as dict with 4 classes
        labels = ['CANDIDATE', 'CONFIRMED', 'FALSE POSITIVE', 'REFUTED']
        report = classification_report(y_test, y_pred, target_names=labels, output_dict=True)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        metrics = {
            'accuracy': float(accuracy),
            'classification_report': report,
            'confusion_matrix': cm.tolist(),
            'test_samples': len(y_test)
        }
        
        logger.info(f"Model evaluation - Accuracy: {accuracy:.4f}")
        
        return metrics
    
    def train_model(
        self, 
        df: pd.DataFrame,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Train the LightGBM model with the provided data.
        
        Args:
            df: DataFrame with training data
            force: If True, overwrites existing model (not implemented for safety)
            
        Returns:
            Dictionary with training results and metrics
        """
        # Check if model already exists
        if self.model_exists() and not force:
            raise FileExistsError(
                f"Model already exists at {self.model_path}. "
                "Cannot train a new model to prevent data loss. "
                "Delete the existing model first if you want to train a new one."
            )
        
        if force:
            raise NotImplementedError(
                "Force retraining is not implemented for safety. "
                "Please delete the existing model manually if you want to retrain."
            )
        
        start_time = datetime.utcnow()
        logger.info("Starting model training...")
        
        # Prepare data
        X_train, X_test, y_train, y_test, numeric_features = self.prepare_data(df)
        
        # Create and train pipeline
        pipeline = self.create_pipeline(numeric_features)
        
        logger.info("Training LightGBM model...")
        pipeline.fit(X_train, y_train)
        logger.info("Training completed")
        
        # Evaluate model
        metrics = self.evaluate_model(pipeline, X_test, y_test)
        
        # Sanity check
        if metrics['accuracy'] < 0.5:
            raise ValueError(
                f"Model accuracy ({metrics['accuracy']:.4f}) is too low (<0.5). "
                "Please check your training data."
            )
        
        # Save model
        logger.info(f"Saving model to {self.model_path}")
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        bundle = {
            'pipeline': pipeline,
            'best_name': 'LightGBM',
            'features': numeric_features,
            'label_mapping': self.label_mapping
        }
        
        joblib.dump(bundle, self.model_path)
        logger.info("Model saved successfully")
        
        end_time = datetime.utcnow()
        training_duration = (end_time - start_time).total_seconds()
        
        return {
            'status': 'success',
            'model_path': self.model_path,
            'metrics': metrics,
            'features': numeric_features,
            'num_features': len(numeric_features),
            'label_mapping': self.label_mapping,
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'training_duration_seconds': training_duration,
            'timestamp': end_time.isoformat() + 'Z'
        }
    
    def train_from_csv(self, csv_file_path: str, force: bool = False) -> Dict[str, Any]:
        """
        Train model from CSV file.
        
        Args:
            csv_file_path: Path to CSV file
            force: If True, overwrites existing model
            
        Returns:
            Training results
        """
        logger.info(f"Loading CSV from {csv_file_path}")
        df = pd.read_csv(csv_file_path)
        return self.train_model(df, force=force)
    
    def train_from_json(self, data: List[Dict[str, Any]], force: bool = False) -> Dict[str, Any]:
        """
        Train model from JSON data.
        
        Args:
            data: List of dictionaries with training data
            force: If True, overwrites existing model
            
        Returns:
            Training results
        """
        logger.info(f"Creating DataFrame from {len(data)} JSON records")
        df = pd.DataFrame(data)
        return self.train_model(df, force=force)


# Global training service instance
_training_service: Optional[TrainingService] = None


def get_training_service() -> TrainingService:
    """
    Get or create the global training service instance.
    
    Returns:
        TrainingService instance
    """
    global _training_service
    
    if _training_service is None:
        _training_service = TrainingService()
    
    return _training_service
