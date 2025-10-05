# Plan de Despliegue: API de Clasificación de Exoplanetas

## 1. Resumen Ejecutivo

Este documento detalla el plan completo para desplegar el modelo LightGBM de clasificación de exoplanetas como una API REST en Railway, consumible desde una aplicación Next.js.

### Objetivos
- Exponer el modelo LightGBM entrenado mediante una API REST
- Proporcionar endpoints de predicción para clasificar candidatos a exoplanetas
- Implementar endpoints de mantenimiento para gestión del modelo
- Desplegar en Railway con escalabilidad y monitoreo

---

## 2. Arquitectura de la Solución

### 2.1 Componente Principal
```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│  FastAPI Server │
│   (Railway)     │
├─────────────────┤
│ • Predicción    │
│ • Entrenamiento │
│ • Gestión       │
└────────┬────────┘
         │
    ┌────┴─────┐
    ↓          ↓
┌────────┐  ┌──────────┐
│ Modelo │  │  Datos   │
│ .joblib│  │   CSV    │
└────────┘  └──────────┘
```

### 2.2 Stack Tecnológico Recomendado

**Backend (API Server):**
- **FastAPI**: Framework moderno, rápido, con documentación automática (Swagger UI)
- **Uvicorn**: Servidor ASGI de alto rendimiento
- **Pydantic**: Validación de datos automática
- **joblib**: Carga del modelo serializado

**Razones para elegir FastAPI:**
- Rendimiento superior (comparable a Node.js)
- Documentación automática interactiva
- Validación de tipos integrada
- Soporte async/await nativo
- Fácil integración con Railway

---

## 3. Especificación de Endpoints

### 3.1 Endpoints de Predicción

#### `POST /api/v1/predict`
Clasifica un candidato a exoplaneta.

**Request Body:**
```json
{
  "radio_planeta": 1.0,
  "temp_planeta": 300.0,
  "periodo_orbital": 365.0,
  "temp_estrella": 5778.0,
  "radio_estrella": 1.0,
  "loc1_ra": 180.0,
  "loc2_dec": 0.0,
  "loc3_dist": 100.0
}
```

**Response:**
```json
{
  "prediction": "CONFIRMED",
  "prediction_code": 1,
  "probability": 0.8542,
  "confidence": "high",
  "timestamp": "2025-10-05T13:10:00Z"
}
```

#### `POST /api/v1/predict/batch`
Clasifica múltiples candidatos en una sola petición.

**Request Body:**
```json
{
  "candidates": [
    {
      "radio_planeta": 1.0,
      "temp_planeta": 300.0,
      ...
    },
    ...
  ]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "index": 0,
      "prediction": "CONFIRMED",
      "probability": 0.8542
    },
    ...
  ],
  "total_processed": 10
}
```

### 3.2 Endpoints de Información del Modelo

#### `GET /api/v1/model/info`
Retorna información del modelo actual.

**Response:**
```json
{
  "model_name": "LightGBM",
  "version": "1.0.0",
  "trained_date": "2025-10-05",
  "features": ["radio_planeta", "temp_planeta", ...],
  "accuracy": 0.9542,
  "total_samples_trained": 5000
}
```

#### `GET /api/v1/model/features`
Lista las características esperadas y sus descripciones.

**Response:**
```json
{
  "features": [
    {
      "name": "radio_planeta",
      "description": "Radio del planeta (en radios terrestres)",
      "type": "float",
      "required": true
    },
    ...
  ]
}
```

### 3.3 Endpoints de Mantenimiento

#### `POST /api/v1/admin/retrain`
Reentrena el modelo con datos actualizados.

**Request Body:**
```json
{
  "data_source": "data_set_S_FP.csv",
  "test_size": 0.2,
  "random_state": 42,
  "hyperparameters": {
    "n_estimators": 100,
    "learning_rate": 0.1,
    "num_leaves": 31
  }
}
```

**Response:**
```json
{
  "status": "success",
  "job_id": "retrain_20251005_131000",
  "message": "Modelo reentrenado exitosamente",
  "metrics": {
    "accuracy": 0.9542,
    "precision": 0.9423,
    "recall": 0.9631
  },
  "model_version": "1.1.0"
}
```

#### `POST /api/v1/admin/tune`
Optimiza hiperparámetros del modelo.

**Request Body:**
```json
{
  "search_space": {
    "n_estimators": [50, 100, 200],
    "learning_rate": [0.01, 0.1, 0.3],
    "num_leaves": [20, 31, 50]
  },
  "cv_folds": 5,
  "scoring": "accuracy"
}
```

**Response:**
```json
{
  "status": "success",
  "best_params": {
    "n_estimators": 100,
    "learning_rate": 0.1,
    "num_leaves": 31
  },
  "best_score": 0.9631,
  "cv_results": {...}
}
```

#### `POST /api/v1/admin/data/upload`
Agrega nuevos datos de entrenamiento.

**Request:** Multipart form-data con archivo CSV

**Response:**
```json
{
  "status": "success",
  "rows_added": 150,
  "total_rows": 5150,
  "message": "Datos agregados exitosamente"
}
```

#### `GET /api/v1/admin/data/stats`
Estadísticas del dataset actual.

**Response:**
```json
{
  "total_samples": 5000,
  "confirmed": 2500,
  "candidate": 2500,
  "class_balance": 0.5,
  "missing_values": {...},
  "feature_statistics": {...}
}
```

#### `POST /api/v1/admin/model/rollback`
Revierte a una versión anterior del modelo.

**Request Body:**
```json
{
  "version": "1.0.0"
}
```

#### `GET /api/v1/health`
Health check del servicio.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime_seconds": 86400
}
```

---

## 4. Configuración de Railway

### 4.1 Estructura del Proyecto para Railway

```
/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic models
│   ├── ml_service.py        # Model loading & prediction
│   ├── training.py          # Training & retraining logic
│   └── config.py            # Configuration
├── models/
│   └── exoplanets_lgbm_pipeline.joblib
├── data/
│   └── data_set_S_FP.csv
├── requirements.txt
├── Procfile               # Railway process definition
├── railway.json           # Railway config (opcional)
└── README.md
```

### 4.2 Archivo `requirements.txt`

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
lightgbm==4.1.0
scikit-learn==1.3.2
pandas==2.1.3
numpy==1.26.2
joblib==1.3.2
python-multipart==0.0.6
```

### 4.3 Archivo `Procfile`

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4.4 Variables de Entorno en Railway

```
MODEL_PATH=models/exoplanets_lgbm_pipeline.joblib
DATA_PATH=data/data_set_S_FP.csv
ADMIN_API_KEY=<secret_key>
ENVIRONMENT=production
LOG_LEVEL=info
```

---

## 5. Implementación de la API

### 5.1 Estructura Básica (`app/main.py`)

```python
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
import joblib
import pandas as pd
from typing import List, Optional
import os

app = FastAPI(
    title="Exoplanet Classification API",
    description="API para clasificar candidatos a exoplanetas usando LightGBM",
    version="1.0.0"
)

# CORS para Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configurar con dominios específicos en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar modelo al iniciar
MODEL_PATH = os.getenv("MODEL_PATH", "models/exoplanets_lgbm_pipeline.joblib")
model_bundle = joblib.load(MODEL_PATH)
pipeline = model_bundle['pipeline']
features = model_bundle['features']

class PredictionInput(BaseModel):
    radio_planeta: float
    temp_planeta: float
    periodo_orbital: float
    temp_estrella: float
    radio_estrella: float
    loc1_ra: float
    loc2_dec: float
    loc3_dist: float

class PredictionOutput(BaseModel):
    prediction: str
    prediction_code: int
    probability: float
    confidence: str
    timestamp: str

@app.get("/")
async def root():
    return {"message": "Exoplanet Classification API", "status": "running"}

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": pipeline is not None,
        "model_name": model_bundle.get('best_name', 'Unknown')
    }

@app.post("/api/v1/predict", response_model=PredictionOutput)
async def predict(input_data: PredictionInput):
    try:
        # Convertir input a DataFrame
        data_dict = {col: [getattr(input_data, col)] for col in features}
        df = pd.DataFrame(data_dict)
        
        # Predicción
        prediction_code = int(pipeline.predict(df)[0])
        probability = float(pipeline.predict_proba(df)[0, 1])
        
        # Mapeo
        prediction_label = "CONFIRMED" if prediction_code == 1 else "CANDIDATE"
        confidence = "high" if probability > 0.8 or probability < 0.2 else "medium"
        
        from datetime import datetime
        return PredictionOutput(
            prediction=prediction_label,
            prediction_code=prediction_code,
            probability=round(probability, 4),
            confidence=confidence,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")

@app.get("/api/v1/model/info")
async def model_info():
    return {
        "model_name": model_bundle.get('best_name', 'Unknown'),
        "features": features,
        "label_mapping": model_bundle.get('label_mapping', {}),
        "version": "1.0.0"
    }
```

---

## 6. Seguridad

### 6.1 Autenticación para Endpoints de Admin

```python
from fastapi.security.api_key import APIKeyHeader
from fastapi import Security, HTTPException, status

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != os.getenv("ADMIN_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key"
        )
    return api_key

# Uso en endpoints
@app.post("/api/v1/admin/retrain")
async def retrain_model(api_key: str = Depends(get_api_key)):
    # Lógica de reentrenamiento
    pass
```

### 6.2 Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/v1/predict")
@limiter.limit("100/minute")
async def predict(request: Request, input_data: PredictionInput):
    # ...
```

---

## 7. Integración con Next.js

### 7.1 Cliente API (TypeScript)

```typescript
// lib/exoplanet-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-app.railway.app';

export interface ExoplanetInput {
  radio_planeta: number;
  temp_planeta: number;
  periodo_orbital: number;
  temp_estrella: number;
  radio_estrella: number;
  loc1_ra: number;
  loc2_dec: number;
  loc3_dist: number;
}

export interface PredictionResult {
  prediction: string;
  prediction_code: number;
  probability: number;
  confidence: string;
  timestamp: string;
}

export async function classifyExoplanet(data: ExoplanetInput): Promise<PredictionResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getModelInfo() {
  const response = await fetch(`${API_BASE_URL}/api/v1/model/info`);
  return response.json();
}
```

### 7.2 Componente de Ejemplo

```typescript
// components/ExoplanetClassifier.tsx
'use client';

import { useState } from 'react';
import { classifyExoplanet, ExoplanetInput } from '@/lib/exoplanet-api';

export default function ExoplanetClassifier() {
  const [formData, setFormData] = useState<ExoplanetInput>({
    radio_planeta: 1.0,
    temp_planeta: 300.0,
    periodo_orbital: 365.0,
    temp_estrella: 5778.0,
    radio_estrella: 1.0,
    loc1_ra: 180.0,
    loc2_dec: 0.0,
    loc3_dist: 100.0,
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prediction = await classifyExoplanet(formData);
      setResult(prediction);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Campos del formulario */}
        <button type="submit" disabled={loading}>
          {loading ? 'Clasificando...' : 'Clasificar'}
        </button>
      </form>
      
      {result && (
        <div>
          <h3>Resultado: {result.prediction}</h3>
          <p>Probabilidad: {(result.probability * 100).toFixed(2)}%</p>
          <p>Confianza: {result.confidence}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 8. Despliegue en Railway

### 8.1 Pasos de Despliegue

1. **Crear cuenta en Railway** (railway.app)

2. **Preparar el repositorio**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Conectar con Railway**
   - New Project → Deploy from GitHub
   - Seleccionar el repositorio
   - Railway detectará automáticamente Python y usará Procfile

4. **Configurar variables de entorno**
   - Settings → Variables
   - Agregar `ADMIN_API_KEY`, `MODEL_PATH`, etc.

5. **Desplegar**
   - Railway desplegará automáticamente
   - Obtendrás una URL: `https://your-app.railway.app`

### 8.2 Configuración de Dominio Personalizado

En Railway: Settings → Domains → Add Custom Domain

---

## 9. Monitoreo y Logging

### 9.1 Logging Estructurado

```python
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.post("/api/v1/predict")
async def predict(input_data: PredictionInput):
    logger.info(f"Prediction request received: {input_data.dict()}")
    try:
        # ... predicción ...
        logger.info(f"Prediction successful: {prediction_label} (prob: {probability})")
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise
```

### 9.2 Métricas de Uso

```python
from collections import defaultdict
from datetime import datetime

# Simple in-memory metrics (para producción usar Redis/DB)
metrics = {
    "total_predictions": 0,
    "predictions_by_class": defaultdict(int),
    "last_prediction": None
}

@app.get("/api/v1/admin/metrics")
async def get_metrics(api_key: str = Depends(get_api_key)):
    return metrics
```

---

## 10. Testing

### 10.1 Tests Unitarios

```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_predict():
    data = {
        "radio_planeta": 1.0,
        "temp_planeta": 300.0,
        "periodo_orbital": 365.0,
        "temp_estrella": 5778.0,
        "radio_estrella": 1.0,
        "loc1_ra": 180.0,
        "loc2_dec": 0.0,
        "loc3_dist": 100.0
    }
    response = client.post("/api/v1/predict", json=data)
    assert response.status_code == 200
    assert "prediction" in response.json()
```

---

## 11. Resumen y Próximos Pasos

### 11.1 Checklist de Implementación

- [ ] Crear estructura de proyecto FastAPI
- [ ] Implementar endpoint de predicción
- [ ] Implementar endpoints de información del modelo
- [ ] Implementar endpoints de mantenimiento (retrain, tune, data upload)
- [ ] Agregar autenticación para endpoints admin
- [ ] Configurar CORS para Next.js
- [ ] Crear requirements.txt y Procfile
- [ ] Preparar tests unitarios
- [ ] Desplegar en Railway
- [ ] Configurar variables de entorno
- [ ] Integrar con Next.js
- [ ] Documentar API (Swagger automático en /docs)

### 11.2 Mejoras Futuras

- **Base de datos**: PostgreSQL para almacenar histórico de predicciones
- **Cache**: Redis para cachear predicciones frecuentes
- **Async training**: Celery + Redis para entrenamientos en background
- **Versionado de modelos**: MLflow para tracking de experimentos
- **Monitoring avanzado**: Prometheus + Grafana
- **A/B Testing**: Probar múltiples versiones del modelo simultáneamente

---

## 12. Solución Existente

**Estado actual:** No existe una implementación de servidor/API en el proyecto actual. Solo existe:
- Notebook con entrenamiento del modelo
- Modelo guardado en formato joblib
- Documentación del análisis

**Este plan es la solución completa** para crear el servidor desde cero y desplegarlo en Railway.

---

## Contacto y Soporte

Para preguntas o mejoras al plan:
- Revisar documentación de FastAPI: https://fastapi.tiangolo.com/
- Railway docs: https://docs.railway.app/
- LightGBM docs: https://lightgbm.readthedocs.io/
