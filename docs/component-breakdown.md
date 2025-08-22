# Component Breakdown — Frontend & Backend Mapping

Purpose: authoritative component list with props, state responsibilities, CRUD mapping to backend endpoints, and RBAC rules.

Notes:
- Every UI component that represents or manipulates a resource must map to REST CRUD endpoints defined in the OpenAPI specs.
- RBAC roles: Admin, Reviewer, Uploader, Viewer. Each endpoint in the OpenAPI specs includes `x-rbac` metadata describing permitted roles.

---

## Pages & Top-level Components

1. UploadPage
- Purpose: allow users to upload documents (single / batch) and view upload status.
- Main Components: `UploadForm`, `UploadProgressList`, `UploadResultModal`.
- Props/state:
  - `UploadForm` props: none; state: selectedFiles[], formFields (metadata)
  - `UploadProgressList` props: uploads[] (id, status, progress)
- CRUD mapping:
  - Create: POST `/api/v1/files` (multipart/form-data). Roles: Uploader, Admin.
  - Read: GET `/api/v1/files/{id}` to view metadata. Roles: Viewer+, depending on RBAC.
  - Update: PUT/PATCH `/api/v1/files/{id}` to update metadata. Roles: Admin, Reviewer.
  - Delete: DELETE `/api/v1/files/{id}` (confirm). Roles: Admin.
- Important UX: virus scan status, preflight validation, confirmation for delete.

2. SearchPage
- Purpose: compose queries, display ranked results, filter, and navigate to DocumentViewer.
- Main Components: `SearchBar`, `FilterPanel`, `ResultsList`, `ResultCard`, `Pagination`.
- Props/state:
  - `SearchBar` state: queryText, selectedFilters
  - `ResultsList` props: results[] (id, score, snippet, source, provenance)
- CRUD mapping:
  - Read: POST `/api/v1/search/query` (search is read-only). Roles: Viewer+.
  - Re-rank: POST `/api/v1/search/rerank` (internal use via MCP). Roles: internal/service.
  - Document metadata update from result: PUT `/api/v1/metadata/{id}`. Roles: Reviewer, Admin.

3. DocumentViewer
- Purpose: render document content, highlights, extracted structured fields, and provenance.
- Main Components: `DocumentToolbar`, `DocumentPane`, `MetadataPanel`, `Annotations`.
- Props/state:
  - `DocumentPane` props: documentId, chunks[], fullText
- CRUD mapping:
  - Read: GET `/api/v1/files/{id}` and GET `/api/v1/search/documents/{document_id}` to retrieve document and chunks. Roles: Viewer+.
  - Update annotations/metadata: PUT `/api/v1/files/{id}` / `/api/v1/metadata/{id}`. Roles: Reviewer, Admin.
  - Delete document: DELETE `/api/v1/files/{id}`. Roles: Admin.

4. AuditTrailPage
- Purpose: view immutable audit logs, filter by user, action, date range.
- Main Components: `AuditFilterBar`, `AuditTable`, `AuditDetailsModal`.
- CRUD mapping:
  - Read: GET `/api/v1/audit/logs` with filters. Roles: Admin, Compliance.
  - Export: POST `/api/v1/audit/export` (generate CSV). Roles: Admin.

5. RoleManagementPage
- Purpose: manage users, roles, and permissions.
- Main Components: `UserList`, `UserEditForm`, `RoleMatrix`.
- CRUD mapping:
  - Create user: POST `/api/v1/users` (Admin only)
  - Read users: GET `/api/v1/users`
  - Update user/roles: PUT/PATCH `/api/v1/users/{id}`
  - Delete user: DELETE `/api/v1/users/{id}`
- RBAC: Admin only for create/delete. Reviewer may modify certain metadata but not RBAC.

6. SettingsPage
- Purpose: configure system settings (ingestion rules, retention policy, KMS settings).
- Main Components: `RetentionForm`, `KmsConfig`, `IngestionSettings`.
- CRUD mapping:
  - Read config: GET `/api/v1/settings/{key}`
  - Update config: PUT `/api/v1/settings/{key}` (Admin only)

---

## Reusable Components (examples)

- `FileUploader` (used in UploadForm)
  - Props: `onUploadComplete(result)`, `acceptedTypes[]`, `maxSize`.
  - State: selectedFiles[], errors[]
  - UI actions → APIs: POST `/api/v1/files` (Create)

- `SearchBar`
  - Props: `onSearch(query, filters)`
  - State: queryText, selectedFilters
  - UI actions → APIs: POST `/api/v1/search/query`

- `ResultCard`
  - Props: `result` (id, score, snippet, provenance)
  - Actions: Open → navigate to `/document/{id}`; Flag/annotate → PUT `/api/v1/metadata/{id}`

- `DocumentPane`
  - Props: `documentId`
  - State: fullText, chunks[], highlights[]
  - Actions: annotate → POST `/api/v1/annotations` (Create), update annotation → PUT `/api/v1/annotations/{id}`

- `RoleSelect`
  - Props: `selectedRoles[]`, `availableRoles[]`
  - Actions: update user roles → PATCH `/api/v1/users/{id}`

---

## Backend Module Mapping (FastAPI modular monolith)

Modules (Python packages):
- `app.ingest` — handles UI/API/Email ingestion, temp repo writes, validation, virus scan, and pushes documents for indexing.
- `app.indexer` — indexing pipelines using LlamaIndex/Haystack; writes to Weaviate and Elasticsearch; maintains search metadata in Postgres.
- `app.search_gateway` — unified query endpoint for MCP and UI; merges Weaviate and ES, dedupes, and returns ranked candidates.
- `app.mcp` — MCP Server implementation exposing `/api/v1/mcp/*` tool APIs and managing tool registration.
- `app.files` — FileSystem Provider endpoints for CRUD on files; object storage integration.
- `app.metadata` — Database Provider endpoints for metadata CRUD, annotations, and schema validation.
- `app.audit` — audit logging, export, retention rules.
- `app.users` — user and RBAC management.
- `app.health` — health checks for all services.

Each module must provide OpenAPI endpoints (see `api/openapi/*.yaml`) and corresponding unit and integration tests.

---

## Acceptance criteria (component breakdown)
- Every listed component includes: props, state, main UX flows, and explicit CRUD endpoint mappings.
- All endpoints referenced map to an OpenAPI path with request/response schema and RBAC rules.
- Component documentation must include accessibility notes and test cases (unit + integration).


## Runbook (local validation)
- `docker-compose up` — start Postgres, Weaviate, Elasticsearch, Ollama, Redis (if used), and the FastAPI app.
- Run frontend dev server: `cd ui && npm run dev` (Vite).
- Execute a sample end‑to‑end test (upload -> index -> search -> view) and capture logs.

---

End of component breakdown.
