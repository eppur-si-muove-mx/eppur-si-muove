# Eppur Si Muove - Exoplanet Classification Platform

Monorepo for an exoplanet classification platform using LightGBM ML model, FastAPI backend, Next.js frontend, and Directus CMS.

## 🏗️ Project Structure

```
eppur-si-muove/
├── apps/
│   ├── api/              # FastAPI backend service
│   │   ├── app/          # Application code
│   │   ├── models/       # ML models (LightGBM)
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── web/              # Next.js frontend
│       ├── src/
│       ├── public/
│       └── package.json
├── infra/
│   └── directus/         # Directus CMS configuration
│       ├── docker-compose.yml
│       ├── uploads/
│       └── extensions/
├── migrate/              # ML model notebooks and research
│   ├── notebook.ipynb
│   ├── DEPLOYMENT_PLAN.md
│   ├── EXPLANATION.md
│   └── research.md
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

- **Docker** & **Docker Compose** (recommended)
- **Node.js** 20+ (for local web development)
- **Python** 3.11+ (for local API development)

## 🎯 Quick Start

### Option 1: Full Stack with Docker (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd eppur-si-muove_
   ```

2. **Configure environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Access the services**:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/api/docs
   - Directus: http://localhost:8055

5. **View logs**:
   ```bash
   docker-compose logs -f
   ```

6. **Stop all services**:
   ```bash
   docker-compose down
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

#### Directus CMS

```bash
cd infra/directus
cp env.example .env
# Edit .env and configure
docker-compose up -d
```

Access at http://localhost:8055

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

### Migration Status

⚠️ **In Progress**: The model is currently in the `migrate/` directory as a Jupyter notebook. Migration to the FastAPI service is pending.

**Next Steps**:
1. Export trained model from notebook
2. Integrate model loading in FastAPI
3. Implement prediction endpoints
4. Add batch processing

See `migrate/DEPLOYMENT_PLAN.md` for detailed migration strategy.

## 📚 Documentation

- **API Service**: [`apps/api/README.md`](apps/api/README.md)
- **Web App**: [`apps/web/README.md`](apps/web/README.md) (if exists)
- **Directus Setup**: [`infra/directus/README.md`](infra/directus/README.md)
- **Migration Guide**: [`migrate/DEPLOYMENT_PLAN.md`](migrate/DEPLOYMENT_PLAN.md)
- **ML Research**: [`migrate/research.md`](migrate/research.md)

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

## 🧰 Useful Commands

```bash
# Build all services
docker-compose build

# Start specific service
docker-compose up web
docker-compose up api
docker-compose up directus

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f api

# Restart a service
docker-compose restart api

# Remove all data (DANGEROUS!)
docker-compose down -v

# Execute command in running container
docker-compose exec api python -c "print('Hello')"
```

## 📝 License

[Your License Here]

## 👥 Contributors

[Your Contributors Here]

---

**Status**: 🚧 Under Development - Model migration in progress
