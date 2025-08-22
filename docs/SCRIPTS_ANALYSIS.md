# inDoc Scripts and Build Files Analysis

## Overview
The inDoc project includes several scripts and build files for different deployment scenarios. Here's a comprehensive analysis of each and recommendations for their use with the new SaaS implementation.

## Script Files Analysis

### 1. **quick-start.sh** 🚀
**Purpose**: Rapid development setup with minimal configuration
**What it does**:
- Creates a minimal FastAPI server with mock endpoints
- Starts only essential Docker services (PostgreSQL, Elasticsearch, Weaviate, Redis)
- Installs frontend dependencies if needed
- Provides demo login credentials

**Should you use it?**: ❌ **NO - OUTDATED**
- Creates a simplified mock server that doesn't include our new features
- Doesn't start Celery workers or monitoring services
- Doesn't include WebSocket support or chat functionality
- Good for initial testing but not for the enhanced SaaS version

### 2. **setup-database.sh** 🗄️
**Purpose**: Initialize PostgreSQL database with tables and default users
**What it does**:
- Checks Docker and PostgreSQL status
- Creates database tables (users, documents, audit_logs)
- Inserts default users with different roles
- Uses bcrypt-hashed passwords

**Should you use it?**: ⚠️ **PARTIALLY - NEEDS UPDATE**
- Good for initial database setup
- **Missing**: New tables for multi-tenancy (tenants, conversations, messages)
- **Missing**: tenant_id columns and new indexes
- Should run Alembic migrations instead: `alembic upgrade head`

### 3. **start.sh** 🎯
**Purpose**: Production-like startup with all services
**What it does**:
- Checks for Ollama installation and models
- Starts core Docker services
- Creates Python virtual environment
- Installs dependencies
- Starts backend and frontend servers

**Should you use it?**: ⚠️ **PARTIALLY - NEEDS UPDATE**
- Good foundation but missing new services
- **Missing**: Celery workers and beat scheduler
- **Missing**: Prometheus and Grafana monitoring
- **Missing**: Flower for Celery monitoring
- Doesn't use the enhanced docker-compose.yml

### 4. **Makefile** 🛠️
**Purpose**: Convenient command shortcuts for common tasks
**Commands**:
- `make install`: Install dependencies
- `make dev`: Start development environment
- `make build`: Build Docker images
- `make start`: Start production environment
- `make stop`: Stop all services
- `make clean`: Clean up containers and volumes
- `make test`: Run tests

**Should you use it?**: ✅ **YES - WITH MODIFICATIONS**
- Well-structured and convenient
- Needs updates to include new services
- Should add commands for Celery and monitoring

### 5. **docker-bake.hcl** 🐳
**Purpose**: Multi-platform Docker image building
**What it does**:
- Defines build targets for API, UI, and processor
- Supports AMD64 and ARM64 architectures
- Uses build caching for efficiency
- Configured for GitHub Container Registry

**Should you use it?**: ✅ **YES - FOR PRODUCTION**
- Excellent for CI/CD pipelines
- Good for building production images
- Needs a `Dockerfile.processor` for Celery workers

## Recommended Startup Approach

### For Development (Updated Approach)

Create a new script `start-saas.sh`:

```bash
#!/bin/bash

# inDoc SaaS Development Startup Script

echo "🚀 Starting inDoc SaaS Platform..."

# Check prerequisites
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Create .env if needed
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file - please update with your settings"
fi

# Start all services with docker-compose
echo "🐳 Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec backend alembic upgrade head

# Check service health
echo "🔍 Checking services..."
docker-compose ps

echo ""
echo "✅ inDoc SaaS Platform is running!"
echo ""
echo "📍 Access Points:"
echo "   • Frontend:        http://localhost:5173"
echo "   • Backend API:     http://localhost:8000/api/v1/docs"
echo "   • Flower (Celery): http://localhost:5555"
echo "   • Grafana:         http://localhost:3000 (admin/admin)"
echo "   • Prometheus:      http://localhost:9090"
echo ""
echo "📝 Default Login:"
echo "   • Email: admin@indoc.local"
echo "   • Password: admin123"
echo ""
echo "🛑 To stop: docker-compose down"
```

### Updated Makefile

```makefile
# Enhanced Makefile for inDoc SaaS

.PHONY: help install dev start stop clean test migrate monitor

help:
	@echo "inDoc SaaS Platform Commands:"
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Start development environment"
	@echo "  make start      - Start full SaaS platform"
	@echo "  make stop       - Stop all services"
	@echo "  make clean      - Clean up everything"
	@echo "  make test       - Run all tests"
	@echo "  make migrate    - Run database migrations"
	@echo "  make monitor    - Open monitoring dashboards"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev:
	docker-compose up -d
	@echo "Waiting for services..."
	sleep 20
	docker-compose exec backend alembic upgrade head
	@echo "✅ Development environment ready!"
	@echo "Frontend: http://localhost:5173"
	@echo "API Docs: http://localhost:8000/api/v1/docs"
	@echo "Flower: http://localhost:5555"
	@echo "Grafana: http://localhost:3000"

start:
	docker-compose up -d
	sleep 20
	docker-compose exec backend alembic upgrade head
	@echo "✅ SaaS Platform started!"

stop:
	docker-compose down

clean:
	docker-compose down -v
	rm -rf backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/node_modules frontend/dist
	rm -rf data/uploads data/temp

test:
	cd backend && pytest
	cd frontend && npm test

migrate:
	docker-compose exec backend alembic upgrade head

monitor:
	@echo "Opening monitoring dashboards..."
	open http://localhost:5555  # Flower
	open http://localhost:3000  # Grafana
	open http://localhost:9090  # Prometheus
```

## Environment Configuration Updates

Update `.env` file with new requirements:

```env
# Add to existing .env.example

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Monitoring
GRAFANA_PASSWORD=admin
PROMETHEUS_RETENTION=30d

# Multi-tenancy
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
MAX_DOCUMENTS_PER_TENANT=10000
MAX_STORAGE_GB_PER_TENANT=100

# WebSocket
WS_HEARTBEAT_INTERVAL=30
WS_CONNECTION_TIMEOUT=60

# Upload Settings
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_EXTENSIONS=pdf,docx,xlsx,pptx,txt,html,xml,json,eml,jpg,png,zip
UPLOAD_DIR=/app/uploads
```

## Recommended Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone <repository>
cd inDoc

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Use the Makefile for convenience
make install
```

### 2. Development
```bash
# Start everything with monitoring
make dev

# Or use docker-compose directly
docker-compose up -d

# Run migrations
make migrate

# Watch logs
docker-compose logs -f backend celery_worker
```

### 3. Testing
```bash
# Run tests
make test

# Test specific features
curl -X POST http://localhost:8000/api/v1/chat/conversations
curl -X POST http://localhost:8000/api/v1/files/upload/bulk
```

### 4. Monitoring
```bash
# Open monitoring dashboards
make monitor

# Check Celery tasks
open http://localhost:5555

# View metrics
open http://localhost:3000
```

### 5. Production Build
```bash
# Build multi-platform images
docker buildx bake -f docker-bake.hcl

# Or build specific service
docker build -t indoc-backend ./backend
```

## Summary

### ✅ Use These:
1. **Makefile** - With updates for new services
2. **docker-bake.hcl** - For production builds
3. **docker-compose.yml** - Already updated with all services

### ⚠️ Update These:
1. **setup-database.sh** - Replace with Alembic migrations
2. **start.sh** - Update to include all new services

### ❌ Don't Use These:
1. **quick-start.sh** - Too simplified, missing features

### 📝 Create New:
1. **start-saas.sh** - Comprehensive startup for SaaS version
2. **Dockerfile.processor** - For Celery worker container

## Next Steps

1. Create the updated startup script:
```bash
chmod +x start-saas.sh
./start-saas.sh
```

2. Use the Makefile for daily development:
```bash
make dev    # Start everything
make stop   # Stop everything
make clean  # Clean up
```

3. For production deployment, use docker-compose with proper environment variables:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The existing scripts provide a good foundation but need updates to support the new SaaS features including WebSockets, Celery workers, and monitoring stack.