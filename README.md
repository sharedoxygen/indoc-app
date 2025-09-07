# 🚀 inDoc - Conversational Document Intelligence

<div align="center">

**Multi-document AI conversations with privacy-focused deployment options**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg?style=flat&logo=FastAPI)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)
[![Security](https://img.shields.io/badge/Security-HIPAA%20%7C%20PCI-green.svg?style=flat&logo=shield)](https://hipaa.com/)

</div>

---

## 🌟 **What is inDoc?**

inDoc enables natural language conversations with your document library while maintaining strict data isolation. Ask questions across multiple documents simultaneously, get intelligent insights, and maintain complete control over your data privacy.

✨ **Key differentiators:** Multi-document conversation capabilities, comprehensive audit logging, and flexible deployment options that prioritize data privacy and regulatory compliance.

---

## 🚀 **Quick Start**

### **☁️ Private SaaS (Recommended for Most)**
Contact us for dedicated private cloud instances:
- ✅ **Dedicated instances** with complete data isolation
- ✅ **Enterprise SLAs** and 24/7 support  
- ✅ **HIPAA, PCI, SOC 2** compliant hosting
- ✅ **Live in 24 hours** - No infrastructure setup required

*Perfect for healthcare practices, law firms, financial advisors*

### **🏗️ Commercial Cloud Deployment**
Deploy inDoc on your AWS, Azure, or GCP account:
- ✅ **You control** the infrastructure and data location
- ✅ **We provide** software, updates, and technical support
- ✅ **Best of both worlds** - Your cloud, our expertise
- ✅ **Terraform/Helm** deployment templates included

*Perfect for enterprises with existing cloud infrastructure*

### **🏛️ On-Premise Deployment**
Complete control with self-hosted deployment:

```bash
git clone https://github.com/sharedoxygen/indoc-app.git
cd indoc-app
make local-e2e
open http://localhost:5173
```

*Perfect for government, defense, and air-gapped environments*

---

## 📋 **How inDoc Compares**

| Feature | ChatGPT/Claude | ChatPDF/NotionAI | **inDoc** |
|---------|----------------|------------------|-----------|
| **Data Privacy** | Shared cloud infrastructure | Shared cloud infrastructure | Dedicated processing environments |
| **Multi-Document Context** | Single document conversations | Limited cross-document capability | Multiple documents in one conversation |
| **Conversation Memory** | Session-based context | Basic conversation history | Persistent conversation context |
| **Enterprise Audit Trail** | Limited logging | Basic activity tracking | Comprehensive audit logging |
| **Compliance Features** | General cloud compliance | Standard security measures | Purpose-built compliance modes |
| **Deployment Options** | Cloud-hosted only | Cloud-hosted only | Private SaaS + Commercial Cloud + On-Premise |

---

## 🤖 **AI-Powered Features**

### **Conversational Intelligence**
- Chat naturally with multiple documents simultaneously
- Persistent conversation history and context
- Advanced language models served by Ollama
- Real-time WebSocket support

### **Document Processing**
- Universal format support (PDF, DOCX, TXT, emails)
- Intelligent text extraction and chunking
- Semantic search with Elasticsearch & Weaviate
- Async processing pipeline with status tracking

### **Enterprise Security**
- Field-level encryption for sensitive data
- Comprehensive audit logging for compliance
- Role-based access control (Admin, Reviewer, Compliance)
- Multi-tenant architecture with complete data isolation

### **Compliance Ready**
- HIPAA-compliant modes with PHI protection
- PCI DSS support for financial data
- Automated compliance reporting
- Document relationship tracking for audit trails

---

## 💼 **Perfect For**

- 🏥 **Healthcare** - HIPAA-compliant patient record analysis
- 💰 **Financial** - PCI-compliant document processing
- ⚖️ **Legal** - Attorney-client privileged document review  
- 🏭 **Enterprise** - Trade secrets and confidential information
- 🏛️ **Government** - Classified or sensitive document analysis

---

## 📚 **Documentation & Support**

- **[API Reference](docs/api-reference.md)** - Complete endpoint documentation
- **[Deployment Guide](docs/deployment.md)** - Infrastructure setup instructions
- **[Security Guide](docs/security.md)** - Compliance and security details
- **[Developer Guide](docs/development.md)** - Contributing and development setup

### **Get Help**
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community support  
- **Enterprise Support** - Contact us for dedicated technical support

---

## 🔧 **System Requirements**

### **Minimum (Development)**
- Docker & Docker Compose
- 8GB RAM, 4 CPU cores
- 50GB storage

### **Production (Commercial Cloud)**
- **AWS/Azure/GCP:** 4+ vCPU, 16GB+ RAM
- **Database:** PostgreSQL 15+, Redis 6+
- **Search:** Elasticsearch 8+ (optional)
- **Storage:** 100GB+ SSD

### **Enterprise (On-Premise)**
- **High Availability:** Load balancers, redundant systems
- **Security:** Isolated networks, encryption at rest/transit
- **Compliance:** Audit logging, access controls, data retention

---

## 🏗️ **Architecture**

```mermaid
graph TB
    subgraph "User Interface"
        UI[React Frontend]
        MOBILE[Mobile App]
    end
    
    subgraph "API Layer"  
        API[FastAPI Backend]
        WS[WebSocket Chat]
    end
    
    subgraph "AI/ML Services"
        OLLAMA[Ollama LLM Server]
        SEARCH[Semantic Search]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[Document Storage]
    end
    
    UI --> API
    MOBILE --> API
    API --> WS
    API --> OLLAMA
    API --> SEARCH
    API --> POSTGRES
    API --> REDIS
    API --> FILES
```

---

<div align="center">

**Made with ❤️ by Shared Oxygen, LLC**

⭐ **Star this repository if you find it useful!** ⭐

</div>