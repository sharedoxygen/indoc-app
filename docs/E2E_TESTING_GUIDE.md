# Complete E2E Testing Guide for inDoc

This guide provides comprehensive end-to-end testing workflows for all user roles in the inDoc application.

## 🎯 User Roles & Permissions

### **Admin** (`require_admin`)
**Permissions**: Full system access
- ✅ User management (create, update, delete, list)
- ✅ System settings and configuration
- ✅ All document operations
- ✅ Audit log access and export
- ✅ System health monitoring

### **Reviewer** (`require_reviewer`) 
**Permissions**: Review and approve content
- ✅ View all documents
- ✅ Download documents
- ✅ Comment and annotate
- ✅ Approve/reject documents
- ✅ Limited user viewing

### **Uploader** (`require_uploader`)
**Permissions**: Upload and manage documents
- ✅ Upload documents
- ✅ Edit own documents
- ✅ View documents (own + public)
- ✅ Basic search functionality

### **Viewer** (`require_viewer`)
**Permissions**: Read-only access
- ✅ View public/internal documents
- ✅ Search documents
- ✅ Chat with documents
- ❌ Cannot upload or modify

### **Compliance** (`require_compliance`)
**Permissions**: Audit and compliance monitoring
- ✅ Access audit logs
- ✅ Export compliance reports
- ✅ View all documents for compliance review
- ✅ Generate compliance reports

---

## 🧪 E2E Test Scenarios by Role

### **1. Admin E2E Workflow**

#### **User Management Tests**
```bash
# Login as admin
POST /auth/login
{
  "username": "admin_primary", 
  "password": "admin123"
}

# List all users
GET /users
# Expected: See all users across all roles

# Create new user
POST /users
{
  "email": "newuser@test.indoc.local",
  "username": "newuser",
  "full_name": "New Test User", 
  "password": "newpass123",
  "role": "Viewer"
}

# Update user role
PUT /users/{user_id}
{
  "role": "Uploader"
}

# Deactivate user
PUT /users/{user_id}
{
  "is_active": false
}

# View user statistics
GET /users/statistics
```

#### **System Administration Tests**
```bash
# Check system health
GET /settings/health/dependencies

# View admin settings
GET /settings/admin

# Update system configuration
PUT /settings/admin
{
  "max_upload_size": 200000000,
  "enable_audit_logging": true
}

# Export audit logs
POST /audit/logs/export
{
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "format": "csv"
}
```

#### **Document Management Tests**
```bash
# Upload document
POST /files
# multipart/form-data with file

# View all documents
GET /files

# Update document metadata
PUT /files/{document_id}
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["updated", "admin"]
}

# Delete document
DELETE /files/{document_id}
```

### **2. Reviewer E2E Workflow**

#### **Document Review Process**
```bash
# Login as reviewer
POST /auth/login
{
  "username": "legal_reviewer",
  "password": "review123"
}

# View pending documents for review
GET /files?status=pending

# Download document for review
GET /files/{document_id}/download

# Add review annotation
POST /files/{document_id}/annotations
{
  "content": "Legal review: Approved with minor corrections needed",
  "annotation_type": "review",
  "status": "approved_with_changes"
}

# Search for documents by criteria
POST /search/query
{
  "query": "contract legal agreement",
  "filters": {
    "file_type": "pdf",
    "access_level": "confidential"
  }
}

# View document details
GET /files/{document_id}
```

#### **Collaboration Tests**
```bash
# Start conversation about document
POST /chat
{
  "message": "Can you explain the legal implications of section 3?",
  "document_context": "{document_id}"
}

# Continue conversation
POST /chat/{conversation_id}
{
  "message": "What are the compliance requirements for this document type?"
}
```

### **3. Uploader E2E Workflow**

#### **Document Upload Process**
```bash
# Login as uploader
POST /auth/login
{
  "username": "hr_uploader",
  "password": "upload123"
}

# Upload various document types
POST /files
# Test files: PDF, DOCX, XLSX, PPTX, TXT, HTML, JSON

# Check upload status
GET /files/{document_id}

# Update own document
PUT /files/{document_id}
{
  "title": "Updated by uploader",
  "description": "Modified description",
  "tags": ["hr", "updated"]
}

# Bulk upload (ZIP file)
POST /files/bulk
# multipart/form-data with ZIP file

# Monitor bulk upload progress
GET /files/bulk/{upload_id}/status
```

#### **Document Management Tests**
```bash
# View own documents
GET /files?uploaded_by=me

# Search accessible documents
POST /search/query
{
  "query": "employee handbook",
  "filters": {
    "uploaded_by": "current_user"
  }
}

# Try to access restricted document (should fail)
GET /files/{restricted_document_id}
# Expected: 403 Forbidden
```

### **4. Viewer E2E Workflow**

#### **Document Access Tests**
```bash
# Login as viewer
POST /auth/login
{
  "username": "external_viewer",
  "password": "view123"
}

# View accessible documents only
GET /files
# Expected: Only public/internal documents

# Search documents
POST /search/query
{
  "query": "user manual",
  "filters": {
    "access_level": ["public", "internal"]
  }
}

# View document details
GET /files/{document_id}

# Try to upload (should fail)
POST /files
# Expected: 403 Forbidden

# Try to modify document (should fail)
PUT /files/{document_id}
# Expected: 403 Forbidden
```

#### **Chat and Search Tests**
```bash
# Chat with document
POST /chat
{
  "message": "What is the main purpose of this document?",
  "document_context": "{document_id}"
}

# Advanced search
POST /search/query
{
  "query": "budget financial analysis",
  "limit": 10,
  "semantic_search": true
}

# Find similar documents
GET /search/documents/{document_id}/similar?limit=5
```

### **5. Compliance E2E Workflow**

#### **Audit and Compliance Tests**
```bash
# Login as compliance officer
POST /auth/login
{
  "username": "compliance_officer",
  "password": "comply123"
}

# View audit logs
GET /audit/logs
{
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "action": "upload",
  "user_role": "Uploader"
}

# Export audit logs for compliance
POST /audit/logs/export
{
  "format": "csv",
  "include_metadata": true,
  "date_range": "last_quarter"
}

# Generate compliance report
POST /audit/compliance/report
{
  "report_type": "document_access",
  "period": "monthly",
  "include_details": true
}

# Review document access patterns
GET /audit/logs?resource_type=document&action=view

# Check user activity patterns
GET /audit/logs?user_id={user_id}&group_by=action
```

---

## 🚀 Running E2E Tests

### **1. Generate Seed Data**
```bash
# Activate conda environment
conda activate indoc

# Generate seed data (preserves existing)
cd backend && python seed_data_generator.py

# Generate seed data (clean slate)
cd backend && python seed_data_generator.py --clean
```

### **2. Test User Credentials**
| Role | Email | Password | Use Case |
|------|-------|----------|----------|
| **Admin** | `admin.primary@test.indoc.local` | `admin123` | System administration |
| **Admin** | `admin.backup@test.indoc.local` | `admin456` | Backup admin testing |
| **Reviewer** | `legal.reviewer@test.indoc.local` | `review123` | Legal document review |
| **Reviewer** | `tech.reviewer@test.indoc.local` | `review456` | Technical review |
| **Uploader** | `hr.uploader@test.indoc.local` | `upload123` | HR document uploads |
| **Uploader** | `finance.uploader@test.indoc.local` | `upload456` | Financial documents |
| **Uploader** | `new.uploader@test.indoc.local` | `upload789` | Unverified user testing |
| **Viewer** | `external.viewer@test.indoc.local` | `view123` | External access testing |
| **Viewer** | `intern.viewer@test.indoc.local` | `view456` | Limited access testing |
| **Compliance** | `officer.compliance@test.indoc.local` | `comply123` | Compliance monitoring |
| **Compliance** | `auditor.compliance@test.indoc.local` | `comply456` | Audit operations |

### **3. Test Document Types**
| Type | File | Content | Access Level | Uploader |
|------|------|---------|--------------|----------|
| **PDF** | `company_policy_2024.pdf` | Policy manual | Internal | HR |
| **PDF** | `financial_report_q4.pdf` | Financial data | Confidential | Finance |
| **PDF** | `technical_specification.pdf` | Tech docs | Internal | HR |
| **DOCX** | `meeting_notes_jan2024.docx` | Meeting minutes | Private | HR |
| **DOCX** | `project_proposal.docx` | Project plan | Internal | Finance |
| **XLSX** | `employee_database.xlsx` | Employee data | Confidential | HR |
| **XLSX** | `budget_analysis_2024.xlsx` | Budget data | Confidential | Finance |
| **PPTX** | `quarterly_presentation.pptx` | Business review | Internal | Finance |
| **TXT** | `api_documentation.txt` | API docs | Internal | HR |
| **TXT** | `system_logs.txt` | Error logs | Private | HR |
| **HTML** | `user_manual.html` | User guide | Public | HR |
| **JSON** | `configuration_settings.json` | Config data | Private | HR |
| **JSON** | `api_responses.json` | API examples | Internal | Finance |

### **4. Frontend E2E Test Flows**

#### **Login Flow Testing**
1. **Valid Login**: Use test credentials → Should redirect to dashboard
2. **Invalid Login**: Wrong password → Should show error message
3. **Role-based Redirect**: Different roles → Different default pages
4. **Session Persistence**: Refresh page → Should stay logged in
5. **Logout**: Click logout → Should redirect to login page

#### **Document Management Flow**
1. **Upload Flow** (Uploader role):
   - Navigate to Upload page
   - Select file → Drag & drop → Form upload
   - Fill metadata (title, description, tags)
   - Submit → Monitor progress → Verify success
   
2. **Search Flow** (All roles):
   - Navigate to Search page
   - Enter query → Apply filters → Submit
   - Review results → Click document → View details
   - Test pagination and sorting

3. **Document View Flow** (All roles):
   - Navigate to Documents page
   - Filter by type/date/uploader
   - Click document → View details
   - Test permissions (can edit vs read-only)

#### **Role-based Access Testing**
1. **Admin Access**: Can access all pages and functions
2. **Reviewer Access**: Can review but not upload
3. **Uploader Access**: Can upload but limited admin functions
4. **Viewer Access**: Read-only, no upload/admin pages
5. **Compliance Access**: Audit pages but limited document access

#### **Chat/AI Integration Flow**
1. **Document Chat**: Select document → Start chat → Ask questions
2. **General Chat**: Use chat without document context
3. **Conversation History**: View past conversations
4. **Real-time Updates**: WebSocket functionality

---

## 🔧 Test Automation Commands

### **Quick Test Setup**
```bash
# Complete setup
make local-e2e

# Generate seed data
conda activate indoc && cd backend && python seed_data_generator.py

# Run backend tests
conda activate indoc && cd backend && pytest -v

# Run frontend tests  
cd frontend && npm test
```

### **Health Checks**
```bash
# Check all services
make check-deps-local

# Check application health
make health-local

# View logs
make logs-local
```

### **Database Operations**
```bash
# Database shell for manual verification
make db-shell

# Backup before testing
make db-backup

# Reset database (if needed)
cd backend && alembic downgrade base && alembic upgrade head
```

---

## 📊 Expected Test Outcomes

### **Role Permission Matrix**
| Action | Admin | Reviewer | Uploader | Viewer | Compliance |
|--------|-------|----------|----------|--------|------------|
| **Upload Documents** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **View All Documents** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Delete Documents** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **System Settings** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Search Documents** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Chat with AI** | ✅ | ✅ | ✅ | ✅ | ✅ |

### **Document Access Matrix**
| Access Level | Admin | Reviewer | Uploader | Viewer | Compliance |
|--------------|-------|----------|----------|--------|------------|
| **Public** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Internal** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Private** | ✅ | ✅ | Own Only | ❌ | ✅ |
| **Confidential** | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 🎯 Critical Test Scenarios

### **Security Tests**
1. **Unauthorized Access**: Try accessing endpoints without token
2. **Role Escalation**: Try accessing higher-privilege endpoints
3. **Document Access**: Try accessing documents above permission level
4. **SQL Injection**: Test input validation on search/upload
5. **File Upload Security**: Test malicious file uploads

### **Performance Tests**
1. **Large File Upload**: Upload 95MB file (near limit)
2. **Bulk Operations**: Upload multiple files simultaneously
3. **Search Performance**: Complex queries with large dataset
4. **Concurrent Users**: Multiple users performing operations

### **Integration Tests**
1. **Search Integration**: Verify Elasticsearch indexing
2. **Vector Search**: Test Weaviate semantic search
3. **Background Jobs**: Verify Celery task processing
4. **WebSocket**: Test real-time chat functionality
5. **Audit Logging**: Verify all actions are logged

### **Error Handling Tests**
1. **Network Failures**: Test with services down
2. **Invalid Inputs**: Test validation and error messages
3. **File Corruption**: Test corrupted file uploads
4. **Database Errors**: Test database connection issues
5. **Authentication Failures**: Test token expiration

---

## 📋 Test Checklist

### **Pre-Test Setup**
- [ ] All services running (PostgreSQL, Redis, Elasticsearch, Weaviate)
- [ ] Backend and frontend started via `make local-e2e`
- [ ] Seed data generated successfully
- [ ] All test users can login

### **Role-based Functionality**
- [ ] Admin: Complete system access
- [ ] Reviewer: Document review workflow
- [ ] Uploader: File upload and management
- [ ] Viewer: Read-only access enforced
- [ ] Compliance: Audit and monitoring access

### **Document Operations**
- [ ] Upload: All supported file types
- [ ] Download: Proper file retrieval
- [ ] Search: Text and semantic search
- [ ] View: Document details and content
- [ ] Delete: Proper cleanup and audit

### **Security & Compliance**
- [ ] Authentication: Login/logout flows
- [ ] Authorization: Role-based access control
- [ ] Audit Logging: All actions tracked
- [ ] Data Privacy: Access level enforcement
- [ ] File Security: Virus scanning and validation

### **Integration Features**
- [ ] Search Services: Elasticsearch + Weaviate
- [ ] Background Processing: Celery tasks
- [ ] Real-time Features: WebSocket chat
- [ ] Monitoring: Health checks and metrics
- [ ] Multi-tenancy: Tenant isolation

This comprehensive testing framework ensures every aspect of inDoc is thoroughly validated across all user roles and scenarios.
