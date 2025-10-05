# Test Payloads para API de Clasificación de Exoplanetas

Esta carpeta contiene archivos JSON **listos para copiar/pegar en Swagger UI** con ejemplos de payloads extraídos del dataset real `data_set_final.csv`.

---

## 📁 Archivos para Predicciones Individuales (`/api/v1/predict`)

Usa estos archivos para probar predicciones **de un solo exoplaneta**:

| Archivo | Disposición Esperada | ID Original |
|---------|---------------------|-------------|
| `single_confirmed.json` | CONFIRMED | 101.01 |
| `single_candidate.json` | CANDIDATE | 1001.01 |
| `single_false_positive.json` | FALSE POSITIVE | 1000.01 |
| `single_refuted.json` | REFUTED | 1022.01 |

### 🚀 Cómo usar en Swagger

1. Ve a `http://localhost:8000/api/docs`
2. Expande el endpoint `POST /api/v1/predict`
3. Haz click en **"Try it out"**
4. **Copia y pega** el contenido completo de cualquier archivo `single_*.json`
5. Haz click en **"Execute"**

---

## 📦 Archivos para Predicciones en Batch (`/api/v1/predict-batch`)

Usa estos archivos para probar predicciones **de múltiples exoplanetas** a la vez:

| Archivo | Descripción | IDs Originales |
|---------|-------------|----------------|
| `batch_confirmed.json` | 3 CONFIRMED | 101.01, 102.01, 103.01 |
| `batch_candidate.json` | 3 CANDIDATE | 1001.01, 1007.01, 1011.01 |
| `batch_false_positive.json` | 3 FALSE POSITIVE | 1000.01, 1004.01, 1016.01 |
| `batch_refuted.json` | 3 REFUTED | 1022.01, 1051.01, 1088.01 |
| `batch_mixed_all_classes.json` | 1 de cada clase | Ver archivo |

### 🚀 Cómo usar en Swagger

1. Ve a `http://localhost:8000/api/docs`
2. Expande el endpoint `POST /api/v1/predict-batch`
3. Haz click en **"Try it out"**
4. **Copia y pega** el contenido completo de cualquier archivo `batch_*.json`
5. Haz click en **"Execute"**

---

## 📋 Formato de los Archivos

### Single Prediction (ejemplo)
```json
{
  "pl_rade": 13.1874503,
  "pl_eqt": 1525.904809,
  "pl_orbper": 1.4303699,
  "st_teff": 5600,
  "st_rad": 0.890774,
  "st_logg": 4.48851,
  "st_tmag": 12.4069,
  "ra": 318.737012,
  "dec": -55.871863,
  "st_dist": 375.31
}
```

### Batch Prediction (ejemplo)
```json
{
  "candidates": [
    {
      "pl_rade": 13.1874503,
      "pl_eqt": 1525.904809,
      ...
    },
    {
      "pl_rade": 11.2154,
      "pl_eqt": 4045,
      ...
    }
  ]
}
```

---

## 🎯 Campos del Payload

Todos los payloads incluyen estos **10 campos obligatorios**:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `pl_rade` | Radio del planeta (radios terrestres) | 13.1874503 |
| `pl_eqt` | Temperatura de equilibrio (Kelvin) | 1525.904809 |
| `pl_orbper` | Período orbital (días) | 1.4303699 |
| `st_teff` | Temperatura estelar efectiva (Kelvin) | 5600 |
| `st_rad` | Radio estelar (radios solares) | 0.890774 |
| `st_logg` | Gravedad superficial estelar | 4.48851 |
| `st_tmag` | Magnitud TESS (brillo) | 12.4069 |
| `ra` | Ascensión Recta (longitud celeste) | 318.737012 |
| `dec` | Declinación (latitud celeste) | -55.871863 |
| `st_dist` | Distancia a la estrella (parsecs) | 375.31 |

---

## 📊 Ejemplo de Respuesta

```json
{
  "prediction": "CONFIRMED",
  "prediction_code": 1,
  "probabilities": {
    "CANDIDATE": 0.2253,
    "CONFIRMED": 0.7588,
    "FALSE POSITIVE": 0.0159,
    "REFUTED": 0.0000
  },
  "max_probability": 0.7588,
  "confidence": "high",
  "timestamp": "2025-10-05T21:33:40.511623Z"
}
```

---

## 💡 Tips

✅ **Todos los archivos JSON están validados** y listos para copiar/pegar directamente en Swagger  
✅ **Datos reales** extraídos del dataset `data_set_final.csv`  
✅ **Sin modificaciones necesarias** - solo copia y pega  

⚠️ **Nota sobre REFUTED:** Esta clase tiene muy pocos ejemplos en el dataset, por lo que el modelo puede tener dificultad para predecirla correctamente (F1-score = 0.00 en el test set).

---

## 🧪 Prueba Rápida con cURL

### Single prediction:
```bash
curl -X POST "http://localhost:8000/api/v1/predict" \
  -H "Content-Type: application/json" \
  -d @single_confirmed.json | jq
```

### Batch prediction:
```bash
curl -X POST "http://localhost:8000/api/v1/predict-batch" \
  -H "Content-Type: application/json" \
  -d @batch_mixed_all_classes.json | jq
