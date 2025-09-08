# 📚 inDoc API Reference

## 🔐 **Authentication**

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "username": "your-username",
    "password": "your-password"
}
```

**Response:**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 86400
}
```

### Using the Token
```http
Authorization: Bearer {access_token}
```

## 📄 **Document Management**

### Upload Document
```http
POST /api/v1/files
Content-Type: multipart/form-data

file: {binary-file-data}
```

### List Documents
```http
GET /api/v1/files?limit=20&offset=0
```

### Get Document
```http
GET /api/v1/files/{document_id}
```

### Delete Document
```http
DELETE /api/v1/files/{document_id}
```

## 💬 **Conversations**

### Create Conversation
```http
POST /api/v1/chat/conversations
Content-Type: application/json

{
    "title": "Research Discussion",
    "document_ids": ["uuid-1", "uuid-2"]
}
```

### Send Message
```http
POST /api/v1/chat
Content-Type: application/json

{
    "conversation_id": "conv-uuid",
    "message": "What are the key findings?",
    "document_ids": ["uuid-1", "uuid-2"],
    "model": "gpt-oss:20b",
    "stream": false
}
```

### WebSocket Chat
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/chat/ws/{conversation_id}');

ws.send(JSON.stringify({
    "message": "Tell me about these documents",
    "model": "gpt-oss:20b"
}));
```

## 🔍 **Search**

### Semantic Search
```http
GET /api/v1/search/documents?q=machine learning&semantic=true&limit=10
```

### Hybrid Search
```http
POST /api/v1/search/hybrid
Content-Type: application/json

{
    "query": "financial documents from 2024",
    "document_ids": ["uuid-1", "uuid-2"],
    "limit": 20,
    "filters": {
        "file_type": ["pdf", "docx"],
        "date_range": "2024-01-01 to 2024-12-31"
    }
}
```

## 🔐 **Compliance & Security**

### Get Compliance Mode
```http
GET /api/v1/compliance/mode
```

### Set Compliance Mode (Admin Only)
```http
POST /api/v1/compliance/mode
Content-Type: application/json

{
    "mode": "hipaa",
    "justification": "Processing patient records"
}
```

### Scan for PHI
```http
POST /api/v1/compliance/scan-phi
Content-Type: application/json

{
    "text": "Patient John Smith, SSN 123-45-6789",
    "mode": "hipaa"
}
```

## 🔗 **Document Relationships**

### Analyze Document Relationships
```http
GET /api/v1/relationships/analyze/{document_id}
```

### Get Document Network
```http
POST /api/v1/relationships/network
Content-Type: application/json

{
    "document_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### Find Citation Path
```http
GET /api/v1/relationships/citation-path?source_document_id=uuid-1&target_document_id=uuid-2
```

## 📊 **Admin & Analytics**

### System Health
```http
GET /api/v1/health
GET /api/v1/health/database
GET /api/v1/health/search
GET /api/v1/health/ai
```

### User Management (Admin Only)
```http
GET /api/v1/users
POST /api/v1/users
PUT /api/v1/users/{user_id}
DELETE /api/v1/users/{user_id}
```

### Audit Logs
```http
GET /api/v1/audit/logs?start_date=2024-01-01&end_date=2024-12-31
```

## 📈 **Response Formats**

### Success Response
```json
{
    "success": true,
    "data": { ... },
    "timestamp": "2024-09-06T20:30:00Z"
}
```

### Error Response  
```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid document format",
        "details": { ... }
    },
    "timestamp": "2024-09-06T20:30:00Z"
}
```

## 🔧 **Rate Limits**

- **Authentication:** 5 requests/minute per IP
- **File Upload:** 50 files/hour per user  
- **Chat Messages:** 100 messages/hour per user
- **Search:** 1000 queries/hour per user

## 📞 **Support**

For API questions:
- **GitHub Issues** - Technical questions
- **Enterprise Support** - Guaranteed SLA response times
- **Documentation** - Interactive docs at `/docs` when running the application
