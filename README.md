# inDoc - Enterprise Document Management & AI Search Platform

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org)

An intelligent, enterprise-grade document management and search platform that ingests, processes, and securely stores various document formats while providing fast, accurate, and compliant retrieval using hybrid AI search powered by local LLMs.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd indoc-app

# Start all services (recommended)
make local-e2e

# Or start services individually
make dev
```

Access the application at http://localhost:5173

## ✨ Features

### 🔍 **Hybrid AI Search**
- **Keyword Search**: Elasticsearch-powered full-text search with fuzzy matching
- **Semantic Search**: Weaviate vector database for meaning-based retrieval
- **Query Enhancement**: HyDE and multi-query generation for improved recall
- **Smart Re-ranking**: Cross-encoder models for relevance optimization

### 📄 **Multi-Format Document Processing**
- **Supported Formats**: PDF, DOCX, XLSX, PPTX, TXT, HTML, XML, JSON, EML, PNG, JPEG, TIFF
- **OCR Capabilities**: Text extraction from images and scanned documents
- **Structured Data**: Form and table extraction with metadata normalization
- **Virus Scanning**: Integrated security scanning before processing

### 🤖 **Local LLM Integration**
- **Ollama Integration**: Support for local LLM models
- **Available Models**: 
  - `gpt-oss:120b` - Complex reasoning and analysis
  - `deepseek-r1:70b` - Advanced coding and technical documents
  - `kimi-k2:72b` - Multilingual support with context understanding
  - `qwen2.5vl:72b` - Vision-language model for OCR and document understanding
- **Chat Interface**: Document-aware conversational AI
- **Model Management**: Dynamic model selection and configuration

### 🔐 **Enterprise Security & Compliance**
- **RBAC**: Role-based access control (Admin, Reviewer, Uploader, Viewer, Compliance)
- **Field Encryption**: PII/PHI data protection using PostgreSQL pgcrypto
- **Audit Logging**: Immutable audit trails for all document operations
- **Compliance Ready**: GDPR, HIPAA, PCI-DSS compliance features
- **Data Residency**: Configurable data retention and deletion policies

### 🎯 **Modern UI/UX**
- **Responsive Design**: Material-UI based interface
- **Accessibility**: WCAG 2.1 AA compliant
- **Real-time Updates**: WebSocket integration for live status updates
- **Advanced Filtering**: Search, sort, and filter documents by multiple criteria
- **Folder Upload**: Recursive directory upload with progress tracking

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── api/v1/         # REST API endpoints
│   ├── core/           # Configuration, security, utilities
│   ├── models/         # SQLAlchemy database models
│   ├── services/       # Business logic and external integrations
│   ├── tasks/          # Celery background tasks
│   └── mcp/            # Model Context Protocol server
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page-level components
│   ├── store/          # Redux Toolkit state management
│   ├── hooks/          # Custom React hooks
│   └── services/       # API client services
```

## 🛠️ Technology Stack

### Core Technologies
- **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic, Celery
- **Frontend**: React 18, TypeScript, Material-UI, Redux Toolkit
- **Database**: PostgreSQL 15+ with pgcrypto extension
- **Search**: Elasticsearch 8.11+ & Weaviate 1.22+
- **Cache**: Redis 7+
- **LLM**: Ollama (local) with multiple model support

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Management**: Celery for background tasks
- **Monitoring**: OpenTelemetry, Prometheus metrics
- **Security**: JWT authentication, bcrypt password hashing

## 📋 Prerequisites

- **Docker Desktop** (latest version)
- **Python 3.11+**
- **Node.js 18+**
- **Conda/Miniconda** (recommended for Python environment)
- **Ollama** (optional, for LLM features)

## 🔧 Installation & Setup

### 1. Environment Setup

```bash
# Create conda environment
conda create -n indoc python=3.11
conda activate indoc

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configuration

```bash
# Copy environment template
cp tools/env.template .env

# Edit .env with your configuration
# Key settings:
# - Database credentials
# - Elasticsearch/Weaviate URLs
# - Ollama configuration
# - Security keys
```

### 3. Database Setup

```bash
# Start PostgreSQL via Docker
docker-compose up -d postgres

# Run database migrations
conda run -n indoc alembic upgrade head

# Initialize search indices (optional)
conda run -n indoc python tools/init_search_indices.py
```

### 4. Start Services

```bash
# Option 1: Use Make (recommended)
make local-e2e

# Option 2: Manual startup
docker-compose up -d  # Infrastructure services
conda run -n indoc python app/main.py  # Backend
cd frontend && npm run dev  # Frontend
```

## 🎮 Usage

### Default Login Credentials
- **Email**: `admin@indoc.local`
- **Password**: `admin123`

### Core Workflows

1. **Document Upload**
   - Navigate to Upload page
   - Drag & drop files or use "Upload Folder" for directories
   - Add metadata (title, description, tags)
   - Monitor processing in the Processing Queue

2. **Document Search**
   - Use the Search page for hybrid AI search
   - Apply filters by file type, date, tags
   - Chat with documents using the AI assistant

3. **Administration**
   - User management and role assignment
   - System health monitoring
   - Audit log review
   - Configuration management

## 🔍 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints
- `POST /api/v1/files/upload` - Document upload
- `POST /api/v1/search/query` - Hybrid search
- `GET /api/v1/files/list` - Document listing with filters
- `POST /api/v1/chat/chat` - AI chat with documents
- `GET /api/v1/llm/models` - Available LLM models

## 🧪 Testing

```bash
# Run all tests
make test

# Run specific test suites
pytest tests/test_api_auth.py
pytest tests/test_models.py

# Run E2E tests
python tools/e2e_test_runner.py
```

## 📊 Monitoring & Health

### Health Checks
```bash
# Check all services
curl http://localhost:8000/api/v1/settings/health/dependencies

# Individual service checks
curl http://localhost:9200/_cluster/health  # Elasticsearch
curl http://localhost:8080/v1/.well-known/ready  # Weaviate
redis-cli ping  # Redis
```

### Logs & Debugging
```bash
# Application logs
tail -f tmp/backend.log

# Celery worker logs
tail -f tmp/celery_worker.log

# Docker service logs
docker-compose logs -f postgres
```

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env`:

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=indoc
POSTGRES_USER=indoc_user
POSTGRES_PASSWORD=your_secure_password

# Search Services
ELASTICSEARCH_URL=http://localhost:9200
WEAVIATE_URL=http://localhost:8080

# LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:120b

# Security
JWT_SECRET_KEY=your_jwt_secret
ENABLE_FIELD_ENCRYPTION=true

# Features
ENABLE_AUDIT_LOGGING=true
ENABLE_TELEMETRY=true
```

### Ollama Setup (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended models
ollama pull gpt-oss:120b      # General purpose
ollama pull deepseek-r1:70b   # Technical documents
ollama pull qwen2.5vl:72b     # OCR and vision
```

## 🚀 Deployment

### Development
```bash
make dev  # Hot-reload development environment
```

### Production
```bash
make build  # Build Docker images
make start  # Start production environment
```

### Docker Compose
```bash
# Full stack deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📁 Project Structure

```
indoc-app/
├── backend/                 # FastAPI backend application
│   ├── app/                # Application code
│   │   ├── api/v1/        # REST API endpoints
│   │   ├── core/          # Configuration and utilities
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   ├── tasks/         # Celery background tasks
│   │   └── mcp/           # Model Context Protocol server
│   ├── alembic/           # Database migrations
│   └── requirements.txt   # Python dependencies
├── frontend/               # React frontend application
│   ├── src/               # Source code
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux state management
│   │   └── services/      # API clients
│   └── package.json       # Node.js dependencies
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── tools/                 # Development tools
├── docker-compose.yml     # Docker orchestration
├── Makefile              # Build automation
└── README.md             # This file
```

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Write tests first (TDD approach)
3. Implement feature with proper error handling
4. Update API documentation if needed
5. Run linters and tests
6. Create PR with comprehensive description

### Code Style
- **Python**: PEP 8 with Black formatter
- **TypeScript**: Airbnb style guide with ESLint
- **Commits**: Conventional commit format

### Testing Requirements
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% coverage for critical paths

## 🐛 Troubleshooting

### Common Issues

**Documents not processing?**
```bash
# Check Celery worker status
ps aux | grep celery
tail -f tmp/celery_worker.log

# Restart processing services
make restart-workers
```

**Search not working?**
```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Check Weaviate
curl http://localhost:8080/v1/.well-known/ready

# Rebuild search indices
python tools/init_search_indices.py
```

**Frontend not loading?**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Restart frontend
cd frontend && npm run dev
```

### Performance Tuning
- Adjust Celery worker concurrency based on CPU cores
- Configure Elasticsearch heap size for large document sets
- Tune Weaviate memory settings for vector operations
- Monitor PostgreSQL query performance

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [troubleshooting guide](docs/GETTING_STARTED.md)
2. Review [project documentation](docs/)
3. Search existing issues
4. Create a new issue with detailed description

## 🔮 Roadmap

- [ ] Multi-tenant SaaS deployment
- [ ] Advanced OCR with computer vision models
- [ ] Federated search across multiple instances
- [ ] Enterprise SSO integration (SAML/OIDC)
- [ ] GraphQL API alongside REST
- [ ] Real-time collaborative features
- [ ] Advanced analytics and reporting

---

**inDoc** - Intelligent Document Management for the Modern Enterprise
