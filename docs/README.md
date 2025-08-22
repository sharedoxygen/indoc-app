# inDoc - Intelligent Document Management System

An enterprise-grade document management and search platform with hybrid AI search capabilities powered by local LLMs.

## Features

- 📄 **Multi-format Document Support**: PDF, DOCX, XLSX, PPTX, TXT, HTML, XML, JSON, EML, Images (with OCR)
- 🔍 **Hybrid AI Search**: Combined keyword (Elasticsearch) and semantic (Weaviate) search with re-ranking
- 🤖 **LLM Integration**: Local Ollama integration for intelligent document processing
- 🔒 **Enterprise Security**: RBAC, field-level encryption, comprehensive audit logging
- 📊 **Compliance Ready**: GDPR, HIPAA, PCI-DSS compliant with full audit trails
- 🚀 **Modern Architecture**: FastAPI backend, React frontend, Docker containerization

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for development)
- Ollama (for LLM features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/indoc.git
cd indoc
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Install Ollama (for LLM features):
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama run llama2  # or your preferred model
```

4. Start the application:

**For Development:**
```bash
make dev
```

**For Production:**
```bash
make start
```

5. Access the application:
- Frontend: http://localhost:5173 (dev) or http://localhost (prod)
- API Documentation: http://localhost:8000/api/v1/docs

## Default Credentials

For initial setup, use:
- Username: admin@indoc.local
- Password: admin123

**Important:** Change these credentials immediately after first login.

## Architecture

```
inDoc/
├── backend/           # FastAPI backend application
│   ├── app/
│   │   ├── api/      # REST API endpoints
│   │   ├── core/     # Core configuration and security
│   │   ├── mcp/      # Model Context Protocol server
│   │   ├── models/   # Database models
│   │   ├── services/ # Business logic services
│   │   └── main.py   # Application entry point
│   └── requirements.txt
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Application pages
│   │   ├── store/       # Redux store and slices
│   │   └── App.tsx      # Main application component
│   └── package.json
├── docs/              # Documentation
├── docker-compose.yml # Docker services configuration
└── docker-bake.hcl    # Docker build configuration
```

## Services

The application consists of the following services:

- **PostgreSQL**: Primary database for metadata and user management
- **Elasticsearch**: Keyword search engine
- **Weaviate**: Vector database for semantic search
- **Redis**: Caching and session management
- **Ollama**: Local LLM for AI features (run separately)

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
make test
```

## API Documentation

Once the application is running, you can access:
- Interactive API docs: http://localhost:8000/api/v1/docs
- ReDoc documentation: http://localhost:8000/api/v1/redoc

## Configuration

Key configuration options in `.env`:

- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET_KEY`: JWT token signing key
- `FIELD_ENCRYPTION_KEY`: Key for field-level encryption
- `OLLAMA_MODEL`: LLM model to use (default: llama2)
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes

## Security

- All passwords are hashed using bcrypt
- JWT tokens for authentication
- Field-level encryption for sensitive data
- Comprehensive audit logging
- RBAC with roles: Admin, Reviewer, Uploader, Viewer, Compliance

## Troubleshooting

### Cannot connect to server
1. Ensure all Docker containers are running: `docker-compose ps`
2. Check logs: `docker-compose logs -f`
3. Verify Ollama is running: `ollama list`

### Database connection issues
1. Check PostgreSQL is running: `docker-compose logs postgres`
2. Verify credentials in `.env` file
3. Try restarting: `docker-compose restart postgres`

### Search not working
1. Check Elasticsearch: `curl http://localhost:9200/_cluster/health`
2. Check Weaviate: `curl http://localhost:8080/v1/.well-known/ready`
3. Reindex documents if needed

## Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/indoc/issues
- Documentation: https://docs.indoc.io
- Email: support@indoc.io