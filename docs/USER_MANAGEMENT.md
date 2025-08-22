# User Management in inDoc

## Overview

inDoc implements a comprehensive user management system with PostgreSQL as the primary database for authentication and authorization. The system follows enterprise-grade security practices with role-based access control (RBAC), password hashing, and complete audit logging.

## Architecture

### Database Layer (PostgreSQL)

All user data is stored in PostgreSQL with the following structure:

```sql
users table:
- id (Primary Key)
- email (Unique)
- username (Unique)
- full_name
- hashed_password (bcrypt)
- role (ENUM: Admin, Reviewer, Uploader, Viewer, Compliance)
- is_active (Boolean)
- is_verified (Boolean)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### Authentication Flow

1. **Login**: User provides email/username + password
2. **Verification**: Password is verified against bcrypt hash in PostgreSQL
3. **Token Generation**: JWT token is created with user ID and role
4. **Authorization**: Each API endpoint checks user role from token

## User Roles & Permissions

### Role Hierarchy

| Role | Permissions |
|------|------------|
| **Admin** | Full system access, user management, all CRUD operations |
| **Reviewer** | Review documents, update metadata, access all documents |
| **Uploader** | Upload documents, edit own documents, search |
| **Viewer** | View and search documents (own documents only) |
| **Compliance** | Access audit logs, generate compliance reports |

### Permission Matrix

| Action | Admin | Reviewer | Uploader | Viewer | Compliance |
|--------|-------|----------|----------|--------|------------|
| Upload Documents | ✅ | ✅ | ✅ | ❌ | ❌ |
| View All Documents | ✅ | ✅ | ❌ | ❌ | ✅ |
| View Own Documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Document Metadata | ✅ | ✅ | Own only | ❌ | ❌ |
| Delete Documents | ✅ | ❌ | ❌ | ❌ | ❌ |
| Search Documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ✅ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |

## API Endpoints

### Authentication Endpoints

```
POST   /api/v1/auth/register     - Register new user
POST   /api/v1/auth/login        - Login (returns JWT token)
GET    /api/v1/auth/me           - Get current user info
POST   /api/v1/auth/logout       - Logout
```

### User Management Endpoints (Admin Only)

```
GET    /api/v1/users             - List all users
GET    /api/v1/users/stats       - Get user statistics
GET    /api/v1/users/{id}        - Get user by ID
POST   /api/v1/users             - Create new user
PUT    /api/v1/users/{id}        - Update user
DELETE /api/v1/users/{id}        - Delete user
POST   /api/v1/users/{id}/activate   - Activate user
POST   /api/v1/users/{id}/deactivate - Deactivate user
POST   /api/v1/users/{id}/reset-password - Reset password
```

## Default Users

The system comes with pre-configured demo users:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@indoc.local | admin123 | Admin | System administration |
| reviewer@indoc.local | admin123 | Reviewer | Document review |
| uploader@indoc.local | admin123 | Uploader | Document upload |
| viewer@indoc.local | admin123 | Viewer | Read-only access |
| compliance@indoc.local | admin123 | Compliance | Audit and compliance |

**⚠️ Important**: Change these passwords immediately in production!

## Security Features

### Password Security
- **Hashing**: All passwords are hashed using bcrypt with salt rounds of 12
- **Minimum Requirements**: 8 characters minimum (configurable)
- **No Plain Text**: Passwords are never stored or logged in plain text

### JWT Token Security
- **Expiration**: Tokens expire after 24 hours (configurable)
- **Algorithm**: HS256 with secret key
- **Payload**: Contains user ID and role for authorization

### Audit Logging
Every user action is logged in the `audit_logs` table:
- User identification (ID, email, role)
- Action performed (create, read, update, delete)
- Resource affected
- Timestamp
- IP address and user agent
- Success/failure status

## Database Setup

### Automatic Setup
Run the database setup script:
```bash
./setup-database.sh
```

### Manual Setup
1. Ensure PostgreSQL is running:
```bash
docker-compose up -d postgres
```

2. Initialize the database:
```bash
cd backend
python3 init_db.py
```

### Verify Setup
Check if users are created:
```bash
docker-compose exec postgres psql -U indoc_user -d indoc -c "SELECT email, role FROM users;"
```

## User Management UI

The frontend provides comprehensive user management interfaces:

### For Admins
- **User List Page** (`/users`): View and manage all users
- **User Creation**: Add new users with role assignment
- **User Editing**: Update user information and roles
- **Account Control**: Activate/deactivate accounts

### For All Users
- **Profile Page**: View and edit own profile
- **Password Change**: Update own password
- **Account Settings**: Manage personal preferences

## Code Structure

### Backend Files
```
backend/
├── app/
│   ├── models/
│   │   └── user.py           # User database model
│   ├── schemas/
│   │   └── auth.py           # Pydantic schemas
│   ├── crud/
│   │   └── user.py           # Database operations
│   ├── api/v1/endpoints/
│   │   ├── auth.py           # Authentication endpoints
│   │   └── users.py          # User management endpoints
│   └── core/
│       └── security.py       # Security utilities
└── init_db.py               # Database initialization
```

### Frontend Files
```
frontend/src/
├── pages/
│   ├── LoginPage.tsx         # Login interface
│   ├── RegisterPage.tsx      # Registration interface
│   └── RoleManagementPage.tsx # User management
├── store/slices/
│   └── authSlice.ts          # Authentication state
└── components/
    └── PrivateRoute.tsx      # Route protection
```

## Testing User Management

### Test Authentication
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@indoc.local&password=admin123"

# Get current user
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test User CRUD
```bash
# List users (Admin only)
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Create user (Admin only)
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "full_name": "New User",
    "password": "password123",
    "role": "Viewer"
  }'
```

## Troubleshooting

### Common Issues

1. **"User not found" during login**
   - Run `./setup-database.sh` to create default users
   - Check PostgreSQL is running: `docker-compose ps`

2. **"Invalid credentials"**
   - Verify you're using correct email/username
   - Default password is `admin123` for demo users

3. **"Unauthorized" errors**
   - Check if JWT token is expired
   - Verify user has required role for the action

4. **Database connection errors**
   - Ensure PostgreSQL is running
   - Check `.env` file has correct database credentials
   - Verify port 5432 is not blocked

### Reset Database
If you need to reset the user database:
```bash
# Stop services
docker-compose down

# Remove volume
docker volume rm indoc_postgres_data

# Restart and reinitialize
docker-compose up -d postgres
./setup-database.sh
```

## Best Practices

### Production Deployment
1. **Change default passwords** immediately
2. **Use strong JWT secret** (minimum 32 characters)
3. **Enable HTTPS** for all endpoints
4. **Implement rate limiting** on auth endpoints
5. **Add password complexity requirements**
6. **Enable two-factor authentication** (2FA)
7. **Regular security audits** of user permissions

### Password Policy Recommendations
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- No common dictionary words
- Regular password rotation (90 days)
- Prevent reuse of last 5 passwords

### Audit Log Retention
- Keep audit logs for minimum 7 years (compliance)
- Archive old logs to cold storage
- Implement log rotation
- Regular audit log reviews

## Compliance

The user management system is designed to meet:
- **GDPR**: User consent, data portability, right to deletion
- **HIPAA**: Access controls, audit logs, encryption
- **PCI-DSS**: Strong authentication, access logging
- **SOC 2**: User access reviews, privilege management

## Future Enhancements

Planned improvements for user management:
- [ ] Single Sign-On (SSO) integration
- [ ] Multi-factor authentication (MFA)
- [ ] Password recovery via email
- [ ] User groups and teams
- [ ] Fine-grained permissions
- [ ] Session management
- [ ] Login history tracking
- [ ] Automated user provisioning
- [ ] LDAP/Active Directory integration