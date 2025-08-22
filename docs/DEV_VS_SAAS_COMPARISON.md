# `make dev` vs `make saas` - Complete Comparison

## Quick Summary

- **`make dev`**: Minimal setup for basic development (4 services)
- **`make saas`**: Full SaaS platform with all features (11+ services)

---

## `make dev` - Basic Development Environment

### What It Does
```bash
docker-compose up -d postgres elasticsearch weaviate redis
```

### Services Started (4 Docker containers)
1. **PostgreSQL** - Database
2. **Elasticsearch** - Text search
3. **Weaviate** - Vector search
4. **Redis** - Cache/session store

### What's NOT Included
- ❌ Celery workers (no async processing)
- ❌ Celery beat (no scheduled tasks)
- ❌ Flower (no task monitoring)
- ❌ Prometheus (no metrics collection)
- ❌ Grafana (no dashboards)
- ❌ Backend API server
- ❌ Frontend dev server
- ❌ Database migrations
- ❌ WebSocket support
- ❌ Ollama LLM check

### Use Cases
- Quick testing of search functionality
- Database development
- When you only need core services
- Lightweight development
- Testing without full stack

### Resource Usage
- **Memory**: ~2-3 GB
- **CPU**: Low
- **Disk**: Minimal
- **Startup Time**: ~10 seconds

### Manual Steps Required
After `make dev`, you need to manually:
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Start frontend
cd frontend
npm run dev

# Run migrations
docker-compose exec backend alembic upgrade head
```

---

## `make saas` - Full SaaS Platform

### What It Does
Runs `./start-saas.sh` which:
1. Checks all prerequisites
2. Starts ALL Docker services
3. Runs database migrations
4. Starts backend and frontend
5. Checks Ollama for LLM support
6. Provides comprehensive health checks

### Services Started (11+ services)

#### Docker Services (9 containers)
1. **PostgreSQL** - Database
2. **Elasticsearch** - Text search
3. **Weaviate** - Vector search
4. **Redis** - Cache/message broker
5. **Celery Worker** - Async task processing
6. **Celery Beat** - Scheduled tasks
7. **Flower** - Celery monitoring UI
8. **Prometheus** - Metrics collection
9. **Grafana** - Monitoring dashboards

#### Local Services (2+ processes)
10. **Backend API** - FastAPI server (if not in Docker)
11. **Frontend** - React dev server
12. **Ollama** - LLM service (optional)

### Features Enabled
- ✅ Document chat with WebSockets
- ✅ Bulk upload with progress tracking
- ✅ Async document processing
- ✅ Scheduled maintenance tasks
- ✅ Real-time monitoring
- ✅ Performance metrics
- ✅ Task queue visualization
- ✅ Database migrations
- ✅ Health checks
- ✅ LLM integration

### Use Cases
- Full platform development
- Testing all features
- Demo environments
- Integration testing
- Performance testing
- Production-like development

### Resource Usage
- **Memory**: ~4-6 GB
- **CPU**: Medium-High
- **Disk**: More (logs, metrics)
- **Startup Time**: ~30-45 seconds

### Automatic Setup
`make saas` automatically:
- Creates .env if missing
- Checks Docker status
- Starts all services
- Waits for health checks
- Runs migrations
- Checks Ollama
- Provides colored output
- Shows all access URLs

---

## Comparison Table

| Feature | `make dev` | `make saas` |
|---------|------------|-------------|
| **Services Started** | 4 | 11+ |
| **Async Processing** | ❌ | ✅ Celery |
| **Scheduled Tasks** | ❌ | ✅ Celery Beat |
| **Monitoring** | ❌ | ✅ Prometheus + Grafana |
| **Task UI** | ❌ | ✅ Flower |
| **WebSockets** | ❌ | ✅ Full support |
| **Database Migrations** | Manual | ✅ Automatic |
| **Health Checks** | ❌ | ✅ Comprehensive |
| **LLM Support** | Manual | ✅ Auto-check |
| **Backend Server** | Manual | ✅ Automatic |
| **Frontend Server** | Manual | ✅ Automatic |
| **Memory Usage** | ~2-3 GB | ~4-6 GB |
| **Startup Time** | ~10s | ~30-45s |
| **Complexity** | Simple | Full-featured |

---

## Access Points

### `make dev` - Limited Access
```
Frontend: http://localhost:5173 (if manually started)
Backend:  http://localhost:8000 (if manually started)
```

### `make saas` - Full Access
```
Frontend:        http://localhost:5173
Backend API:     http://localhost:8000/api/v1/docs
Flower:          http://localhost:5555
Grafana:         http://localhost:3000 (admin/admin)
Prometheus:      http://localhost:9090
```

---

## When to Use Which?

### Use `make dev` when:
- You only need databases and search engines
- Testing specific backend features
- Working on database schemas
- Limited system resources
- Quick debugging sessions
- You don't need async processing

### Use `make saas` when:
- Developing new features
- Testing the complete platform
- Need async task processing
- Testing WebSocket features
- Monitoring performance
- Demonstrating the platform
- Integration testing
- Testing bulk uploads
- Using document chat
- Need scheduled tasks

---

## Commands Comparison

### Starting Services
```bash
# Basic development
make dev
# Then manually start backend/frontend if needed

# Full SaaS platform
make saas
# Everything starts automatically
```

### Stopping Services
```bash
# Both use the same stop command
make stop

# Or stop everything including local processes
make stop-all
```

### Checking Status
```bash
# After make dev
docker-compose ps  # Shows only 4 services

# After make saas
docker-compose ps  # Shows 9+ services
make health        # Comprehensive health check
```

### Viewing Logs
```bash
# make dev - limited logs
docker-compose logs postgres elasticsearch

# make saas - comprehensive logs
make logs          # All services
make celery-logs   # Just Celery workers
```

---

## Migration Path

### From `make dev` to `make saas`
```bash
# Stop dev environment
make stop

# Start full platform
make saas
```

### From `make saas` to `make dev`
```bash
# Stop everything
make stop-all

# Start minimal
make dev
```

---

## Resource Optimization Tips

### If `make saas` is too heavy:
1. **Disable monitoring**: Comment out Prometheus/Grafana in docker-compose.yml
2. **Reduce Celery workers**: Edit concurrency in docker-compose.yml
3. **Skip Ollama**: Don't install/run Ollama for LLM features
4. **Use `make dev`**: Then manually start only what you need

### Custom Middle Ground:
```bash
# Start core + Celery (no monitoring)
docker-compose up -d postgres elasticsearch weaviate redis celery_worker

# Or create your own make target
make custom
```

---

## Troubleshooting

### `make dev` Issues
- **Services not accessible**: You need to manually start backend/frontend
- **No async tasks**: Celery is not running, tasks will fail

### `make saas` Issues
- **Out of memory**: Reduce services or increase Docker memory
- **Slow startup**: Normal, wait for all health checks
- **Port conflicts**: Check if ports are already in use

---

## Summary

- **`make dev`**: Quick, minimal, manual setup required
- **`make saas`**: Complete, automatic, resource-intensive

Choose based on what features you need to work with and your system resources!