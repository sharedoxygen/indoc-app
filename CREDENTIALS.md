# inDoc Platform Credentials

## 🔐 Grafana Monitoring Dashboard

**URL:** http://localhost:3030

**Default Credentials:**
- **Username:** `admin`
- **Password:** `admin`

> Note: On first login, Grafana may prompt you to change the password. You can skip this or set a new password.

---

## 👤 inDoc Application Users

**URL:** http://localhost:5173 (Frontend) or http://localhost:8000/api/v1/docs (API)

### Default Admin User
- **Email:** `admin@indoc.local`
- **Password:** *Randomly generated during database initialization*
- **Role:** Admin
- **Capabilities:**
  - Full system administration
  - Multi-tenant visibility
  - User management
  - All document operations
  - Audit log access
  - System configuration

### Other Default Users

All user passwords are **randomly generated** for security. Check the database initialization output or set custom passwords via environment variables.

| Email | Role | Description |
|-------|------|-------------|
| `reviewer@indoc.local` | Reviewer | Document review and approval |
| `uploader@indoc.local` | Uploader | Document upload and basic management |
| `viewer@indoc.local` | Viewer | Read-only access |
| `compliance@indoc.local` | Compliance | Audit and compliance monitoring |

---

## 🔧 Service-Specific Credentials

### PostgreSQL Database
- **Host:** localhost:5432
- **Database:** indoc
- **Username:** `indoc_user`
- **Password:** `indoc_dev_password` (or what you set in environment)

### Redis
- **URL:** redis://localhost:6379
- **No authentication** by default

### Elasticsearch
- **URL:** http://localhost:9200
- **No authentication** (xpack.security disabled)

### Weaviate
- **URL:** http://localhost:8060
- **Anonymous access enabled**

---

## 📊 Monitoring Services

### Flower (Celery Monitoring)
- **URL:** http://localhost:5555
- **No authentication** by default

### Prometheus
- **URL:** http://localhost:9090
- **No authentication** by default

### Grafana
- **URL:** http://localhost:3030
- **Username:** `admin`
- **Password:** `admin`

---

## 🔑 API Authentication

To get an access token for API calls:

```bash
# Login and get JWT token (use actual password from init output)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@indoc.local&password=YOUR_ACTUAL_PASSWORD"
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

Use the token in subsequent requests:
```bash
curl -X GET http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer eyJ..."
```

---

## 🔄 Setting Custom Passwords

### Environment Variables (Recommended)
Set passwords before database initialization:

```bash
# Set custom passwords
export ADMIN_PASSWORD="your-secure-admin-password"
export REVIEWER_PASSWORD="your-reviewer-password"
export UPLOADER_PASSWORD="your-uploader-password"
export VIEWER_PASSWORD="your-viewer-password"
export COMPLIANCE_PASSWORD="your-compliance-password"

# Initialize database
make db-init
```

### Grafana Admin Password
1. Login with `admin/admin`
2. Go to Configuration → Users
3. Click on admin user
4. Change password

Or via Docker environment variable:
```bash
# In docker-compose.yml or .env
GRAFANA_PASSWORD=your_new_password
```

### Application Admin Password
```python
# Via API
POST /api/v1/users/change-password
{
  "current_password": "current_password",
  "new_password": "your_new_secure_password"
}
```

### PostgreSQL Password
Update in `.env` file:
```env
POSTGRES_PASSWORD=your_new_password
```

Then update the database user:
```sql
ALTER USER indoc_user WITH PASSWORD 'your_new_password';
```

---

## 🛡️ Security Recommendations

1. **Set custom passwords** via environment variables before initialization
2. **Use strong passwords** (min 12 characters, mixed case, numbers, symbols)
3. **Enable 2FA** where possible (Grafana supports this)
4. **Rotate passwords** regularly
5. **Use environment variables** for sensitive credentials
6. **Never commit** credentials to version control

---

## 🚨 Troubleshooting Login Issues

### Finding Generated Passwords
Check the database initialization output:
```bash
make db-init
# Look for the password output in the console
```

Or query the database:
```sql
SELECT email, role FROM users WHERE email = 'admin@indoc.local';
```

### Grafana
- Default is `admin/admin`
- If changed and forgotten, reset via CLI:
  ```bash
  docker exec -it indoc-grafana grafana-cli admin reset-admin-password admin
  ```

### Token Expiration
- Default JWT expiration: 1440 minutes (24 hours)
- Configurable via `JWT_EXPIRATION_MINUTES` in `.env`

---

## 📝 Notes

- **All passwords are randomly generated** for security by default
- **Grafana** uses standard `admin/admin` defaults
- **In production**, use strong, unique passwords for each service
- **Consider using a secrets management system** (e.g., HashiCorp Vault, AWS Secrets Manager)
- **Environment template** available at `tools/env.template`