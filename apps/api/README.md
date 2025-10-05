# Exoplanet Classification API

FastAPI service for classifying exoplanet candidates using a trained LightGBM model.

## Features

- **Model Inference**: Classify exoplanet candidates as CONFIRMED or CANDIDATE
- **Batch Prediction**: Process multiple candidates in a single request
- **Model Management**: Health checks and model information endpoints
- **Auto-generated Documentation**: Swagger UI and ReDoc

## Project Structure

```
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── models/          # ML model loading (TODO)
│   ├── routes/          # API routes (TODO)
│   └── services/        # Business logic (TODO)
├── models/              # Trained model files (TODO)
├── tests/               # Unit tests (TODO)
├── Dockerfile
├── requirements.txt
└── README.md
```

## Development

### Local Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Run the server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Access documentation**:
   - Swagger UI: http://localhost:8000/api/docs
   - ReDoc: http://localhost:8000/api/redoc

### Docker

```bash
# Build image
docker build -t exoplanet-api .

# Run container
docker run -p 8000:8000 exoplanet-api
```

## API Endpoints

### Health & Info
- `GET /api/v1/health` - Health check
- `GET /api/v1/model/info` - Model information

### Predictions
- `POST /api/v1/predict` - Single prediction
- `POST /api/v1/predict/batch` - Batch predictions

## Next Steps

1. **Migrate model from notebook**: Copy the trained LightGBM pipeline from `migrate/notebook.ipynb`
2. **Implement model loading**: Create service to load and manage the model
3. **Implement prediction logic**: Connect endpoints to model inference
4. **Add tests**: Unit and integration tests
5. **Add monitoring**: Logging and metrics collection

## Tech Stack

- **FastAPI**: Modern, fast web framework
- **LightGBM**: Gradient boosting model
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server
