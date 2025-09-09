# inDoc

## Goal / Purpose
The application is an intelligent, enterprise‑grade document management and search platform. It must ingest, process, and securely store a 
wide variety of enterprise documents, then provide fast, accurate, and compliant retrieval using hybrid AI search (keyword + vector) powered by local LLMs (Ollama). The system should enable users to upload documents via UI, email, or API, manage access through RBAC, and maintain full auditability for GDPR/HIPAA/PCI‑DSS compliance.

## Platform / Tech Stack
- **Frontend**: React.js + Vite, component library (MUI or Ant Design), Redux Toolkit with RTK Query, WCAG 2.1 AA compliant, responsive web UI.
- **Backend**: FastAPI (Python) built around a **Model Context Protocol (MCP) server** that orchestrates tool calls.
- **LLM**: Local Ollama instance (standard port) with available models:
  - **gpt-oss:120b** - Large-scale open-source GPT model for complex reasoning
  - **deepseek-r1:70b** - Advanced reasoning and code generation model
  - **kimi-k2:72b** - Multilingual model with strong context understanding
  - **qwen2.5vl:72b** - Vision-language model for document understanding with OCR capabilities
- **Search**: Hybrid search using **Elasticsearch** (keyword) + **Weaviate** (vector) with query transformation (HyDE, multi‑query) and a lightweight cross‑encoder re‑ranker.
- **Database**: PostgreSQL (Docker) with `pgcrypto` field‑level encryption; stores metadata, audit logs, user sessions.
- **Orchestration Tools**: LlamaIndex / Haystack for robust RAG pipelines, LangChain for document loaders and agent‑style workflows.
- **Container / Deployment**: Docker‑compose for local dev, Kubernetes (Ingress/API‑Gateway) for cloud/on‑premises, IaC via Terraform or Pulumi.
- **Observability**: Managed platform (Datadog or Grafana Cloud) for metrics, logs, traces.
- **CI/CD**: GitHub Actions / GitLab CI with unit, integration, security, compliance linting, and performance regression tests.

## Core Features (Must‑Have)
1. **Multi‑Format Document Ingestion** – PDF, DOCX, XLSX, PPTX, HTML, TXT, XML, JSON, EML (email), OCR‑processed images (PNG, JPEG). Supports UI upload, email pull, and REST API.
2. **Hybrid AI Search** – Combined keyword (Elasticsearch) and semantic vector (Weaviate) retrieval, with query transformation and re‑ranking for relevance.
  - LangChain for document loaders, parsing, and rapid orchestration where needed.
  - MCP Server (FastAPI) as the central orchestrator exposing registered tool providers to the LLM.
- Frontend: React + Vite, component library (Material‑UI or Ant Design), Redux Toolkit + RTK Query for state and data fetching.
- Observability: Managed platform (Datadog or Grafana Cloud) or self‑hosted Prometheus/Grafana/Loki/Jaeger if cost constrained.
- CI/CD: GitHub Actions or GitLab CI.
- Secrets: Docker/Kubernetes secrets for local; HashiCorp Vault (recommended) for production.

## Core Features (must-have functions):
- Ingestion
  - Sources: Direct UI upload, email ingestion (IMAP/SMTP pipeline), and REST API.
  - Formats: PDF, DOCX, XLSX, PPTX, HTML, TXT, XML, JSON, EML (email), PNG/JPEG/TIFF (image OCR). This set exceeds 10 formats to meet 95% coverage.
  - Temporary repository: All ingested files are stored in a transient, access‑controlled temp repo for pre‑processing and virus scanning before persistent storage.
- Document Processing
  - Content‑aware chunking (section/paragraph/table aware) and OCR for images.
  - Extract structured data from forms and tables when present.
  - Metadata extraction and normalization.
- Indexing & Search (RAG)
  - Hybrid retrieval: query both Elasticsearch (keywords) and Weaviate (embeddings) for a combined candidate set.
  - Query transformation: HyDE (hypothetical embeddings) and Multi‑Query generation to improve recall.
  - Re‑ranking: lightweight cross‑encoder or signaling model to reorder results for highest relevance.
  - Result aggregation: merge, dedupe, and attach provenance to each chunk sent as context to the LLM.
- Orchestration (MCP)
  - MCP Server exposes versioned tool APIs (Search Provider, Database Provider, File System Provider) so the LLM can pull context dynamically.
  - Tool API versioning: endpoints under `/api/v1/<tool>` and future `/api/v2/...` for backward compatibility.
- LLM Interaction
  - Local Ollama models, remote or managed LLMs pluggable for devveopment and production.
  - Token/usage and response‑time metrics persisted to PostgreSQL for audit and optimization.
- Security & Compliance
  - RBAC: role hierarchy (Admin, Reviewer, Uploader, Viewer) and least‑privilege enforcement in both UI and APIs.
  - Field‑level encryption: PII/PHI/PCI fields encrypted using PostgreSQL (pgcrypto) or envelope encryption with keys in Vault.
  - Transport: TLS for all endpoints; TLS enforced for API Gateway and internal service communication where applicable.
  - Audit logging: immutable append‑only logs for document actions and LLM calls stored in PostgreSQL (or WORM storage if required by compliance).
  - Data residency & DSAR support: endpoints and processes to handle data‑subject requests and deletion.
- UI/UX
  - Responsive modern web UI, accessible (WCAG 2.1 AA), themeable via MUI theme provider.
  - Document list, search results, document viewer with highlights, audit trail viewer, role/permission admin UI.

## Constraints (limitations):
- Performance: initial targets — hybrid retrieval ≤ 200ms, re‑rank ≤ 100ms, LLM generation (local Ollama) ≤ 2s (model dependent).
- Operational overhead: maintaining two search systems (Elasticsearch + Weaviate) increases ops complexity and cost vs single‑stack approaches.
- Compliance: PCI/HIPAA/GDPR require strict KMS, logging retention policies, and legal agreements (BAA) — time and budget must be allocated for compliance audits and legal reviews.
- Budget/Time: Managed observability (Datadog/Grafana Cloud) and Vault incur recurring costs; self‑host alternatives reduce costs but increase ops effort.
- Storage & retention: compliance may require long retention windows; ensure storage and backup sizing are planned.

## Output Format (deliverables):
The following outputs will be produced and delivered as full implementations and artifacts (no stubs or mock services):
- Wireframes: responsive web UI mockups for core screens (search, upload, viewer, admin). Deliverables include annotated assets and accessibility annotations.
- Component breakdown: complete list of frontend components, props, state responsibilities, styles/theming, and implementation notes; backend endpoints and service contracts (OpenAPI v3 specifications).
  - MUST: For every page and component, provide a full CRUD contract and implementation plan where applicable. Each UI component that represents a resource must map to Create/Read/Update/Delete backend endpoints, with RBAC rules specified per operation.
- Pseudocode / Interaction flows: detailed, production‑ready pseudocode for ingestion pipeline, MCP tool call flows, and RAG orchestration suitable for direct implementation.
- Fully working code: minimal runnable prototype examples that are complete implementations of core functionality:
  - FastAPI MCP implementation with Search Provider integrated to Weaviate and Elasticsearch and a local Ollama adapter.
  - React/Vite application implementing all core pages and components (upload, search, viewer, admin) wired to the MCP API. All pages and components must include full CRUD UI and corresponding backend endpoints.

## Recommended deliverables (prioritized)

The following deliverables are required and prioritized for engineering handoff and implementation. They are presented as firm specification items (no selection required).

1. Component breakdown + OpenAPI specifications for Search, Database, and FileTool (Priority: High)
   - Deliverables: Frontend component list, backend module list, OpenAPI v3 specifications for Search Provider, Database Provider, and File System Provider.
   - Acceptance: OpenAPI lints cleanly, services start, and component responsibilities are documented. All components must have implementation plans and defined props/state. **Each resource must have complete REST CRUD endpoints defined in OpenAPI and mapped to UI actions; RBAC rules per endpoint must be documented.**
   - Estimated effort: 2–3 developer days.

2. Pseudocode and interaction flows for MCP↔Search↔LLM and re‑ranking logic (Priority: High)
   - Deliverables: Detailed sequence diagrams and pseudocode covering tool calls, query transformation (HyDE / multi‑query), hybrid retrieval, re‑ranking, and context assembly for the LLM.
   - Acceptance: Architecture review signoff by the senior architect; edge cases and failure modes documented.
   - Estimated effort: 1–2 developer days.

3. Wireframes for core UI screens (Priority: Medium)
   - Deliverables: Responsive mockups for Upload, Search Results, Document Viewer, Audit Trail, and Role Management screens.
   - Acceptance: UX review and accessibility checklist (WCAG 2.1 AA) satisfied.
   - Estimated effort: 2–4 designer days.

4. Minimal prototype (FastAPI MCP implementation + React UI) for local validation (Priority: Medium)
   - Deliverables: Runnable prototype that demonstrates ingestion (UI upload), Search Gateway calls to Weaviate and Elasticsearch instances, MCP tool calls to local Ollama, and PostgreSQL persistence via Docker‑compose.
   - Acceptance: Prototype runs locally, performs end‑to‑end flow for a sample document, and includes unit and integration tests for core flows. All pages and components listed in the component breakdown must be implemented.
   - Estimated effort: 2–3 sprints (engineering + validation).

These deliverables are to be produced in the order above. Each deliverable must include acceptance criteria, tests (unit/integration/contract), and a brief runbook for local execution.

## Notes & Implementation Details (authoritative)
- Local development: Provide a `docker‑compose.yml` that includes PostgreSQL on port 5432, a temporary repository volume, and instructions to run a local Ollama instance on the standard Ollama port. Include health checks for all services in compose.
- Secrets: Provide a `.env.example` and document secret injection for local dev. Production deployments must use a secret manager (HashiCorp Vault recommended). Under no circumstances should secrets be committed to source control.
- CI/CD: Implement GitHub Actions (or GitLab CI) pipelines that run security linting (`bandit`), IaC scanning (`tfsec`), contract tests, and performance regression tests (Locust). CI must include compliance policy checks (OPA or equivalent) for sensitive changes.
- Observability: Instrument all services with OpenTelemetry. Configure a managed observability backend (Grafana Cloud or Datadog) or a self‑hosted Prometheus/Grafana/Loki/Jaeger stack if approved. Dashboards and alerts for latency, error rate, queue depth, and LLM resource usage are mandatory.
- Testing: All code must include unit tests and integration tests. Contract tests are required for tool APIs. Performance regression tests must be added to CI and run on a scheduled cadence with baselines tracked.
- Security & Compliance: Enforce field‑level encryption strategy (pgcrypto or envelope encryption) with keys managed in Vault. Audit logs must be append‑only and retained per compliance policy. Provide DSAR endpoints and a documented data deletion workflow.
- Versioning: All tool APIs must be versioned (`/api/v1/...`). Include a change log for API updates and a deprecation schedule for breaking changes.
- CRUD conventions: All backend REST APIs must implement standard CRUD semantics (HTTP verbs: POST, GET, PUT/PATCH, DELETE) for resources exposed to the UI. OpenAPI specs must include request/response schemas, validation rules, error codes, and RBAC requirements. UI must implement forms and flows for create, read, update, and delete operations with client‑side and server‑side validation and confirm/undo UX where applicable.

## Build & Release Strategy (authoritative)
- **Local Development**: Developers will use `docker-compose.yml` for a fast, iterative workflow with hot-reloading and mounted volumes. This approach avoids the need for image rebuilding during development.
- **CI/CD Builds**: All container images for CI/CD and production releases will be built using Docker Buildx Bake via the `docker-bake.hcl` file. This ensures reproducible, cacheable, and potentially multi-architecture builds.
- **Build Configuration**: The `docker-bake.hcl` file defines build targets for each service (`api`, `ui`, etc.) and manages build arguments, platforms, and cache settings.
- **Image Tagging**:
  - On pushes to `main`, images are tagged with the short commit SHA (e.g., `ghcr.io/your-org/indoc-api:a1b2c3d`).
  - On pull requests, images are built but not pushed, and tagged with `pr-<number>` for identification in build logs.
  - Releases should be tagged with semantic versioning (e.g., `v1.2.3`).
- **Cache Strategy**: The CI pipeline will leverage a registry-based cache (`type=registry`) to significantly speed up builds by reusing layers from previous runs.