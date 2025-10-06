# Eppur Si Muove - Exoplanet Classification Platform

Monorepo for an exoplanet classification platform using LightGBM ML model, FastAPI backend, Next.js frontend, and Directus CMS.

## ⚠️ Current Project Status

- This repository includes Web (Next.js), API (FastAPI + LightGBM), and Directus.
- Orchestration: docker-compose starts all services and creates a shared network.
- Integration between technologies: STILL PENDING IN THE UI.
  - The frontend currently uses a local mock dataset (see `apps/web/src/utils/mockData/celestialObjects.js`) via `CelestialDataManager`, so it does not query Directus or the API in real time yet.
  - The Web → Directus → API connection described in `docs/ARQUITECTURA_FUNCIONAL.md` is the reference for how it will work once wired.
- The inference and training API is operational and exposes endpoints documented in Swagger.
- Directus can be started and used; the script `scripts/seed_directus.py` illustrates the target collections and how they would be populated (credentials required).

> See the Functional Architecture document for the proposed E2E flow: `docs/ARQUITECTURA_FUNCIONAL.md`.

## 🏗️ Project Structure

```
eppur-si-muove/
├── apps/
│   ├── api/              # FastAPI backend service
│   │   ├── app/          # Application code
│   │   │   ├── services/ # Model & training services
│   │   │   └── schemas/  # Pydantic schemas
│   │   ├── models/       # ML models (LightGBM)
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── *.md          # API documentation
│   └── web/              # Next.js frontend
│       ├── src/
│       ├── public/
│       └── package.json
├── infra/
│   └── directus/         # Directus CMS configuration
│       ├── docker-compose.yml
│       ├── uploads/
│       └── extensions/
├── docs/                 # Project documentation
│   ├── DEPLOYMENT_PLAN.md
│   └── research.md
├── data/                 # Training datasets
│   └── data_set_S_FP.csv
├── packages/             # Shared packages (future)
└── docker-compose.yml    # Full stack orchestration
```

## 🚀 Services

| Service | Port | Description |
|---------|------|-------------|
| **Next.js Web App** | 3000 | Frontend application |
| **FastAPI API** | 8000 | ML inference service |
| **Directus CMS** | 8055 | Headless CMS |
| PostgreSQL | - | Database (internal) |
| Redis | - | Cache (internal) |

## 📋 Prerequisites

- **Docker** & **Docker Compose** v2+ (recommended)
- **Node.js** 20+ (for local web development)
- **Python** 3.11+ (for local API development)

> **Note:** This project has two Docker Compose configurations. See [DOCKER_STRATEGY.md](DOCKER_STRATEGY.md) for details on which one to use.

## 🎯 Quick Start

### Option 1: Full Stack with Docker (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd eppur-si-muove_
   ```

2. **Configure environment variables**:
   ```bash
   make setup
   # Edit .env with your configuration if needed
   ```

3. **Start all services** (single command):
   ```bash
   make test-all
   ```
   
   Or manually:
   ```bash
   docker compose build
   docker compose up -d
   ```

4. **Access the services**:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/api/docs
   - Directus: http://localhost:8055

### 🎥 Video Demo
- Swagger making predict requests: https://youtu.be/yV94bGyJpL4?si=kcw73K6Qg3s972Ts

5. **View logs**:
   ```bash
   make logs
   ```

6. **Stop all services**:
   ```bash
   make test-stop
   ```

### Option 2: Individual Services

#### Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

Access at http://localhost:3000

#### Backend (FastAPI)

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Access API docs at http://localhost:8000/api/docs

#### Directus CMS (Standalone)

```bash
cd infra/directus
cp env.example .env
# Edit .env and configure
docker compose up -d
```

Access at http://localhost:8055

> **Note:** See [DOCKER_STRATEGY.md](DOCKER_STRATEGY.md) to understand the difference between the full stack and Directus standalone.

## 🧪 Machine Learning Model

The project uses **LightGBM** for binary classification of exoplanets (CANDIDATE vs CONFIRMED).

### Model Features
- `radio_planeta` - Planet radius
- `temp_planeta` - Planet temperature (Kelvin)
- `periodo_orbital` - Orbital period (days)
- `temp_estrella` - Star temperature (Kelvin)
- `radio_estrella` - Star radius
- `loc1_ra` - Right Ascension coordinate
- `loc2_dec` - Declination coordinate
- `loc3_dist` - Distance to star (parsecs)

### Training

✅ **Model Migration Complete**: All code from Jupyter notebook has been migrated to FastAPI services.

**Training Options**:
1. **From CSV**: `POST /api/v1/training/train-csv` (best for large datasets)
2. **From JSON**: `POST /api/v1/training/train-json` (best for API integrations like Directus)

**Training Data**: Sample dataset available in `data/data_set_S_FP.csv`

See [`apps/api/TRAINING_GUIDE.md`](apps/api/TRAINING_GUIDE.md) for complete training documentation.

## 📚 Documentation
- **Functional Architecture (E2E)**: [`docs/ARQUITECTURA_FUNCIONAL.md`](docs/ARQUITECTURA_FUNCIONAL.md)
- **API Service**: [`apps/api/README.md`](apps/api/README.md)
- **Training Guide**: [`apps/api/TRAINING_GUIDE.md`](apps/api/TRAINING_GUIDE.md)
- **API Testing**: [`apps/api/TEST_API.md`](apps/api/TEST_API.md)
- **Migration Summary**: [`apps/api/MIGRATION_SUMMARY.md`](apps/api/MIGRATION_SUMMARY.md)
- **Web App**: [`apps/web/README.md`](apps/web/README.md) (if exists)
- **Directus Setup**: [`infra/directus/README.md`](infra/directus/README.md)
- **Deployment Plan**: [`docs/DEPLOYMENT_PLAN.md`](docs/DEPLOYMENT_PLAN.md)
- **ML Research**: [`docs/research.md`](docs/research.md)

## 🛠️ Development

### Project Philosophy

This is a **monorepo** structure that allows:
- **Unified version control** for all services
- **Shared dependencies** in the `packages/` directory
- **Coordinated deployment** via docker-compose
- **Clear separation** between services

### Tech Stack

**Frontend**:
- Next.js (React framework)
- Modern UI/UX

**Backend**:
- FastAPI (Python web framework)
- LightGBM (ML model)
- Pydantic (data validation)
- Uvicorn (ASGI server)

**CMS**:
- Directus (headless CMS)
- PostgreSQL (database)
- Redis (cache)

### Adding New Services

To add a new service to the monorepo:

1. Create directory in `apps/` or `infra/`
2. Add service configuration
3. Update root `docker-compose.yml`
4. Update this README

## 🔐 Security Notes

⚠️ **Before production deployment**:

1. ✅ Change all default passwords
2. ✅ Generate secure random keys for Directus
3. ✅ Update CORS origins for all services
4. ✅ Enable HTTPS/SSL
5. ✅ Configure proper firewall rules
6. ✅ Use environment-specific `.env` files
7. ✅ Never commit `.env` files to version control

## 📦 Seed Directus Data

You can now seed the Directus CMS in two ways:

### Option A: Using the Directus Tool (no external scripts)
- Start the stack (Directus/API): `make up` (or `make test-all`)
- Open Directus: http://localhost:8055
- Use the Directus tool to insert sample data (as done in this session). See the guide:
  - docs/SEEDING_WITH_DIRECTUS_TOOL.md
- This keeps all data creation inside Directus (planets, discoveries, training_datasets, training_runs, predictions). For planet_flags, use the small manual Flow recipe provided in the doc to set the `user` as the current user.

### Option B: Python Seeder (legacy/alternative)
Once the stack is running (make up or make test-all), you can populate Directus with sample data using the local CSV and API predictions.

Steps:

1. Ensure services are running:
   - Directus at http://localhost:8055
   - API at http://localhost:8000
2. Run the seeding script:

```bash
make seed-directus
```

What it does:
- Creates ~50 planets from data/data_set_final.csv (maps English disposition → Spanish)
- Creates sample discoveries and per-user planet flags (for the admin user)
- Registers a training dataset entry and a sample training run
- Calls the API /api/v1/predict/batch with apps/api/test_payloads/batch_mixed_all_classes.json and stores results in predictions

Directus URLs:
- Planets: http://localhost:8055/admin/content/planets
- Discoveries: http://localhost:8055/admin/content/discoveries
- Planet Flags: http://localhost:8055/admin/content/planet_flags
- Training Datasets: http://localhost:8055/admin/content/training_datasets
- Training Runs: http://localhost:8055/admin/content/training_runs
- Predictions: http://localhost:8055/admin/content/predictions

Notes:
- Default Directus admin credentials (override via env): admin@example.com / d1r3ctu5
- The seeder uses only Python stdlib (no extra deps).

## 🧰 Useful Commands

```bash
# Build all services
make build

# Start all services
make up

# Start specific service
docker compose up -d web
docker compose up -d api
docker compose up -d directus

# View logs
make logs              # All services
make logs-web         # Web only
make logs-api         # API only
make logs-directus    # Directus only

# Check status
make status

# Restart a service
make restart-api
make restart-web

# Remove all data (DANGEROUS!)
make clean

# Execute command in running container
docker compose exec api python -c "print('Hello')"

# Open shell in container
make shell-api
make shell-web
make shell-directus
```

## 📝 License

[Your License Here]

## 👥 Contributors

[Your Contributors Here]

---

**Status**: ✅ **Production Ready** - All services functional, model migrated, training endpoints available


## 🧠 Model Training and Usage (Summary)

- Current status:
  - A trained LightGBM model exists at `apps/api/models/exoplanets_lgbm_pipeline.joblib`.
  - While it exists, the API blocks new training runs to protect the artifact.
- Training flow:
  - Check status: `GET /api/v1/training/status` (field `can_train`).
  - Train from CSV: `POST /api/v1/training/train-csv`.
  - Train from JSON: `POST /api/v1/training/train-json` (minimum 100 records).
  - Details and requirements in `apps/api/TRAINING_GUIDE.md`.
- Using the model (inference):
  - Single prediction: `POST /api/v1/predict` with 8 features (`radio_planeta`, `temp_planeta`, `periodo_orbital`, `temp_estrella`, `radio_estrella`, `loc1_ra`, `loc2_dec`, `loc3_dist`).
  - Batch prediction: `POST /api/v1/predict/batch` with `{ candidates: [...] }`.
  - Full examples in `apps/api/TEST_API.md`.
- Important notes:
  - To retrain, delete the model file and repeat the training process.
  - The Web app does NOT consume these endpoints yet; it currently uses a local mock dataset. Integration will happen when wiring Web → API and/or Web → Directus → API.

## 🔗 How to Connect the Technologies (Summary)

- Docker Compose already brings up Web (3000), API (8000), and Directus (8055) on the `eppur-network` bridge network.
- Key environment variables:
  - Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DIRECTUS_URL`.
  - API: `CORS_ORIGINS`, `DIRECTUS_URL`.
  - Directus: `PUBLIC_URL`, `CORS_ORIGIN`, `KEY`, `SECRET`.
- E2E reference and integration contracts: `docs/ARQUITECTURA_FUNCIONAL.md`.
