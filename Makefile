# Enhanced Makefile for inDoc SaaS Platform

.PHONY: help install dev saas build start stop clean test migrate monitor logs celery-logs ps health \
	conda-env conda-install local-build local-e2e local-stop test-local test-backend-conda \
	local-full local-full-stop local-deps-start-brew local-deps-stop-brew migrate-local \
	check-deps-local health-local logs-local ps-local local-restart

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)inDoc SaaS Platform Commands:$(NC)"
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start basic development environment"
	@echo "  make saas         - Start full SaaS platform with all features"
	@echo "  make local-e2e    - Run full app locally (non-containerized app) using conda env"
	@echo "  make local-stop   - Stop locally started app processes"
	@echo "  make local-full   - NON-CONTAINERIZED app only (backend+celery+frontend) using conda env"
	@echo "  make local-full-stop - Stop NON-CONTAINERIZED app processes"
	@echo "  make local-restart - Restart NON-CONTAINERIZED app processes"
	@echo "  make check-deps-local - Check Postgres/Redis/Elasticsearch/Weaviate on localhost"
	@echo "  make health-local - Health check for local services and app (no Docker)"
	@echo "  make logs-local  - Tail local app logs (tmp/*.out)"
	@echo "  make ps-local    - Show local app PIDs"
	@echo "  make local-deps-start-brew - Start Postgres/Redis/Elasticsearch via Homebrew services"
	@echo "  make local-deps-stop-brew  - Stop Postgres/Redis/Elasticsearch via Homebrew services"
	@echo "  make migrate-local  - Run alembic migrations locally (conda env)"
	@echo "  make conda-env    - Create conda env 'indoc' (python=3.11)"
	@echo "  make conda-install- Install backend deps into conda env and frontend deps"
	@echo ""
	@echo "$(GREEN)Operations:$(NC)"
	@echo "  make start        - Start all services in background"
	@echo "  make stop         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make clean        - Clean up everything (containers, volumes, cache)"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make migrate      - Run database migrations"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo "  make db-backup    - Backup database"
	@echo ""
	@echo "$(GREEN)Monitoring:$(NC)"
	@echo "  make monitor      - Open all monitoring dashboards"
	@echo "  make logs         - Show logs for all services"
	@echo "  make celery-logs  - Show Celery worker logs"
	@echo "  make ps           - Show running services"
	@echo "  make health       - Check service health"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test         - Run all tests"
	@echo "  make test-backend - Run backend tests only"
	@echo "  make test-backend-conda - Run backend tests in conda env"
	@echo "  make test-frontend- Run frontend tests only"
	@echo "  make seed-data    - Generate comprehensive E2E test data"
	@echo "  make seed-data-clean - Generate fresh seed data (clean existing)"
	@echo "  make seed-data-realistic - Generate realistic business data for demos"
	@echo "  make seed-data-realistic-clean - Generate fresh realistic business data"
	@echo "  make e2e-test     - Run comprehensive E2E tests"
	@echo "  make e2e-full     - Complete E2E pipeline (setup + seed + test)"
	@echo ""
	@echo "$(GREEN)Building:$(NC)"
	@echo "  make build        - Build all Docker images"
	@echo "  make build-prod   - Build production images"
	@echo "  make local-build  - Build frontend (vite) using local toolchain"

# --- Conda-based local toolchain ---
CONDA?=conda
ENV_NAME?=indoc
CONDA_RUN=$(CONDA) run -n $(ENV_NAME)
START_DEPS?=1
ROOT_DIR:=$(CURDIR)
TMP_DIR:=$(ROOT_DIR)/tmp

conda-env:
	@echo "$(BLUE)Ensuring conda environment '$(ENV_NAME)' exists...$(NC)"
	@which $(CONDA) >/dev/null 2>&1 || { echo "$(RED)conda not found in PATH$(NC)"; exit 1; }
	@$(CONDA) env list | grep -E "^$(ENV_NAME)\s" >/dev/null 2>&1 || \
		$(CONDA) create -y -n $(ENV_NAME) python=3.11
	@echo "$(GREEN)✅ Conda environment ready: $(ENV_NAME)$(NC)"

conda-install: conda-env
	@echo "$(BLUE)Installing backend dependencies into conda env...$(NC)"
	@cd backend && $(CONDA_RUN) python -m pip install -r requirements.txt
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✅ Local toolchain ready (conda + npm)$(NC)"

local-build: conda-install
	@echo "$(BLUE)Building frontend (vite)...$(NC)"
	@cd frontend && npm run build
	@echo "$(GREEN)✅ Frontend built (dist/)$(NC)"

# Start full app locally (non-containerized app). Data services via compose.
local-e2e: conda-install
	@echo "$(BLUE)Starting supporting services (Elasticsearch, Weaviate, Redis)...$(NC)"
	@export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose up -d elasticsearch weaviate t2v-transformers redis
	@mkdir -p $(TMP_DIR)
	@echo "$(BLUE)Starting backend (uvicorn) in conda env...$(NC)"
	@cd backend && nohup $(CONDA_RUN) uvicorn app.main:app --host 0.0.0.0 --port 8000 > $(TMP_DIR)/backend.out 2>&1 & echo $$! > $(TMP_DIR)/backend.pid
	@sleep 2
	@echo "$(BLUE)Starting Celery worker...$(NC)"
	@cd backend && nohup $(CONDA_RUN) celery -A app.core.celery_app worker --loglevel=info --concurrency=2 > $(TMP_DIR)/celery_worker.out 2>&1 & echo $$! > $(TMP_DIR)/celery_worker.pid
	@echo "$(BLUE)Starting Celery beat...$(NC)"
	@cd backend && nohup $(CONDA_RUN) celery -A app.core.celery_app beat --loglevel=info > $(TMP_DIR)/celery_beat.out 2>&1 & echo $$! > $(TMP_DIR)/celery_beat.pid
	@echo "$(BLUE)Starting frontend (vite dev)...$(NC)"
	@cd frontend && nohup npm run dev -- --port 5173 > $(TMP_DIR)/frontend.out 2>&1 & echo $$! > $(TMP_DIR)/frontend.pid
	@echo "$(GREEN)✅ Local E2E started$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "API Docs: http://localhost:8000/api/v1/docs"

local-stop:
	@echo "$(YELLOW)Stopping local processes...$(NC)"
	@if [ -f $(TMP_DIR)/backend.pid ]; then kill `cat $(TMP_DIR)/backend.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/backend.pid; fi
	@if [ -f $(TMP_DIR)/celery_worker.pid ]; then kill `cat $(TMP_DIR)/celery_worker.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/celery_worker.pid; fi
	@if [ -f $(TMP_DIR)/celery_beat.pid ]; then kill `cat $(TMP_DIR)/celery_beat.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/celery_beat.pid; fi
	@if [ -f $(TMP_DIR)/frontend.pid ]; then kill `cat $(TMP_DIR)/frontend.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/frontend.pid; fi
	@echo "$(GREEN)✅ Local app processes stopped$(NC)"

# Completely NON-CONTAINERIZED app processes (expects Postgres/Redis/ES/Weaviate already available on localhost)
local-full: conda-install local-build
	@echo "$(BLUE)Starting NON-CONTAINERIZED app components using conda env '$(ENV_NAME)'...$(NC)"
	@echo "$(YELLOW)Attempting to start local dependencies via Homebrew (override with START_DEPS=0 to skip)...$(NC)"
	@$(MAKE) local-deps-start-brew
	@mkdir -p $(TMP_DIR)
	@echo "$(BLUE)Running database migrations...$(NC)"
	@$(MAKE) migrate-local || echo "$(YELLOW)⚠️  Migration failed (is Postgres running?)$(NC)"
	@cd backend && nohup $(CONDA_RUN) uvicorn app.main:app --host 0.0.0.0 --port 8000 > $(TMP_DIR)/backend.out 2>&1 & echo $$! > $(TMP_DIR)/backend.pid
	@sleep 2
	@cd backend && nohup $(CONDA_RUN) celery -A app.core.celery_app worker --loglevel=info --concurrency=2 > $(TMP_DIR)/celery_worker.out 2>&1 & echo $$! > $(TMP_DIR)/celery_worker.pid
	@cd backend && nohup $(CONDA_RUN) celery -A app.core.celery_app beat --loglevel=info > $(TMP_DIR)/celery_beat.out 2>&1 & echo $$! > $(TMP_DIR)/celery_beat.pid
	@cd frontend && nohup npm run dev -- --port 5173 > $(TMP_DIR)/frontend.out 2>&1 & echo $$! > $(TMP_DIR)/frontend.pid
	@echo "$(GREEN)✅ App started (no containers)$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "API Docs: http://localhost:8000/api/v1/docs"
	@echo "$(YELLOW)Note: Ensure Postgres(5432), Redis(6379), Elasticsearch(9200), Weaviate(8060) are running locally.$(NC)"

local-full-stop:
	@echo "$(YELLOW)Stopping NON-CONTAINERIZED app processes...$(NC)"
	@if [ -f $(TMP_DIR)/backend.pid ]; then kill `cat $(TMP_DIR)/backend.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/backend.pid; fi
	@if [ -f $(TMP_DIR)/celery_worker.pid ]; then kill `cat $(TMP_DIR)/celery_worker.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/celery_worker.pid; fi
	@if [ -f $(TMP_DIR)/celery_beat.pid ]; then kill `cat $(TMP_DIR)/celery_beat.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/celery_beat.pid; fi
	@if [ -f $(TMP_DIR)/frontend.pid ]; then kill `cat $(TMP_DIR)/frontend.pid` 2>/dev/null || true; rm -f $(TMP_DIR)/frontend.pid; fi
	@echo "$(GREEN)✅ NON-CONTAINERIZED app stopped$(NC)"

local-restart: local-full-stop local-full

check-deps-local:
	@echo "$(BLUE)Checking local dependencies on localhost...$(NC)"
	@echo -n "PostgreSQL (5432): "; nc -z localhost 5432 2>/dev/null && echo "$(GREEN)✅ Open$(NC)" || echo "$(RED)❌ Closed$(NC)"
	@echo -n "Redis (6379): "; nc -z localhost 6379 2>/dev/null && echo "$(GREEN)✅ Open$(NC)" || echo "$(RED)❌ Closed$(NC)"
	@echo -n "Elasticsearch (9200): "; nc -z localhost 9200 2>/dev/null && echo "$(GREEN)✅ Open$(NC)" || echo "$(RED)❌ Closed$(NC)"
	@echo -n "Weaviate (8060): "; nc -z localhost 8060 2>/dev/null && echo "$(GREEN)✅ Open$(NC)" || echo "$(YELLOW)⚠️ Closed$(NC)"
	@echo -n "t2v-transformers (internal): "; docker ps | grep -q indoc-t2v-transformers && echo "$(GREEN)✅ Running$(NC)" || echo "$(YELLOW)⚠️ Not running$(NC)"

health-local:
	@echo "$(BLUE)Checking local app and services health (no Docker)...$(NC)"
	@echo -n "Backend API: "; curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️ Not ready$(NC)"
	@echo -n "Metrics: "; curl -s http://localhost:8000/api/v1/metrics > /dev/null 2>&1 && echo "$(GREEN)✅ Exposed$(NC)" || echo "$(YELLOW)⚠️ Not available$(NC)"
	@echo -n "Frontend: "; curl -sI http://localhost:5173 > /dev/null 2>&1 && echo "$(GREEN)✅ Serving$(NC)" || echo "$(YELLOW)⚠️ Not serving$(NC)"
	@echo -n "PostgreSQL (localhost:5432): "; nc -z localhost 5432 2>/dev/null && echo "$(GREEN)✅ Reachable$(NC)" || echo "$(RED)❌ Down$(NC)"
	@echo -n "Redis (localhost:6379): "; (command -v redis-cli >/dev/null 2>&1 && redis-cli -h localhost ping | grep -q PONG) && echo "$(GREEN)✅ PONG$(NC)" || (nc -z localhost 6379 2>/dev/null && echo "$(GREEN)✅ Port open$(NC)" || echo "$(RED)❌ Down$(NC)")
	@echo -n "Elasticsearch (localhost:9200): "; curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️ Not ready$(NC)"

logs-local:
	@echo "$(BLUE)Tailing local app logs (Ctrl+C to stop)...$(NC)"
	@ls -1 $(TMP_DIR)/*.out 2>/dev/null || echo "No log files in $(TMP_DIR)"
	@tail -n 50 -f $(TMP_DIR)/*.out 2>/dev/null || true

ps-local:
	@echo "$(BLUE)Local app process IDs:$(NC)"
	@for f in backend celery_worker celery_beat frontend; do \
		if [ -f $(TMP_DIR)/$$f.pid ]; then \
			printf "%-15s %s\n" "$$f" "`cat $(TMP_DIR)/$$f.pid`"; \
		else \
			printf "%-15s %s\n" "$$f" "(not running)"; \
		fi; \
	  done

# Start/stop dependencies via Homebrew services (macOS)
local-deps-start-brew:
	@sh -c 'if [ "$(START_DEPS)" = "0" ]; then \
	  echo "Skipping deps start (START_DEPS=0)"; \
	else \
	  if ! command -v brew >/dev/null 2>&1; then echo "$(YELLOW)Homebrew not found; skipping deps start$(NC)"; exit 0; fi; \
	  echo "$(BLUE)Starting Postgres/Redis/Elasticsearch via brew services...$(NC)"; \
	  brew list --versions postgresql@17 >/dev/null 2>&1 || brew list --versions postgresql@15 >/dev/null 2>&1 || true; \
	  brew services start postgresql@17 || brew services start postgresql@15 || brew services start postgresql || true; \
	  brew services start redis || true; \
	  brew services start elasticsearch-full || brew services start elasticsearch || true; \
	  echo "$(GREEN)✅ Requested brew services to start$(NC)"; \
	fi'

local-deps-stop-brew:
	@command -v brew >/dev/null 2>&1 || { echo "$(YELLOW)Homebrew not found; skipping deps stop$(NC)"; exit 0; }
	@echo "$(YELLOW)Stopping Postgres/Redis/Elasticsearch via brew services...$(NC)"
	@brew services stop elasticsearch-full || brew services stop elasticsearch || true
	@brew services stop redis || true
	@brew services stop postgresql@17 || brew services stop postgresql@15 || brew services stop postgresql || true
	@echo "$(GREEN)✅ Requested brew services to stop$(NC)"

# Local migrations using conda env
migrate-local: conda-install
	@echo "$(BLUE)Running local alembic migrations in conda env...$(NC)"
	@cd backend && $(CONDA_RUN) sh -c 'set -e; \
	  export PYTHONPATH=$$PWD; \
	  echo "Checking current migration version..."; \
	  CUR=$$(alembic current 2>/dev/null || true); \
	  if echo "$$CUR" | grep -q "None"; then \
	    echo "No version recorded. Stamping head to match existing schema..."; \
	    alembic stamp head; \
	  else \
	    echo "Version detected. Upgrading to head (fallback to stamp head on conflict)..."; \
	    alembic upgrade head || alembic stamp head; \
	  fi'

test-local: conda-install
	@echo "$(BLUE)Running backend tests in conda env...$(NC)"
	@cd backend && $(CONDA_RUN) pytest -v
	@echo "$(BLUE)Running frontend tests...$(NC)"
	@cd frontend && npm test
	@echo "$(GREEN)✅ Local tests completed$(NC)"

test-backend-conda: conda-install
	@echo "$(BLUE)Running backend tests in conda env...$(NC)"
	@cd backend && $(CONDA_RUN) pytest -v

# E2E Testing targets
seed-data: conda-install
	@echo "$(BLUE)Generating comprehensive seed data for E2E testing...$(NC)"
	@$(CONDA_RUN) python tools/seed_data_generator.py
	@echo "$(GREEN)✅ Seed data generated$(NC)"

seed-data-clean: conda-install
	@echo "$(BLUE)Generating fresh seed data (cleaning existing)...$(NC)"
	@$(CONDA_RUN) python tools/seed_data_generator.py --clean
	@echo "$(GREEN)✅ Fresh seed data generated$(NC)"

seed-data-realistic: conda-install
	@echo "$(BLUE)Generating realistic business data for functional demonstration...$(NC)"
	@$(CONDA_RUN) python tools/realistic_seed_generator.py
	@echo "$(GREEN)✅ Realistic business data generated$(NC)"

seed-data-realistic-clean: conda-install
	@echo "$(BLUE)Generating fresh realistic business data (cleaning existing)...$(NC)"
	@$(CONDA_RUN) python tools/realistic_seed_generator.py --clean
	@echo "$(GREEN)✅ Fresh realistic business data generated$(NC)"

e2e-test: conda-install
	@echo "$(BLUE)Running comprehensive E2E tests...$(NC)"
	@$(CONDA_RUN) python tools/e2e_test_runner.py
	@echo "$(GREEN)✅ E2E tests completed - check results$(NC)"

e2e-full: local-e2e seed-data e2e-test
	@echo "$(GREEN)✅ Complete E2E testing pipeline finished$(NC)"

install:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@if [ -f "backend/requirements.txt" ]; then \
		echo "Installing backend dependencies..."; \
		cd backend && pip install -r requirements.txt; \
	fi
	@if [ -f "frontend/package.json" ]; then \
		echo "Installing frontend dependencies..."; \
		cd frontend && npm install; \
	fi
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

dev:
	@echo "$(BLUE)Starting basic development environment...$(NC)"
	@echo "$(YELLOW)Using existing PostgreSQL on localhost:5432$(NC)"
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose up -d elasticsearch weaviate redis
	@echo "Waiting for services..."
	@sleep 10
	@echo "$(GREEN)✅ Basic services started!$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "API Docs: http://localhost:8000/api/v1/docs"

setup-db:
	@echo "$(BLUE)Setting up local PostgreSQL for inDoc...$(NC)"
	@chmod +x setup-local-db.sh
	@./setup-local-db.sh

saas:
	@echo "$(BLUE)Starting full SaaS platform...$(NC)"
	@chmod +x start-saas.sh
	@./start-saas.sh

start:
	@echo "$(BLUE)Starting all services...$(NC)"
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose up -d
	@sleep 20
	@make migrate
	@echo "$(GREEN)✅ All services started!$(NC)"
	@make ps

stop:
	@echo "$(YELLOW)Stopping Docker services...$(NC)"
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose down
	@echo "$(GREEN)✅ Docker services stopped$(NC)"

stop-all:
	@echo "$(RED)Stopping ALL services (Docker + local processes)...$(NC)"
	@chmod +x scripts/stop-all.sh
	@./scripts/stop-all.sh

restart: stop start

clean:
	@echo "$(RED)Cleaning up everything...$(NC)"
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose down -v
	rm -rf backend/__pycache__ backend/.pytest_cache backend/*.pyc
	rm -rf backend/app/__pycache__ backend/app/**/__pycache__
	rm -rf frontend/node_modules frontend/dist
	rm -rf data/uploads data/temp
	rm -rf monitoring/prometheus_data monitoring/grafana_data
	@echo "$(GREEN)✅ Cleanup complete$(NC)"

migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	@docker compose exec -T backend alembic upgrade head || echo "$(YELLOW)⚠️  Run 'docker compose up -d' first$(NC)"

db-shell:
	@echo "$(BLUE)Opening PostgreSQL shell...$(NC)"
	@echo "$(YELLOW)Connecting to $(POSTGRES_HOST:-localhost):$(POSTGRES_PORT:-5432)$(NC)"
	psql -h $(POSTGRES_HOST:-localhost) -p $(POSTGRES_PORT:-5432) -U $(POSTGRES_USER:-indoc_user) -d $(POSTGRES_DB:-indoc)

db-backup:
	@echo "$(BLUE)Backing up database...$(NC)"
	@mkdir -p backups
	pg_dump -h $(POSTGRES_HOST:-localhost) -p $(POSTGRES_PORT:-5432) -U $(POSTGRES_USER:-indoc_user) $(POSTGRES_DB:-indoc) > backups/indoc_backup_$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Database backed up to backups/$(NC)"

monitor:
	@echo "$(BLUE)Opening monitoring dashboards...$(NC)"
	@echo "Opening Flower (Celery)..."
	@open http://localhost:5555 2>/dev/null || xdg-open http://localhost:5555 2>/dev/null || echo "Visit: http://localhost:5555"
	@echo "Opening Grafana (port 3030)..."
	@open http://localhost:3030 2>/dev/null || xdg-open http://localhost:3030 2>/dev/null || echo "Visit: http://localhost:3030"
	@echo "Opening Prometheus..."
	@open http://localhost:9090 2>/dev/null || xdg-open http://localhost:9090 2>/dev/null || echo "Visit: http://localhost:9090"

logs:
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose logs -f --tail=100

celery-logs:
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose logs -f --tail=100 celery_worker celery_beat

ps:
	@echo "$(BLUE)Running services:$(NC)"
	@docker compose ps

health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo -n "PostgreSQL (localhost): "
	@nc -z localhost 5432 2>/dev/null && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Not ready$(NC)"
	@echo -n "Redis: "
	@docker compose exec -T redis redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Not ready$(NC)"
	@echo -n "Elasticsearch: "
	@curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️  Not ready$(NC)"
	@echo -n "Weaviate (port 8060): "
	@curl -s http://localhost:8060/v1/.well-known/ready > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️  Not ready$(NC)"
	@echo -n "t2v-transformers: "
	@export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker ps | grep -q indoc-t2v-transformers && echo "$(GREEN)✅ Running$(NC)" || echo "$(YELLOW)⚠️ Not running$(NC)"
	@echo -n "Backend API: "
	@curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️  Not ready$(NC)"

test:
	@echo "$(BLUE)Running all tests...$(NC)"
	@make test-backend
	@make test-frontend

test-backend:
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd backend && pytest -v

test-frontend:
	@echo "$(BLUE)Running frontend tests...$(NC)"
	cd frontend && npm test

build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose build

build-prod:
	@echo "$(BLUE)Building production images...$(NC)"
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker buildx bake -f docker-bake.hcl

# Quick commands for common tasks
shell-backend:
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose exec backend /bin/bash

shell-worker:
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose exec celery_worker /bin/bash

redis-cli:
	export PATH="/Applications/Docker.app/Contents/Resources/bin:$$PATH" && docker compose exec redis redis-cli

# Development helpers
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	cd backend && black . && isort .

lint:
	@echo "$(BLUE)Linting code...$(NC)"
	cd backend && flake8 . && mypy .