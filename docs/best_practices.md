# 📘 Project Best Practices

## 1. Project Purpose

inDoc is an enterprise-grade document management and search platform that provides intelligent document processing with hybrid AI search capabilities. The system ingests, processes, and securely stores various document formats while offering fast, accurate, and compliant retrieval using a combination of keyword (Elasticsearch) and semantic (Weaviate) search powered by local LLMs (Ollama). It's designed for organizations requiring GDPR, HIPAA, and PCI-DSS compliance with comprehensive audit trails and role-based access control.

## 2. Project Structure

### Backend Structure (FastAPI)
```
backend/
├── app/
│   ├── api/v1/         # Versioned API endpoints
│   │   └── endpoints/   # REST endpoints (auth, files, search, users)
│   ├── core/           # Core configuration, security, and utilities
│   ├── crud/           # Database CRUD operations
│   ├── db/             # Database session and connection management
│   ├── mcp/            # Model Context Protocol server implementation
│   ├── models/         # SQLAlchemy database models
│   ├── schemas/        # Pydantic schemas for validation
│   └── main.py         # Application entry point with lifespan management
├── alembic/            # Database migrations
└── requirements.txt    # Python dependencies
```

### Frontend Structure (React + TypeScript)
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page-level components (Upload, Search, etc.)
│   ├── store/          # Redux store with RTK and slices
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Layout components (MainLayout, AuthLayout)
│   └── App.tsx         # Main application router
├── vite.config.ts      # Vite configuration
└── package.json        # Node dependencies
```

### Key Directories
- `docs/`: Architecture documentation and design specs
- `api/`: API specifications and OpenAPI schemas
- `.github/`: CI/CD workflows and GitHub configuration
- Docker files: `docker-compose.yml`, `docker-bake.hcl` for containerization

## 3. Test Strategy

### Framework Stack
- **Backend**: pytest for Python testing (unit and integration)
- **Frontend**: Vitest/Jest for React component and integration testing
- **E2E**: Playwright or Cypress for end-to-end testing (planned)

### Test Organization
- Backend tests: `backend/tests/` mirroring the `app/` structure
- Frontend tests: Co-located with components as `*.test.tsx` files
- Integration tests: `tests/integration/` for cross-service testing

### Testing Guidelines
- **Unit Tests**: Required for all business logic, services, and utilities
- **Integration Tests**: Required for API endpoints and database operations
- **Contract Tests**: Required for MCP tool APIs and external service integrations
- **Performance Tests**: Use Locust for load testing critical endpoints
- **Mocking**: Use `unittest.mock` for Python, `jest.mock` for JavaScript
- **Coverage Target**: Minimum 80% for critical paths, 60% overall

## 4. Code Style

### Python (Backend)
- **Style Guide**: PEP 8 with Black formatter (line length: 100)
- **Type Hints**: Required for all function signatures using Python 3.11+ typing
- **Async/Await**: Use async functions for all database operations and external calls
- **Naming Conventions**:
  - Functions/variables: `snake_case`
  - Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Private methods: prefix with `_`
- **Docstrings**: Google style for all public functions and classes
- **Error Handling**: Use custom exceptions, always log errors with context
- **Imports**: Absolute imports preferred, grouped (stdlib, third-party, local)

### TypeScript/React (Frontend)
- **Style Guide**: Airbnb JavaScript/React style guide
- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Component Structure**:
  - Functional components with hooks (no class components)
  - Props interfaces defined above component
  - Export types separately from components
- **Naming Conventions**:
  - Components: `PascalCase` (e.g., `SearchBar.tsx`)
  - Hooks: `camelCase` with `use` prefix (e.g., `useAuth`)
  - Utils/helpers: `camelCase`
  - Types/Interfaces: `PascalCase` with `I` prefix for interfaces
- **State Management**: Redux Toolkit with RTK Query for API calls
- **Styling**: Material-UI theme system, avoid inline styles

### API Design
- **REST Conventions**: Standard HTTP verbs (GET, POST, PUT/PATCH, DELETE)
- **Versioning**: All APIs versioned under `/api/v1/`
- **Response Format**: Consistent JSON structure with `data`, `error`, `metadata`
- **Status Codes**: Use appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- **Pagination**: Use `limit/offset` or cursor-based pagination
- **Filtering**: Query parameters for filters, body for complex queries

## 5. Common Patterns

### Authentication & Authorization
- **JWT Tokens**: Access tokens with 24-hour expiration
- **RBAC Hierarchy**: Admin > Reviewer > Uploader > Viewer > Compliance
- **Dependency Injection**: Use FastAPI's `Depends()` for auth checks
- **Frontend Auth**: Redux slice for auth state, axios interceptors for token refresh

### Database Patterns
- **Async SQLAlchemy**: All database operations use async sessions
- **Base Model**: Inherit from `BaseModel` for common fields (id, created_at, updated_at)
- **Soft Deletes**: Use `deleted_at` field instead of hard deletes for audit trail
- **Field Encryption**: Use `pgcrypto` for PII/sensitive fields

### Error Handling
- **Custom Exceptions**: Define domain-specific exceptions in `core/exceptions.py`
- **Global Handler**: FastAPI exception handlers for consistent error responses
- **Logging**: Structured logging with correlation IDs for request tracing
- **Frontend Errors**: Toast notifications for user errors, console for dev errors

### Service Architecture
- **Modular Monolith**: Organized by feature modules (ingest, search, audit, etc.)
- **Dependency Injection**: Use FastAPI's DI system for services
- **Background Tasks**: Use Celery or FastAPI BackgroundTasks for async processing
- **Caching**: Redis for session management and query result caching

### Search & RAG Patterns
- **Hybrid Search**: Query both Elasticsearch and Weaviate, merge results
- **Query Transformation**: HyDE and multi-query generation for better recall
- **Re-ranking**: Cross-encoder for result relevance scoring
- **Context Assembly**: Chunk deduplication and provenance tracking

## 6. Do's and Don'ts

### ✅ Do's
- Always use environment variables for configuration (never hardcode)
- Include correlation IDs in all log messages
- Write comprehensive docstrings for public APIs
- Use Pydantic for request/response validation
- Implement proper retry logic with exponential backoff
- Add health checks for all external dependencies
- Use database transactions for multi-step operations
- Include RBAC checks at both API and UI levels
- Version all APIs and maintain backwards compatibility
- Use structured logging (JSON format) for production
- Implement circuit breakers for external services
- Add OpenTelemetry instrumentation for observability

### ❌ Don'ts
- Never commit secrets or credentials to source control
- Don't use synchronous database operations in async endpoints
- Avoid using `print()` statements - use proper logging
- Don't bypass Pydantic validation with `dict()` conversions
- Never store passwords in plain text - always hash with bcrypt
- Don't create database connections outside of the session manager
- Avoid tight coupling between modules - use dependency injection
- Don't ignore error cases - handle all exceptions explicitly
- Never expose internal error details to end users
- Don't use mutable default arguments in functions
- Avoid circular imports - use TYPE_CHECKING for type hints
- Don't skip RBAC checks for "internal" endpoints

## 7. Tools & Dependencies

### Core Backend Dependencies
- **FastAPI**: Modern async web framework with automatic OpenAPI docs
- **SQLAlchemy 2.0**: Async ORM for PostgreSQL interactions
- **Pydantic**: Data validation and settings management
- **Alembic**: Database migration management
- **python-jose**: JWT token creation and validation
- **python-multipart**: File upload handling
- **httpx**: Async HTTP client for external services
- **redis**: Caching and session management

### Core Frontend Dependencies
- **React 18**: UI framework with hooks and concurrent features
- **Redux Toolkit**: State management with RTK Query for API calls
- **Material-UI (MUI)**: Component library with theming support
- **React Router v6**: Client-side routing
- **React Hook Form**: Form validation and management
- **Axios**: HTTP client with interceptors
- **Recharts**: Data visualization for dashboards

### Infrastructure & Services
- **PostgreSQL 15**: Primary database with pgcrypto extension
- **Elasticsearch 8.11**: Keyword search engine
- **Weaviate 1.22**: Vector database for semantic search
- **Redis 7**: Cache and session store
- **Ollama**: Local LLM runtime (run separately on host)
- **Docker & Docker Compose**: Container orchestration

### Development Tools
- **Make**: Build automation and task runner
- **Black**: Python code formatter
- **ESLint**: JavaScript/TypeScript linter
- **Prettier**: Code formatter for frontend
- **pytest**: Python testing framework
- **Vite**: Fast frontend build tool

### Project Setup
```bash
# Initial setup
cp .env.example .env
make install  # Install all dependencies

# Development
make dev      # Start dev environment with hot reload

# Production
make build    # Build Docker images
make start    # Start production environment

# Testing
make test     # Run all tests
```

## 8. Other Notes

### LLM Integration
- Ollama runs on the host machine (not containerized) for better GPU access
- Models commonly used: gpt-oss:120b, deepseek-r1:70b, kimi-k2:72b, qwen2.5vl:72b, gemma:27b
- Use `qwen2.5vl:72b` for OCR and document understanding tasks
- Implement token counting and rate limiting for LLM calls
- Cache LLM responses when appropriate (with TTL)

### Security Considerations
- All endpoints require authentication except `/health` and `/login`
- Implement rate limiting on authentication endpoints
- Use Content Security Policy (CSP) headers
- Enable CORS only for trusted origins
- Audit all data access and modifications
- Implement field-level encryption for PII/PHI data
- Regular security scanning with Bandit and npm audit

### Performance Optimization
- Use database indexes on frequently queried fields
- Implement pagination for all list endpoints
- Use Redis caching for expensive computations
- Lazy load frontend components with React.lazy()
- Optimize Docker images with multi-stage builds
- Monitor query performance with EXPLAIN ANALYZE

### Deployment & Operations
- Use `docker-bake.hcl` for production builds (multi-arch support)
- Implement graceful shutdown handlers
- Add readiness and liveness probes for Kubernetes
- Use structured logging with correlation IDs
- Monitor with Datadog or Grafana Cloud
- Implement log retention policies per compliance requirements

### Compliance & Audit
- All user actions logged to audit_logs table
- Implement DSAR (Data Subject Access Request) endpoints
- Support data retention and deletion policies
- Maintain immutable audit logs (append-only)
- Regular compliance scanning with OPA policies
- Document all data flows and storage locations

### Development Workflow
1. Create feature branch from `main`
2. Write tests first (TDD approach encouraged)
3. Implement feature with proper error handling
4. Update OpenAPI specs if adding/modifying endpoints
5. Run linters and formatters before commit
6. Ensure all tests pass locally
7. Create PR with comprehensive description
8. Address code review feedback
9. Merge after approval and CI passes

### Debugging Tips
- Use `import pdb; pdb.set_trace()` for Python debugging
- Enable React DevTools and Redux DevTools in development
- Check Docker logs with `docker-compose logs -f [service]`
- Use `curl` or Postman to test API endpoints directly
- Monitor PostgreSQL queries with `pg_stat_statements`
- Use browser Network tab to debug API calls

### Common Pitfalls to Avoid
- Forgetting to add new environment variables to `.env.example`
- Not updating Alembic migrations after model changes
- Circular dependencies between Python modules
- Memory leaks from unclosed database sessions
- CORS issues from misconfigured origins
- Race conditions in concurrent operations
- Forgetting to invalidate cache after updates
- Not handling network timeouts properly

### Future Considerations
- Implement GraphQL API alongside REST
- Add WebSocket support for real-time updates
- Integrate with enterprise SSO (SAML/OIDC)
- Support for multi-tenancy
- Implement data pipeline for batch processing
- Add support for more document formats
- Enhance OCR capabilities with computer vision models
- Implement federated search across multiple instances