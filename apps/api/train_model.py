"""
Script to train the exoplanet classification model with the new dataset.
"""
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.training_service import TrainingService
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """Train the model with the new dataset."""
    # Path to the new dataset
    dataset_path = "../../data/data_set_final.csv"
    
    logger.info("=" * 80)
    logger.info("TRAINING EXOPLANET CLASSIFICATION MODEL")
    logger.info("=" * 80)
    logger.info(f"Dataset: {dataset_path}")
    logger.info("New dispositions: CANDIDATE, CONFIRMED, FALSE POSITIVE, REFUTED")
    logger.info("=" * 80)
    
    # Create training service
    training_service = TrainingService()
    
    # Check if model already exists
    if training_service.model_exists():
        logger.error(f"Model already exists at {training_service.model_path}")
        logger.error("Please delete it first before training a new model")
        return 1
    
    try:
        # Train the model
        logger.info("Starting model training...")
        result = training_service.train_from_csv(dataset_path, force=False)
        
        # Print results
        logger.info("=" * 80)
        logger.info("TRAINING COMPLETED SUCCESSFULLY!")
        logger.info("=" * 80)
        logger.info(f"Model saved to: {result['model_path']}")
        logger.info(f"Training samples: {result['training_samples']}")
        logger.info(f"Test samples: {result['test_samples']}")
        logger.info(f"Number of features: {result['num_features']}")
        logger.info(f"Features: {result['features']}")
        logger.info(f"Training duration: {result['training_duration_seconds']:.2f} seconds")
        logger.info("")
        logger.info("METRICS:")
        logger.info(f"  Accuracy: {result['metrics']['accuracy']:.4f}")
        logger.info("")
        logger.info("CLASSIFICATION REPORT:")
        report = result['metrics']['classification_report']
        for label in ['CANDIDATE', 'CONFIRMED', 'FALSE POSITIVE', 'REFUTED']:
            if label in report:
                metrics = report[label]
                logger.info(f"  {label}:")
                logger.info(f"    Precision: {metrics['precision']:.4f}")
                logger.info(f"    Recall: {metrics['recall']:.4f}")
                logger.info(f"    F1-Score: {metrics['f1-score']:.4f}")
                logger.info(f"    Support: {metrics['support']}")
        
        logger.info("")
        logger.info(f"  Macro Avg F1-Score: {report['macro avg']['f1-score']:.4f}")
        logger.info(f"  Weighted Avg F1-Score: {report['weighted avg']['f1-score']:.4f}")
        logger.info("=" * 80)
        
        return 0
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
