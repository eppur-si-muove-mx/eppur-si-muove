# API Testing Guide

## Testing Endpoints

### 1. Health Check

```bash
curl http://localhost:8000/api/v1/health | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2025-10-05T19:53:37Z"
}
```

### 2. Model Info

```bash
curl http://localhost:8000/api/v1/model/info | jq
```

**Expected Response:**
```json
{
  "model_type": "LightGBM",
  "model_version": "1.0.0",
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
  "num_features": 8,
  "labels": ["CANDIDATE", "CONFIRMED"],
  "label_mapping": {
    "CANDIDATE": 0,
    "CONFIRMED": 1
  },
  "model_path": "./models/exoplanets_lgbm_pipeline.joblib"
}
```

### 3. Single Prediction

```bash
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d @test_request.json | jq
```

**Expected Response:**
```json
{
  "prediction": "CONFIRMED",
  "prediction_code": 1,
  "probability": 0.8542,
  "confidence": "high",
  "timestamp": "2025-10-05T19:53:37Z"
}
```

### 4. Batch Prediction

```bash
curl -X POST http://localhost:8000/api/v1/predict/batch \
  -H "Content-Type: application/json" \
  -d @test_batch_request.json | jq
```

**Expected Response:**
```json
{
  "predictions": [
    {
      "prediction": "CONFIRMED",
      "prediction_code": 1,
      "probability": 0.8542,
      "confidence": "high",
      "timestamp": "2025-10-05T19:53:37Z"
    },
    {
      "prediction": "CONFIRMED",
      "prediction_code": 1,
      "probability": 0.7234,
      "confidence": "medium",
      "timestamp": "2025-10-05T19:53:37Z"
    },
    {
      "prediction": "CANDIDATE",
      "prediction_code": 0,
      "probability": 0.3421,
      "confidence": "medium",
      "timestamp": "2025-10-05T19:53:37Z"
    }
  ],
  "total_processed": 3
}
```

## Training Endpoints

### 5. Check Training Status

Check if a model exists and if training is possible.

```bash
curl http://localhost:8000/api/v1/training/status | jq
```

**Expected Response (Model Exists):**
```json
{
  "model_exists": true,
  "model_path": "./models/exoplanets_lgbm_pipeline.joblib",
  "message": "Model already exists. Cannot train without deleting existing model.",
  "can_train": false
}
```

**Expected Response (No Model):**
```json
{
  "model_exists": false,
  "model_path": "./models/exoplanets_lgbm_pipeline.joblib",
  "message": "No model found. Ready to train.",
  "can_train": true
}
```

### 6. Train from CSV File

⚠️ **Note**: This will only work if no model exists. Delete existing model first:
```bash
rm apps/api/models/exoplanets_lgbm_pipeline.joblib
```

Then train:
```bash
curl -X POST http://localhost:8000/api/v1/training/train-csv \
  -F "file=@migrate/data_set_S_FP.csv" | jq
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Model trained successfully from CSV file",
  "model_path": "./models/exoplanets_lgbm_pipeline.joblib",
  "metrics": {
    "accuracy": 0.92,
    "test_samples": 1000,
    "classification_report": {...},
    "confusion_matrix": [[...], [...]]
  },
  "features": ["radio_planeta", "temp_planeta", ...],
  "num_features": 8,
  "label_mapping": {"CANDIDATE": 0, "CONFIRMED": 1},
  "training_samples": 4000,
  "test_samples": 1000,
  "training_duration_seconds": 2.5,
  "timestamp": "2025-10-05T20:30:00Z"
}
```

### 7. Train from JSON Data

⚠️ **Requirements**: 
- Minimum 100 records required
- Model must not exist

```bash
# Small test (will fail validation - only 5 records)
curl -X POST http://localhost:8000/api/v1/training/train-json \
  -H "Content-Type: application/json" \
  -d @test_training_data.json | jq
```

**Error Response (Model Exists):**
```json
{
  "detail": "Model already exists at ./models/exoplanets_lgbm_pipeline.joblib. Cannot train a new model."
}
```

**Error Response (Insufficient Data):**
```json
{
  "detail": "Field required: data (minimum 100 records)"
}
```

## Using Python

```python
import requests

# Health check
response = requests.get("http://localhost:8000/api/v1/health")
print(response.json())

# Single prediction
payload = {
    "radio_planeta": 1.0,
    "temp_planeta": 300.0,
    "periodo_orbital": 365.0,
    "temp_estrella": 5778.0,
    "radio_estrella": 1.0,
    "loc1_ra": 180.0,
    "loc2_dec": 0.0,
    "loc3_dist": 100.0
}

response = requests.post(
    "http://localhost:8000/api/v1/predict",
    json=payload
)
print(response.json())

# Check training status
response = requests.get("http://localhost:8000/api/v1/training/status")
print(response.json())

# Train from JSON (if no model exists and data is sufficient)
training_payload = {
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
        # ... add at least 100 records
    ],
    "force": False
}

response = requests.post(
    "http://localhost:8000/api/v1/training/train-json",
    json=training_payload
)
print(response.json())

# Train from CSV
with open('data.csv', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        "http://localhost:8000/api/v1/training/train-csv",
        files=files
    )
    print(response.json())

## Interactive Documentation

Access the interactive API documentation at:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

You can test all endpoints directly from these interfaces!
