# Enhanced Makefile for inDoc SaaS Platform

.PHONY: help install dev saas build start stop clean test migrate monitor logs celery-logs ps health

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
	@echo "  make test-frontend- Run frontend tests only"
	@echo ""
	@echo "$(GREEN)Building:$(NC)"
	@echo "  make build        - Build all Docker images"
	@echo "  make build-prod   - Build production images"

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
	docker-compose up -d elasticsearch weaviate redis
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
	docker-compose up -d
	@sleep 20
	@make migrate
	@echo "$(GREEN)✅ All services started!$(NC)"
	@make ps

stop:
	@echo "$(YELLOW)Stopping Docker services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Docker services stopped$(NC)"

stop-all:
	@echo "$(RED)Stopping ALL services (Docker + local processes)...$(NC)"
	@chmod +x stop-all.sh
	@./stop-all.sh

restart: stop start

clean:
	@echo "$(RED)Cleaning up everything...$(NC)"
	docker-compose down -v
	rm -rf backend/__pycache__ backend/.pytest_cache backend/*.pyc
	rm -rf backend/app/__pycache__ backend/app/**/__pycache__
	rm -rf frontend/node_modules frontend/dist
	rm -rf data/uploads data/temp
	rm -rf monitoring/prometheus_data monitoring/grafana_data
	@echo "$(GREEN)✅ Cleanup complete$(NC)"

migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	@docker-compose exec -T backend alembic upgrade head || echo "$(YELLOW)⚠️  Run 'docker-compose up -d' first$(NC)"

db-shell:
	@echo "$(BLUE)Opening PostgreSQL shell...$(NC)"
	@echo "$(YELLOW)Connecting to localhost:5432$(NC)"
	psql -h localhost -p 5432 -U indoc_user -d indoc

db-backup:
	@echo "$(BLUE)Backing up database...$(NC)"
	@mkdir -p backups
	pg_dump -h localhost -p 5432 -U indoc_user indoc > backups/indoc_backup_$(date +%Y%m%d_%H%M%S).sql
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
	docker-compose logs -f --tail=100

celery-logs:
	docker-compose logs -f --tail=100 celery_worker celery_beat

ps:
	@echo "$(BLUE)Running services:$(NC)"
	@docker-compose ps

health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo -n "PostgreSQL (localhost): "
	@nc -z localhost 5432 2>/dev/null && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Not ready$(NC)"
	@echo -n "Redis: "
	@docker-compose exec -T redis redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Not ready$(NC)"
	@echo -n "Elasticsearch: "
	@curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️  Not ready$(NC)"
	@echo -n "Weaviate (port 8060): "
	@curl -s http://localhost:8060/v1/.well-known/ready > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(YELLOW)⚠️  Not ready$(NC)"
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
	docker-compose build

build-prod:
	@echo "$(BLUE)Building production images...$(NC)"
	docker buildx bake -f docker-bake.hcl

# Quick commands for common tasks
shell-backend:
	docker-compose exec backend /bin/bash

shell-worker:
	docker-compose exec celery_worker /bin/bash

redis-cli:
	docker-compose exec redis redis-cli

# Development helpers
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	cd backend && black . && isort .

lint:
	@echo "$(BLUE)Linting code...$(NC)"
	cd backend && flake8 . && mypy .