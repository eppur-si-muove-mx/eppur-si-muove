.PHONY: help build up down logs clean restart

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker compose build

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## View logs from all services
	docker compose logs -f

logs-web: ## View logs from web service
	docker compose logs -f web

logs-api: ## View logs from API service
	docker compose logs -f api

logs-directus: ## View logs from Directus
	docker compose logs -f directus

restart: ## Restart all services
	docker compose restart

restart-web: ## Restart web service
	docker compose restart web

restart-api: ## Restart API service
	docker compose restart api

clean: ## Remove all containers, volumes, and images
	docker compose down -v
	docker system prune -f

dev-web: ## Run web app in development mode (local)
	cd apps/web && npm run dev

dev-api: ## Run API in development mode (local)
	cd apps/api && uvicorn app.main:app --reload

dev-api-standalone: ## Run only API service (requires Python venv)
	@echo "Starting FastAPI server..."
	@cd apps/api && \
	if [ ! -d "venv" ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv venv; \
		echo "Installing dependencies..."; \
		. venv/bin/activate && pip install -r requirements.txt; \
	fi && \
	. venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api-only: ## Start only the API service with docker compose
	docker compose up -d api

api-only-logs: ## View logs from API service only
	docker compose logs -f api

api-only-stop: ## Stop only the API service
	docker compose stop api

api-test: ## Test API with a sample prediction
	@echo "Testing API health endpoint..."
	@curl -s http://localhost:8000/api/v1/health | python3 -m json.tool || echo "API not responding"
	@echo "\nTesting model info endpoint..."
	@curl -s http://localhost:8000/api/v1/model/info | python3 -m json.tool || echo "API not responding"

install-web: ## Install web dependencies
	cd apps/web && npm install

install-api: ## Install API dependencies
	cd apps/api && pip install -r requirements.txt

setup: ## Initial setup - copy env files
	@if [ ! -f .env ]; then cp env.example .env; echo "Created .env file"; fi
	@if [ ! -f infra/directus/.env ]; then cp infra/directus/env.example infra/directus/.env; echo "Created infra/directus/.env file"; fi
	@if [ ! -f apps/api/.env ]; then cp apps/api/env.example apps/api/.env; echo "Created apps/api/.env file"; fi
	@echo "Setup complete! Please edit .env files with your configuration."

status: ## Show status of all services
	docker compose ps

shell-api: ## Open shell in API container
	docker compose exec api /bin/sh

shell-web: ## Open shell in web container
	docker compose exec web /bin/sh

shell-directus: ## Open shell in Directus container
	docker compose exec directus /bin/sh

db-backup: ## Backup PostgreSQL database
	docker compose exec postgres pg_dump -U directus directus > backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore: ## Restore PostgreSQL database (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Please specify BACKUP_FILE=your_backup.sql"; exit 1; fi
	docker compose exec -T postgres psql -U directus directus < $(BACKUP_FILE)

test-all: ## Test complete infrastructure - build, start all services and show status
	@echo "🚀 Building and starting all services..."
	docker compose build
	docker compose up -d
	@echo "\n⏳ Waiting for services to be ready (30 seconds)..."
	@sleep 30
	@echo "\n📊 Service Status:"
	@docker compose ps
	@echo "\n✅ All services started!"
	@echo "\n🌐 Access your services at:"
	@echo "   - Web App:    http://localhost:3000"
	@echo "   - API Docs:   http://localhost:8000/api/docs"
	@echo "   - Directus:   http://localhost:8055"
	@echo "\n📋 View logs with:  make logs"
	@echo "🛑 Stop all with:   make test-stop"

test-stop: ## Stop all test services
	@echo "🛑 Stopping all services..."
	docker compose down
	@echo "✅ All services stopped!"

seed-directus: ## Seed Directus with sample data (requires services up)
	@echo "Seeding Directus collections with sample data..."
	@python3 scripts/seed_directus.py || (echo "Seeding failed. Ensure Directus/API are running (make up)" && exit 1)
