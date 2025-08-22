# Getting Started with inDoc

## 🚀 Quick Start (Recommended)

The fastest way to get inDoc running:

```bash
./quick-start.sh
```

This script will:
1. Start all required Docker services
2. Set up a minimal backend server
3. Install frontend dependencies (if needed)
4. Start both backend and frontend servers

## 📋 Prerequisites

Before running inDoc, ensure you have:

- **Docker Desktop** installed and running
- **Node.js 18+** installed
- **Python 3.11+** installed
- **Ollama** (optional, for LLM features)

## 🛠️ Manual Setup

If the quick start script doesn't work, follow these steps:

### 1. Start Docker Services

```bash
docker-compose up -d postgres elasticsearch weaviate redis
```

Wait about 30 seconds for services to be ready.

### 2. Start Backend

```bash
cd backend
python3 run_server.py
```

The backend will be available at http://localhost:8000

### 3. Start Frontend

In a new terminal:

```bash
cd frontend
npm install  # First time only
npm run dev
```

The frontend will be available at http://localhost:5173

## 🔑 Login Credentials

Use these demo credentials to log in:

- **Username:** admin@indoc.local
- **Password:** admin123

## 🎯 What's Working

The current build includes:

✅ **Authentication System**
- Login/Register pages
- JWT-based authentication
- Role-based access control (RBAC)

✅ **Document Upload**
- Multi-file upload interface
- Drag-and-drop support
- Metadata tagging

✅ **Search Interface**
- Hybrid search UI
- Advanced filters
- Result ranking display

✅ **Dashboard**
- System overview
- Quick actions
- Status monitoring

✅ **Core Infrastructure**
- PostgreSQL database
- Elasticsearch for keyword search
- Weaviate for vector search
- Redis for caching

## 🔧 Troubleshooting

### "Can't connect to server" Error

This means the backend isn't running. Run:
```bash
cd backend
python3 run_server.py
```

### Docker Services Not Starting

1. Make sure Docker Desktop is running
2. Check if ports are already in use:
   - PostgreSQL: 5432
   - Elasticsearch: 9200
   - Weaviate: 8080
   - Redis: 6379

### Frontend Not Loading

1. Make sure you've installed dependencies:
```bash
cd frontend
npm install
```

2. Check if port 5173 is available

### Services Health Check

Check if services are running:
```bash
# PostgreSQL
docker-compose exec postgres pg_isready

# Elasticsearch
curl http://localhost:9200/_cluster/health

# Weaviate
curl http://localhost:8080/v1/.well-known/ready

# Redis
docker-compose exec redis redis-cli ping
```

## 🤖 Ollama Integration

To enable LLM features:

1. Install Ollama:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

2. Pull a model (choose one based on your needs):
```bash
# For general use and complex reasoning
ollama pull gpt-oss:120b

# For technical documents and code
ollama pull deepseek-r1:70b

# For multilingual documents
ollama pull kimi-k2:72b

# For documents with images/charts
ollama pull qwen2.5vl:72b
```

3. Update `.env` with your chosen model:
```
OLLAMA_MODEL=deepseek-r1:70b
```

## 📁 Project Structure

```
inDoc/
├── backend/          # FastAPI backend
│   ├── app/         # Application code
│   └── run_server.py # Quick start server
├── frontend/        # React frontend
│   ├── src/        # Source code
│   └── package.json
├��─ docker-compose.yml
├── quick-start.sh   # Quick start script
└── .env            # Configuration
```

## 🛑 Stopping Services

To stop all services:

1. Press `Ctrl+C` in the terminal running the scripts
2. Stop Docker services:
```bash
docker-compose down
```

## 📚 Next Steps

1. **Upload Documents**: Go to the Upload page and try uploading some PDFs or documents
2. **Search**: Use the Search page to find documents with AI-powered search
3. **Explore**: Check out the Dashboard for system overview

## 🆘 Need Help?

If you encounter issues:

1. Check the logs:
```bash
# Backend logs
docker-compose logs -f

# Frontend console
# Open browser developer tools (F12)
```

2. Restart everything:
```bash
docker-compose down
./quick-start.sh
```

3. Review the design documents in the `docs/` folder for detailed specifications

---

**Note**: This is a development setup. For production deployment, additional configuration for security, performance, and scalability is required.