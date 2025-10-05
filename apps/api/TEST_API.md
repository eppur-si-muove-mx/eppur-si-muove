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
```

## Interactive Documentation

Access the interactive API documentation at:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

You can test all endpoints directly from these interfaces!
