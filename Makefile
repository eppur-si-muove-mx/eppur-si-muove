.PHONY: help build up down logs clean restart

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-web: ## View logs from web service
	docker-compose logs -f web

logs-api: ## View logs from API service
	docker-compose logs -f api

logs-directus: ## View logs from Directus
	docker-compose logs -f directus

restart: ## Restart all services
	docker-compose restart

restart-web: ## Restart web service
	docker-compose restart web

restart-api: ## Restart API service
	docker-compose restart api

clean: ## Remove all containers, volumes, and images
	docker-compose down -v
	docker system prune -f

dev-web: ## Run web app in development mode (local)
	cd apps/web && npm run dev

dev-api: ## Run API in development mode (local)
	cd apps/api && uvicorn app.main:app --reload

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
	docker-compose ps

shell-api: ## Open shell in API container
	docker-compose exec api /bin/sh

shell-web: ## Open shell in web container
	docker-compose exec web /bin/sh

shell-directus: ## Open shell in Directus container
	docker-compose exec directus /bin/sh

db-backup: ## Backup PostgreSQL database
	docker-compose exec postgres pg_dump -U directus directus > backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore: ## Restore PostgreSQL database (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Please specify BACKUP_FILE=your_backup.sql"; exit 1; fi
	docker-compose exec -T postgres psql -U directus directus < $(BACKUP_FILE)
