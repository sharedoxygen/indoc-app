# 🚀 inDoc Deployment Guide

## 📋 **Deployment Options Overview**

### 1. **Private SaaS (Managed)**
- **Who handles what:** Shared Oxygen manages infrastructure, you use the service
- **Best for:** Healthcare practices, law firms, financial advisors (50-500 users)
- **Timeline:** Live in 24 hours
- **Cost:** Monthly subscription based on usage

### 2. **Commercial Cloud (Your Account)**
- **Who handles what:** You provide AWS/Azure/GCP account, we provide deployment automation
- **Best for:** Enterprises with existing cloud infrastructure
- **Timeline:** 1-2 weeks for full deployment
- **Cost:** Infrastructure costs + software license

### 3. **On-Premise (Self-Hosted)**
- **Who handles what:** You manage everything, we provide software and support
- **Best for:** Government, defense, maximum security requirements
- **Timeline:** 2-4 weeks with professional services
- **Cost:** One-time license + optional support

## ☁️ **Commercial Cloud Deployment**

### **AWS Deployment**

#### Prerequisites
- AWS account with admin privileges
- Domain name for HTTPS setup
- Basic AWS knowledge (VPC, EC2, RDS)

#### Quick Deploy (Recommended)
```bash
# Using our Terraform modules
git clone https://github.com/sharedoxygen/indoc-aws-deploy.git
cd indoc-aws-deploy
terraform init
terraform plan -var="domain_name=your-domain.com"
terraform apply
```

#### Manual AWS Setup
- **Compute:** ECS with Fargate or EC2 (t3.large minimum)
- **Database:** RDS PostgreSQL 15 with Multi-AZ
- **Cache:** ElastiCache Redis cluster
- **Storage:** EFS or S3 for document storage
- **Load Balancer:** ALB with SSL termination
- **Security:** VPC, security groups, IAM roles

### **Azure Deployment**

#### Quick Deploy
```bash
# Using Azure Resource Manager templates  
az deployment group create \
  --resource-group indoc-rg \
  --template-file azure/indoc-template.json \
  --parameters domainName=your-domain.com
```

#### Manual Azure Setup
- **Compute:** Container Instances or App Service
- **Database:** Azure Database for PostgreSQL
- **Cache:** Azure Cache for Redis
- **Storage:** Azure Files or Blob Storage
- **Load Balancer:** Application Gateway
- **Security:** Virtual Network, NSGs, Key Vault

### **GCP Deployment**

#### Quick Deploy
```bash
# Using Cloud Deployment Manager
gcloud deployment-manager deployments create indoc \
  --config gcp/indoc-config.yaml \
  --properties domain:your-domain.com
```

#### Manual GCP Setup
- **Compute:** Cloud Run or GKE
- **Database:** Cloud SQL PostgreSQL
- **Cache:** Memorystore for Redis  
- **Storage:** Cloud Storage
- **Load Balancer:** Global Load Balancer
- **Security:** VPC, IAM, Secret Manager

## 🏛️ **On-Premise Deployment**

### **Infrastructure Requirements**

#### **Development/Testing**
- 1 server: 8GB RAM, 4 CPU, 100GB SSD
- Docker and Docker Compose
- PostgreSQL and Redis

#### **Production**
- **App Servers:** 2+ servers, 16GB RAM, 8 CPU each
- **Database:** PostgreSQL cluster with replication
- **Cache:** Redis cluster for high availability  
- **Storage:** NAS or SAN for document storage
- **Load Balancer:** HAProxy or hardware LB

### **Security Considerations**
- **Network:** Isolated VLAN, firewall rules
- **Encryption:** TLS certificates, encrypted storage
- **Access:** VPN access, multi-factor authentication
- **Monitoring:** SIEM integration, log aggregation

### **Installation Steps**

1. **Prepare Infrastructure**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
pip install docker-compose

# Create storage directories
mkdir -p /opt/indoc/{data,logs,backups}
```

2. **Deploy Application**
```bash
git clone https://github.com/sharedoxygen/indoc-app.git
cd indoc-app

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

3. **Initialize Database**
```bash
# Run database migrations
docker-compose exec api python tools/init_db.py

# Create admin user
docker-compose exec api python tools/create_admin.py
```

4. **Verify Deployment**
```bash
# Check health endpoints
curl http://localhost:8000/api/v1/health

# Access application
open http://localhost:5173
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Core services
POSTGRES_HOST=your-db-host
OLLAMA_BASE_URL=http://your-ollama-server:11434
OLLAMA_MODEL=gpt-oss:20b

# Security  
JWT_SECRET_KEY=your-generated-secret-key
FIELD_ENCRYPTION_KEY=your-32-byte-encryption-key

# Compliance
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years for HIPAA
ENABLE_FIELD_ENCRYPTION=true
ENABLE_AUDIT_LOGGING=true
```

### **SSL/TLS Setup**
```bash
# For production deployments
# Use Let's Encrypt or your organization's certificates
SSL_CERT_PATH=/path/to/certificate.pem
SSL_KEY_PATH=/path/to/private.key
```

## 📊 **Monitoring & Health Checks**

### **Health Endpoints**
- `/api/v1/health` - Application health
- `/api/v1/health/database` - Database connectivity  
- `/api/v1/health/search` - Search service status
- `/api/v1/health/ai` - AI service availability

### **Monitoring Integration**
- **Prometheus:** Metrics collection at `/metrics`
- **Grafana:** Dashboard templates included
- **DataDog:** APM integration available
- **Custom:** JSON logs for external SIEM

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check PostgreSQL status
docker-compose logs postgres

# Verify connectivity  
docker-compose exec api python -c "from app.db.session import engine; print('DB OK')"
```

#### **AI Models Not Loading**
```bash
# Check Ollama service
curl http://localhost:11434/api/tags

# Pull required model
docker-compose exec ollama ollama pull gpt-oss:20b
```

#### **Search Service Unavailable**
```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Restart if needed
docker-compose restart elasticsearch
```

## 📞 **Support**

### **Professional Services**
- **Deployment assistance** - We help you deploy on your infrastructure
- **Custom integrations** - API integrations with your existing systems
- **Training & onboarding** - User training and best practices
- **24/7 support** - Enterprise support contracts available

### **Self-Service Resources**
- **Documentation** - Comprehensive guides in `/docs/`
- **API Reference** - Interactive docs at `/docs` when running
- **GitHub Issues** - Community support and bug reports
- **Discussions** - Questions and feature discussions

---

**📧 Contact:** [Contact Shared Oxygen, LLC for enterprise inquiries]
