# Eppur Si Muove · Documento de Arquitectura Funcional (E2E)

Este documento explica cómo funciona el proyecto “Eppur Si Muove” cuando todo el stack está conectado extremo a extremo: cómo interactúan los servicios (Web ↔ API ↔ Directus ↔ DB/Redis), cómo fluye la información desde el dispositivo del usuario hasta el modelo de ML y de vuelta, y cómo se entrena y gobierna el modelo en este entorno.

Fecha: 2025-10-05

---

## 1) Visión General

Eppur Si Muove es una plataforma para explorar y clasificar candidatos a exoplanetas. El sistema completo está compuesto por:

- Frontend (Next.js): Interfaz de observación y exploración. Obtiene orientación del dispositivo (alpha/beta/gamma), calcula zona de búsqueda en el cielo y consulta datos.
- API (FastAPI + LightGBM): Servicio de inferencia y entrenamiento. Expone endpoints de salud, predicción (single/batch) y entrenamiento desde CSV/JSON.
- CMS (Directus): Fuente de verdad editorial y operativa. Almacena planetas, descubrimientos, banderas/flags, datasets y ejecuciones de entrenamiento, además de predicciones y metadatos.
- PostgreSQL: Base de datos de Directus.
- Redis: Caché de Directus (mejora la latencia en lecturas frecuentes).

Orquestación: docker-compose levanta todos los servicios con red compartida (bridge eppur-network). Puertos por defecto: Web 3000, API 8000, Directus 8055.

---

## 2) Componentes y Responsabilidades

- Web (apps/web)
  - Calcula RA/DEC a partir de la orientación del dispositivo y posición del usuario (utilidades en `src/utils/celestialCoordinates.js` y `src/utils/searchArea.js`).
  - Administra datasets en memoria y la agrupación por regiones (`src/utils/data/celestialDataManager.js`). En producción, el dataset base se consulta a Directus.
  - Configuración por variables públicas:
    - `NEXT_PUBLIC_API_URL` (p.ej. http://localhost:8000)
    - `NEXT_PUBLIC_DIRECTUS_URL` (p.ej. http://localhost:8055)

- API (apps/api)
  - FastAPI con endpoints:
    - `GET /api/v1/health` y `GET /api/v1/model/info` (estado del modelo, features, path, mapeo de labels).
    - `POST /api/v1/predict` (single) y `POST /api/v1/predict/batch` (lote).
    - Entrenamiento: `POST /api/v1/training/status`, `POST /api/v1/training/train-csv`, `POST /api/v1/training/train-json`.
  - Modelo: pipeline de LightGBM con preprocesamiento (imputación + estandarización) y 8 features: `radio_planeta`, `temp_planeta`, `periodo_orbital`, `temp_estrella`, `radio_estrella`, `loc1_ra`, `loc2_dec`, `loc3_dist`.
  - Protección de entrenamiento: si existe modelo en `./models/exoplanets_lgbm_pipeline.joblib` se bloquea el retraining (ver `apps/api/TRAINING_GUIDE.md`).

- Directus (infra/directus)
  - Headless CMS con PostgreSQL y Redis. 
  - Almacena colecciones operativas. El script `scripts/seed_directus.py` muestra colecciones previstas y flujos de datos:
    - `planets`: catálogo base (id_objeto, disposición, RA/DEC y features físicas).
    - `discoveries`: registros de observaciones (usuario, lat/lng, orientación alpha/beta/gamma, notas, fecha).
    - `planet_flags`: banderas/flags por usuario (orbit/alien/heart…).
    - `training_datasets`: metadatos de datasets usados para entrenar (ruta, recuento, descripción).
    - `training_runs`: ejecuciones de entrenamiento (accuracy, matriz de confusión, features, mapeo de labels, tiempos, estado).
    - `predictions`: resultados de inferencia (input_features, predicted_label, probabilities, confidence, timestamp, source).
  - Variables relevantes: `PUBLIC_URL`, CORS, cookies y claves (`SECRET`, `KEY`).

---

## 3) Arquitectura de Integración (Cómo “respira” el sistema)

1) El usuario abre la Web (Next.js). Esta conoce:
   - La URL del API: `NEXT_PUBLIC_API_URL`.
   - La URL de Directus: `NEXT_PUBLIC_DIRECTUS_URL`.

2) La Web obtiene la orientación del dispositivo (alpha/beta/gamma) y la localización. Con `getRaDecFromDevice` calcula RA/DEC y con `calculateSearchArea` delimita una “ventana” del cielo (RA/DEC mín-máx) de búsqueda.

3) Búsqueda de objetos en el cielo:
   - La Web solicita a Directus los planetas cercanos a esa región (ejemplo conceptual):
     - `GET {DIRECTUS_URL}/items/planets?filter[Loc1_RA][_between]=...&filter[Loc2_DEC][_between]=...`
   - Directus lee desde PostgreSQL, aplica caché Redis si procede, y devuelve los items.

4) Predicción (opcional):
   - La Web envía un payload al API con features de uno o varios candidatos (ej. `POST /api/v1/predict/batch`).
   - El API ejecuta el pipeline de LightGBM y retorna `prediction` (CONFIRMED/CANDIDATE), `probability`, `confidence` y `prediction_code`.

5) Persistencia de resultados y auditoría:
   - La Web (o un worker) envía a Directus las predicciones para historial/analítica (colección `predictions`).
   - Un usuario autenticado puede “marcar”/flaggear objetos (`planet_flags`) o registrar un “descubrimiento” (`discoveries`).

6) Observabilidad básica:
   - Healthcheck del API para saber si hay modelo y si está cargado.
   - Directus ofrece vistas/colecciones administrables y websockets (si están activos) para notificaciones en tiempo real.

---

## 4) Contratos y Modelos de Datos (resumen)

- API de Inferencia
  - Input Single (`POST /api/v1/predict`):
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
  - Output Single:
    ```json
    {
      "prediction": "CONFIRMED",
      "prediction_code": 1,
      "probability": 0.85,
      "confidence": "high",
      "timestamp": "2025-10-05T19:53:37Z"
    }
    ```
  - Batch (`POST /api/v1/predict/batch`): `{"candidates": [ ... ]}` → `{"predictions": [ ... ], "total_processed": N}`.

- Entrenamiento (ver guía completa en `apps/api/TRAINING_GUIDE.md`)
  - `GET /api/v1/training/status` → si existe modelo y si se permite entrenar.
  - `POST /api/v1/training/train-csv` (archivo CSV con encabezados y columnas requeridas).
  - `POST /api/v1/training/train-json` (mín. 100 registros, mismas columnas requeridas que CSV).

- Directus (colecciones previstas por `scripts/seed_directus.py`)
  - planets(id_objeto, disposicion, Loc1_RA, Loc2_DEC, radio_planeta, temp_planeta, periodo_orbital, temp_estrella, radio_estrella, status…)
  - discoveries(planet, user, lat, lng, alpha, beta, gamma, created_at, notes)
  - planet_flags(planet, user, orbit, alien, heart, created_at, pair_key)
  - training_datasets(title, source, records_count, description)
  - training_runs(dataset, status, started_at, finished_at, accuracy, classification_report, confusion_matrix, features, model_type, model_path, label_mapping, training_samples, test_samples, duration_seconds)
  - predictions(planet?, input_features, predicted_label, predicted_code, probabilities, confidence, timestamp, source)

---

## 5) Flujo de Entrenamiento del Modelo

1) Origen de datos:
   - CSV local (`data/data_set_S_FP.csv`) o datos exportados desde Directus.
2) Validación y preparación:
   - Verificaciones de columnas requeridas y presencia de ambas clases.
   - Mapeo de label `disposicion` → binario (0/1), drop de `id_objeto`.
3) Split y preprocesamiento:
   - Train/test (80/20 estratificado). Imputación por mediana + estandarización.
4) Entrenamiento LightGBM:
   - `n_estimators=100`, `learning_rate=0.1`, `num_leaves=31` (parámetros de referencia, ver guía para detalles).
5) Evaluación y guardado:
   - Accuracy, reporte de clasificación, matriz de confusión. Guardado de pipeline en `./models/exoplanets_lgbm_pipeline.joblib`.
6) Política de seguridad:
   - Si hay un modelo existente, el API bloquea un nuevo entrenamiento para prevenir sobrescrituras accidentales (requiere borrar manualmente el archivo). Ver `apps/api/TRAINING_GUIDE.md`.

Integración con Directus:
- Opción A: Exportar items (p.ej. `planets`) desde Directus → transformar a `{ data: [...] }` → `POST /training/train-json`.
- Opción B: Mantener datasets de entrenamiento como artefactos (colección `training_datasets`) y registrar cada corrida en `training_runs` (metadata, no el binario del modelo).

---

## 6) Seguridad y Gobierno de Datos

- CORS:
  - API: `CORS_ORIGINS=http://localhost:3000,http://localhost:3001` (ajustar en prod).
  - Directus: `CORS_ORIGIN` en `.env` (no usar `*` en producción).
- Autenticación:
  - Directus maneja usuarios/roles para crear/editar colecciones (`planets`, `discoveries`, flags, etc.).
  - API de entrenamiento no está autenticada por defecto (añadir API keys/roles en producción).
- Datos personales:
  - `discoveries` almacena lat/lng y orientación. Limitar visibilidad por rol y considerar anonimización si es público.
- Integridad del modelo:
  - Bloqueo de re-entrenamiento, logging de runs (via `training_runs`). Explorar versionado del modelo para auditoría.

---

## 7) Despliegue y Operación

- Orquestación (docker-compose):
  - Servicios: `web`, `api`, `directus`, `postgres`, `redis` en la red `eppur-network`.
  - Persistencia: volúmenes para `postgres_data`, `redis_data`, `directus_uploads`, `directus_extensions`.
- Puertos:
  - Web: 3000, API: 8000, Directus: 8055.
- Entornos:
  - Desarrollo: variables `.env` locales y hot-reload para Web/API; Directus con cache y websockets habilitados.
  - Producción: revisar CORS, rotar `KEY/SECRET`, credenciales, certificados y políticas de cookies.

---

## 8) Experiencia de Usuario (E2E)

1) El usuario permite acceso a orientación y ubicación en el navegador.
2) La app calcula la zona visible y lista objetos cercanos (Directus → `planets`).
3) Al seleccionar un objeto, la app llama al API para predecir su clase.
4) El usuario puede marcarlo (flags) o registrar un descubrimiento (Directus), creando trazabilidad.
5) Administradores exportan nuevos datos y lanzan entrenamiento con el API; los resultados se registran en `training_runs`.

---

## 9) Mapa de Enlaces Útiles

- API (docs): http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Guía de entrenamiento: `apps/api/TRAINING_GUIDE.md`
- Guía de pruebas API: `apps/api/TEST_API.md`
- Resumen de migración: `apps/api/MIGRATION_SUMMARY.md`
- README del proyecto: `README.md`
- Directus App: http://localhost:8055

---

## 10) Próximos Pasos

- Autenticación y rate-limiting en endpoints de entrenamiento.
- Versionado de modelo y rollback.
- Jobs/Flows en Directus para automatizar: validación de datasets, notificaciones al completar entrenamiento, y publicación controlada.
- Sustituir dataset mock del frontend por lecturas directas a Directus con filtros de región y paginación.
- Métricas/observabilidad del API (tiempos de inferencia, tamaño de colas, etc.).

---

Este documento describe la arquitectura y la interacción completa del sistema de forma coherente, de manera que cada equipo (frontend, backend, datos y contenido) entienda cómo colaborar con el resto del stack.
