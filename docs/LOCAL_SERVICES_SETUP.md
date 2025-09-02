# Using Local PostgreSQL and Ollama with inDoc

## Overview

inDoc is now configured to use your **existing local PostgreSQL** instance (port 5432) and **local Ollama** service instead of creating new Docker containers for these services. This approach:

- ✅ Saves resources (no duplicate PostgreSQL/Ollama instances)
- ✅ Uses your existing database setup
- ✅ Leverages your already-downloaded Ollama models
- ✅ Reduces Docker container count
- ✅ Simplifies database management

## Prerequisites

### 1. PostgreSQL (Required)
Your existing PostgreSQL must be running on `localhost:5432`

Check if PostgreSQL is running:
```bash
lsof -i :5432
# or
pg_isready -h localhost -p 5432
```

### 2. Ollama (Required for LLM features)
Your existing Ollama must be running

Check if Ollama is running:
```bash
ps aux | grep ollama
# or
ollama list
```

If not installed:
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve  # Start the service
ollama pull gemma:2b  # Download a small starter model (or your preferred model)
```

## Initial Setup

### Step 1: Setup Database
Run this once to create the inDoc database and user in your existing PostgreSQL:

```bash
make setup-db
# or
./setup-local-db.sh
```

This will:
- Create database: `indoc`
- Create user: `indoc_user`
- Set up required extensions
- Update your `.env` file

### Step 2: Configure Environment
Ensure your `.env` file has the correct settings:

```env
# Database - Using existing localhost PostgreSQL
POSTGRES_HOST=localhost  # For local development
POSTGRES_PORT=5432
POSTGRES_DB=indoc
POSTGRES_USER=indoc_user
POSTGRES_PASSWORD=your_password_here

# Ollama - Using existing local instance
OLLAMA_BASE_URL=http://localhost:11434
# Optional: OLLAMA_MODEL is empty by default; the app picks the first available model
OLLAMA_MODEL=
```

### Step 3: Run Migrations
Initialize the database schema:

```bash
cd backend
alembic upgrade head
```

## Starting the Application

### Option 1: Full SaaS Platform
```bash
make saas
```
This starts:
- ✅ Elasticsearch, Weaviate, Redis (in Docker)
- ✅ Celery workers, Flower, monitoring (in Docker)
- ✅ Backend and Frontend (locally)
- ✅ Uses your local PostgreSQL and Ollama

### Option 2: Basic Development
```bash
make dev
```
This starts only:
- ✅ Elasticsearch, Weaviate, Redis (in Docker)
- ✅ Uses your local PostgreSQL
- ❌ No Celery, monitoring, or automatic backend/frontend

## Docker Services Architecture

```yaml
# What's in Docker:
- Elasticsearch     # Text search
- Weaviate         # Vector search
- Redis            # Cache/message broker
- Celery Worker    # Async tasks
- Celery Beat      # Scheduled tasks
- Flower           # Task monitoring
- Prometheus       # Metrics
- Grafana          # Dashboards

# What's on localhost (NOT in Docker):
- PostgreSQL       # Database (port 5432)
- Ollama          # LLM service (port 11434)
- Backend API     # FastAPI (port 8000)
- Frontend        # React (port 5173)
```

## Connection Details

### From Local Development (Backend/Frontend running locally)
```python
# Backend connects to:
PostgreSQL: localhost:5432
Ollama: http://localhost:11434
Redis: localhost:6379
Elasticsearch: localhost:9200
Weaviate: localhost:8080
```

### From Docker Containers (Celery workers)
```python
# Docker containers connect to:
PostgreSQL: host.docker.internal:5432  # Special Docker hostname
Ollama: http://host.docker.internal:11434
Redis: redis:6379  # Internal Docker network
Elasticsearch: elasticsearch:9200
Weaviate: weaviate:8080
```

## Common Commands

### Database Operations
```bash
# Open PostgreSQL shell
make db-shell
# or
psql -h localhost -p 5432 -U indoc_user -d indoc

# Backup database
make db-backup
# or
pg_dump -h localhost -p 5432 -U indoc_user indoc > backup.sql

# Run migrations
cd backend && alembic upgrade head
```

### Service Management
```bash
# Start everything
make saas

# Stop Docker services only
make stop

# Stop everything including local processes
make stop-all

# Check service health
make health
```

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
lsof -i :5432

# Test connection
psql -h localhost -p 5432 -U indoc_user -d indoc

# If connection fails, check:
# 1. PostgreSQL is running
# 2. Database 'indoc' exists
# 3. User 'indoc_user' exists
# 4. Password in .env is correct
```

### Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if needed
ollama serve

# List available models
ollama list

# Pull a model if needed
ollama pull gemma:2b
```

### Docker Container Can't Connect to localhost
Docker containers use `host.docker.internal` to connect to localhost services:

```yaml
# In docker-compose.yml
environment:
  - DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db
  - OLLAMA_BASE_URL=http://host.docker.internal:11434
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## Benefits of This Approach

### Resource Efficiency
- No duplicate PostgreSQL instance
- No duplicate Ollama instance
- Reduced memory usage
- Fewer Docker containers to manage

### Development Convenience
- Use existing database tools
- Access PostgreSQL directly
- Use pgAdmin or other GUI tools
- Ollama models already downloaded

### Data Persistence
- Database persists outside Docker
- No risk of losing data with `docker-compose down -v`
- Easy backup and restore
- Can use existing PostgreSQL backups

## Migration from Docker PostgreSQL

If you were previously using PostgreSQL in Docker:

1. **Export data from Docker PostgreSQL:**
```bash
docker-compose exec postgres pg_dump -U indoc_user indoc > docker_backup.sql
```

2. **Import to local PostgreSQL:**
```bash
psql -h localhost -p 5432 -U indoc_user -d indoc < docker_backup.sql
```

3. **Update configuration:**
```bash
# Update .env
POSTGRES_HOST=localhost
```

4. **Remove PostgreSQL from docker-compose.yml** ✅ (Already done)

## Summary

The inDoc platform now intelligently uses:
- **Your existing PostgreSQL** on localhost:5432
- **Your existing Ollama** on localhost:11434
- **Docker only for** search engines, cache, and monitoring

This hybrid approach gives you the best of both worlds: containerized microservices where it makes sense, and local services for databases and LLMs where you already have them running.