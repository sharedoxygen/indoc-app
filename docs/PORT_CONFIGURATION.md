# inDoc Port Configuration

## Port Conflicts Resolved

Due to conflicts with existing services on your system, the following ports have been changed:

### Changed Ports

| Service | Original Port | New Port | Reason |
|---------|--------------|----------|---------|
| **Grafana** | 3000 | **3030** | Port 3000 in use by Node.js process |
| **Weaviate** | 8080 | **8060** | Port 8080 in use by Java process |

### Unchanged Ports

| Service | Port | Status |
|---------|------|--------|
| **PostgreSQL** | 5432 | Using existing localhost instance |
| **Frontend** | 5173 | Available |
| **Backend API** | 8000 | Available |
| **Elasticsearch** | 9200 | Available |
| **Redis** | 6379 | Available |
| **Flower** | 5555 | Available |
| **Prometheus** | 9090 | Available |
| **Ollama** | 11434 | Using existing localhost instance |

## Access URLs

After starting the services with `make saas`, access them at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/v1/docs
- **Flower (Celery)**: http://localhost:5555
- **Grafana**: http://localhost:3030 ⚠️ (changed from 3000)
- **Prometheus**: http://localhost:9090
- **Weaviate**: http://localhost:8060 ⚠️ (changed from 8080)
- **Elasticsearch**: http://localhost:9200

## Configuration Updates

### Environment Variables (.env)

Make sure your `.env` file reflects the new Weaviate port:

```env
# Weaviate - Updated port
WEAVIATE_URL=http://localhost:8060
```

### Backend Configuration

If your backend code has hardcoded Weaviate URLs, update them:

```python
# Old
weaviate_client = weaviate.Client("http://localhost:8080")

# New
weaviate_client = weaviate.Client("http://localhost:8060")
```

### Docker Internal Communication

Services within Docker still communicate on standard ports internally:
- Weaviate is still `weaviate:8080` internally
- Grafana is still `grafana:3000` internally

Only the external exposed ports have changed.

## Checking for Port Conflicts

Before starting services, you can check if ports are available:

```bash
# Check all inDoc ports
lsof -i :5432  # PostgreSQL (should be in use - that's expected)
lsof -i :5173  # Frontend
lsof -i :8000  # Backend
lsof -i :9200  # Elasticsearch
lsof -i :8060  # Weaviate (changed from 8080)
lsof -i :6379  # Redis
lsof -i :5555  # Flower
lsof -i :9090  # Prometheus
lsof -i :3030  # Grafana (changed from 3000)
```

## Troubleshooting

### If you still get port conflicts:

1. **Stop conflicting services**:
```bash
# Find what's using a port (example for port 3000)
lsof -i :3000
# Kill the process
kill -9 <PID>
```

2. **Change the port in docker-compose.yml**:
```yaml
services:
  grafana:
    ports:
      - "3031:3000"  # Change 3031 to any available port
```

3. **Use a different port temporarily**:
```bash
# Override port when starting
GRAFANA_PORT=3031 docker-compose up -d
```

## Summary

The inDoc platform now uses:
- **Port 3030** for Grafana (instead of 3000)
- **Port 8060** for Weaviate (instead of 8080)

All other services use their standard ports. These changes ensure no conflicts with your existing development environment.