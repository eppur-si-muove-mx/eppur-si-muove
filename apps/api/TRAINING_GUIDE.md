# Training API Guide

## Overview

The API provides endpoints to train new LightGBM models for exoplanet classification. Training is only allowed when **no model exists** to prevent accidental data loss.

## Important Safety Features

⚠️ **Model Protection**:
- Training is **blocked** if a model already exists
- No "force retrain" option to prevent accidental overwrites
- Manual deletion of existing model required for retraining

## Training Endpoints

### 1. Check Training Status

Check if a model exists and if training is possible.

```bash
curl http://localhost:8000/api/v1/training/status | jq
```

**Response:**
```json
{
  "model_exists": true,
  "model_path": "./models/exoplanets_lgbm_pipeline.joblib",
  "message": "Model already exists. Cannot train without deleting existing model.",
  "can_train": false
}
```

### 2. Train from CSV File

Train a model by uploading a CSV file.

**Requirements:**
- CSV must have header row
- Required column: `disposicion` (values: "CANDIDATE" or "CONFIRMED")
- Required feature columns: `radio_planeta`, `temp_planeta`, `periodo_orbital`, `temp_estrella`, `radio_estrella`, `loc1_ra`, `loc2_dec`, `loc3_dist`
- Optional: `id_objeto` (will be dropped during training)
- Minimum 100 samples recommended

**CSV Format:**
```csv
disposicion,radio_planeta,temp_planeta,periodo_orbital,temp_estrella,radio_estrella,loc1_ra,loc2_dec,loc3_dist,id_objeto
CONFIRMED,1.0,300.0,365.0,5778.0,1.0,180.0,0.0,100.0,1001.01
CANDIDATE,2.5,450.0,200.0,6200.0,1.5,150.0,30.0,150.0,1002.01
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/training/train-csv \
  -F "file=@/path/to/data_set_S_FP.csv" | jq
```

**Response:**
```json
{
  "status": "success",
  "message": "Model trained successfully from CSV file 'data_set_S_FP.csv'",
  "model_path": "./models/exoplanets_lgbm_pipeline.joblib",
  "metrics": {
    "accuracy": 0.9234,
    "test_samples": 1000,
    "classification_report": {...},
    "confusion_matrix": [[450, 50], [27, 473]]
  },
  "features": [...],
  "num_features": 8,
  "label_mapping": {"CANDIDATE": 0, "CONFIRMED": 1},
  "training_samples": 4000,
  "test_samples": 1000,
  "training_duration_seconds": 2.45,
  "timestamp": "2025-10-05T20:30:00Z"
}
```

### 3. Train from JSON Data

Train a model from JSON payload (useful for Directus integration).

**Requirements:**
- Minimum 100 records required (enforced by validation)
- Each record must have all required fields
- Same field requirements as CSV

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/training/train-json \
  -H "Content-Type: application/json" \
  -d @test_training_data.json | jq
```

**Request Format:**
```json
{
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
      "loc3_dist": 100.0,
      "id_objeto": "1001.01"
    },
    ...
  ],
  "force": false
}
```

**Response:** Same format as CSV training

## Performance Considerations

### CSV vs JSON

| Aspect | CSV Upload | JSON Payload |
|--------|-----------|--------------|
| **Best for** | Large datasets (>10MB) | Small-medium datasets |
| **Max recommended** | Unlimited | <10,000 records |
| **Performance** | ⚡ Fast (direct pandas read) | 🐌 Slower (JSON parsing + validation) |
| **Validation** | Basic | Comprehensive (Pydantic) |
| **Error messages** | Generic pandas errors | Detailed field-level errors |
| **Use case** | Bulk data, file exports | API integrations, Directus |

### Recommendations

- **< 1,000 records**: Use JSON for better validation
- **1,000 - 10,000 records**: Either works, CSV slightly faster
- **> 10,000 records**: Use CSV for best performance
- **Directus integration**: Use JSON for seamless API flow

## Training Process

The training pipeline follows these steps:

1. **Data Validation**
   - Check for required columns
   - Validate disposicion values (CANDIDATE/CONFIRMED)
   - Ensure both classes present

2. **Data Preparation**
   - Drop `id_objeto` if present
   - Map labels to binary (0/1)
   - Split into train/test (80/20 stratified)

3. **Preprocessing**
   - Impute missing values (median)
   - Standardize features (zero mean, unit variance)

4. **Model Training**
   - LightGBM binary classifier
   - Parameters: 100 estimators, learning_rate=0.1, num_leaves=31

5. **Evaluation**
   - Accuracy on test set
   - Classification report
   - Confusion matrix

6. **Model Saving**
   - Save pipeline with preprocessing + model
   - Include feature names and label mapping

## Error Handling

### Common Errors

**409 Conflict - Model Exists**
```json
{
  "detail": "Model already exists at ./models/exoplanets_lgbm_pipeline.joblib. Cannot train a new model."
}
```
**Solution**: Delete existing model first

**400 Bad Request - Invalid Data**
```json
{
  "detail": "Invalid training data: Missing required column: disposicion"
}
```
**Solution**: Check data format and required columns

**400 Bad Request - Insufficient Samples**
```json
{
  "detail": "Minimum 100 samples required"
}
```
**Solution**: Provide more training data

**400 Bad Request - Single Class**
```json
{
  "detail": "Training data must contain both CANDIDATE and CONFIRMED classes"
}
```
**Solution**: Ensure balanced dataset with both classes

## Integration with Directus

To train from Directus data:

1. **Export data from Directus**
```javascript
const response = await fetch('http://directus:8055/items/exoplanets');
const items = await response.json();
```

2. **Format for training API**
```javascript
const trainingData = {
  data: items.data.map(item => ({
    disposicion: item.status,  // Map your field names
    radio_planeta: item.planet_radius,
    // ... map other fields
  })),
  force: false
};
```

3. **Send to training endpoint**
```javascript
const trainResponse = await fetch('http://api:8000/api/v1/training/train-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(trainingData)
});
```

## Testing Training Endpoints

### Test with Small Sample (5 records)

⚠️ **Note**: This will fail validation (min 100 samples) but useful for testing structure:

```bash
curl -X POST http://localhost:8000/api/v1/training/train-json \
  -H "Content-Type: application/json" \
  -d @test_training_data.json
```

### Test with Real Dataset

To test with the full dataset from `migrate/`:

```bash
# First, remove existing model
rm apps/api/models/exoplanets_lgbm_pipeline.joblib

# Train with CSV
curl -X POST http://localhost:8000/api/v1/training/train-csv \
  -F "file=@migrate/data_set_S_FP.csv" | jq
```

## Security Considerations

- No authentication on training endpoints (add for production)
- No rate limiting (could be abused)
- No model versioning (overwrites are blocked but not tracked)
- Consider adding admin-only access with API keys

## Next Steps for Production

1. **Add Authentication**: Protect training endpoints
2. **Add Model Versioning**: Track model history
3. **Add Monitoring**: Log training metrics
4. **Add Validation**: More robust data validation
5. **Add Rollback**: Ability to restore previous models
6. **Add Scheduling**: Automatic retraining on new data

---

**Current Status**: Training endpoints are functional and protected against accidental overwrites. Ready for development and testing.
