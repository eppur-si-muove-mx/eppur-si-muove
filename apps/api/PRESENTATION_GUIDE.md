# 🪐 API de Clasificación de Exoplanetas
### Guion de Presentación

---

## 📌 ¿Qué es?

API REST que clasifica candidatos a exoplanetas en **4 categorías** utilizando Machine Learning:
- ✅ **CONFIRMED** - Exoplanetas confirmados
- 🔍 **CANDIDATE** - Candidatos prometedores
- ❌ **FALSE POSITIVE** - Señales falsas
- 🚫 **REFUTED** - Candidatos refutados

---

## 🛠️ Stack Tecnológico

### Backend
- **FastAPI** - Framework web moderno y rápido
- **Python 3.13** - Lenguaje de programación
- **Uvicorn** - Servidor ASGI de alto rendimiento

### Machine Learning
- **LightGBM** - Modelo de clasificación multiclase
- **scikit-learn** - Pipeline de preprocesamiento
- **pandas/numpy** - Manipulación de datos

### Infraestructura
- **Docker** - Contenerización
- **Pydantic** - Validación de datos
- **CORS habilitado** - Integración con frontend

---

## ⚙️ ¿Cómo Funciona?

### 1. **Entrada de Datos**
El API recibe **10 características** de un candidato a exoplaneta:

```json
{
  "pl_rade": 13.19,      // Radio del planeta
  "pl_eqt": 1525.9,      // Temperatura
  "pl_orbper": 1.43,     // Período orbital
  "st_teff": 5600,       // Temp. estelar
  "st_rad": 0.89,        // Radio estelar
  "st_logg": 4.49,       // Gravedad estelar
  "st_tmag": 12.41,      // Brillo
  "ra": 318.74,          // Coordenada RA
  "dec": -55.87,         // Coordenada DEC
  "st_dist": 375.31      // Distancia
}
```

### 2. **Procesamiento**
1. Validación de datos con Pydantic
2. Preprocesamiento (imputación, escalado)
3. Predicción con modelo LightGBM entrenado
4. Cálculo de probabilidades para cada clase

### 3. **Salida**
Respuesta con predicción y probabilidades:

```json
{
  "prediction": "CONFIRMED",
  "prediction_code": 1,
  "probabilities": {
    "CANDIDATE": 0.23,
    "CONFIRMED": 0.76,
    "FALSE POSITIVE": 0.01,
    "REFUTED": 0.00
  },
  "max_probability": 0.76,
  "confidence": "high"
}
```

---

## 🚀 Endpoints Principales

### 1. Predicción Individual
```http
POST /api/v1/predict
```
Clasifica un solo candidato

### 2. Predicción en Batch
```http
POST /api/v1/predict-batch
```
Clasifica múltiples candidatos simultáneamente

### 3. Entrenamiento
```http
POST /api/v1/training/train-csv
```
Entrena un nuevo modelo desde archivo CSV

### 4. Estado del Modelo
```http
GET /api/v1/model-info
GET /api/v1/training/status
```
Información del modelo cargado

### 5. Documentación Interactiva
```http
GET /api/docs
```
Swagger UI para probar el API

---

## 📊 Métricas del Modelo

### Dataset
- **7,321 muestras** totales
- **5,857** para entrenamiento (80%)
- **1,465** para prueba (20%)

### Performance
- **Accuracy Global:** 75.77%
- **F1-Score CONFIRMED:** 0.72
- **F1-Score CANDIDATE:** 0.83
- **F1-Score FALSE POSITIVE:** 0.41

### Distribución de Clases
| Clase | Precision | Recall | F1-Score |
|-------|-----------|--------|----------|
| CANDIDATE | 0.77 | 0.90 | 0.83 |
| CONFIRMED | 0.79 | 0.67 | 0.72 |
| FALSE POSITIVE | 0.56 | 0.33 | 0.41 |
| REFUTED | 0.00 | 0.00 | 0.00* |

_*Clase minoritaria con solo 14 muestras en test_

---

## 💡 Características Destacadas

✨ **Documentación Automática** - Swagger UI integrado  
✨ **Validación Robusta** - Pydantic schemas  
✨ **Alta Performance** - Respuestas en ~10-50ms  
✨ **Probabilidades Multiclase** - No solo predicción binaria  
✨ **Nivel de Confianza** - High/Medium/Low basado en probabilidad  
✨ **CORS Habilitado** - Listo para integración web  
✨ **Formato Estándar** - JSON request/response  

---

## 🔄 Flujo de Trabajo

```
1. Frontend/Usuario
   ↓ (envía datos JSON)
2. FastAPI 
   ↓ (valida con Pydantic)
3. ModelService
   ↓ (preprocesa features)
4. LightGBM Pipeline
   ↓ (predice)
5. Respuesta JSON
   ↓ (con probabilidades)
6. Frontend/Usuario
```

---

## 📦 Deployment

### Local
```bash
uvicorn app.main:app --reload --port 8000
```

### Docker
```bash
docker build -t exoplanet-api .
docker run -p 8000:8000 exoplanet-api
```

### Producción
- Puerto: 8000
- Health check: `/api/v1/health`
- Documentación: `/api/docs`

---

## 🧪 Demo en Vivo

### Paso 1: Acceder a Swagger
```
http://localhost:8000/api/docs
```

### Paso 2: Probar Endpoint
1. Expandir `POST /api/v1/predict`
2. Click en "Try it out"
3. Copiar/pegar payload de ejemplo
4. Click en "Execute"
5. Ver resultados

### Payloads de Prueba
Disponibles en: `apps/api/test_payloads/`
- `single_confirmed.json`
- `single_candidate.json`
- `single_false_positive.json`
- `batch_mixed_all_classes.json`

---

## 🎯 Casos de Uso

1. **Investigación Astronómica**
   - Priorización de candidatos para observación
   - Filtrado automático de falsos positivos

2. **Análisis de Datos**
   - Clasificación masiva de señales TESS/K2
   - Validación de detecciones automáticas

3. **Educación**
   - Herramienta didáctica sobre ML en astronomía
   - Ejemplos reales de clasificación

---

## 📈 Roadmap Futuro

- [ ] Aumentar datos de clase REFUTED
- [ ] Implementar balanceo de clases
- [ ] Feature engineering avanzado
- [ ] Integración con bases de datos astronómicas
- [ ] API de explicabilidad (SHAP values)

---

## 📚 Recursos

- **Documentación API:** `/api/docs`
- **Dataset:** `data/data_set_final.csv`
- **Modelo:** `models/exoplanets_lgbm_pipeline.joblib`
- **Test Payloads:** `test_payloads/`

---

## ✅ Conclusión

API REST **moderna y escalable** para clasificación de exoplanetas:
- ✅ Stack robusto (FastAPI + LightGBM)
- ✅ Clasificación multiclase (4 categorías)
- ✅ Alta precisión (~76%)
- ✅ Fácil integración
- ✅ Documentación completa

**¡Listo para integrar con frontend y usar en producción!**
