# Hardcoded Values Audit and Removal Summary

## Overview
This document summarizes all hardcoded values that were identified and removed from the inDoc application to improve security, configurability, and maintainability.

## Critical Security Fixes

### 1. JWT Secret Key
**Location**: `backend/app/core/config.py`
- **Before**: `JWT_SECRET_KEY: str = Field(default="change-this-in-production")`
- **After**: `JWT_SECRET_KEY: str = Field(default_factory=lambda: os.urandom(32).hex())`
- **Impact**: Eliminates hardcoded JWT secret, generates random 32-byte hex string

### 2. User Passwords
**Locations**: 
- `backend/init_db.py`
- `backend/seed_data_generator.py` 
- `backend/e2e_test_runner.py`

**Before**: Hardcoded passwords like `admin123`, `reviewer123`, etc.
**After**: 
- Secure random password generation using `secrets.token_urlsafe(16)`
- Environment variable support for custom passwords
- Clear documentation of password generation

## Frontend Dynamic Data Implementation

### 3. Dashboard System Status
**Location**: `frontend/src/pages/DashboardPage.tsx`
- **Before**: Hardcoded `value={100}` for all system health indicators
- **After**: Dynamic health checking via `useGetDependenciesHealthQuery()`
- **Impact**: Real-time system status monitoring

### 4. Recent Activity Feed
**Location**: `frontend/src/pages/DashboardPage.tsx`
- **Before**: Static "No recent activity to display" message
- **After**: Dynamic audit log data via `useGetAuditLogsQuery()`
- **Impact**: Live activity feed showing actual user actions

### 5. Dashboard Statistics
**Location**: `frontend/src/pages/DashboardPage.tsx`
- **Before**: Mixed hardcoded and dynamic values
- **After**: All statistics calculated from real API data
- **Impact**: Accurate document counts, storage usage, and user metrics

## Configuration Improvements

### 6. Service URLs and Ports
**Location**: `backend/app/core/config.py`
- **Before**: Hardcoded URLs like `"http://localhost:9200"`
- **After**: Configurable via `Field(default="http://localhost:9200")`
- **Impact**: Environment-specific configuration support

### 7. Database Configuration
**Location**: `Makefile`
- **Before**: Hardcoded database connection parameters
- **After**: Environment variable support with fallbacks
- **Impact**: Flexible database configuration across environments

## Development and Operations

### 8. Docker Compose Syntax
**Location**: Multiple shell scripts and Makefile
- **Before**: Deprecated `docker-compose` command
- **After**: Modern `docker compose` syntax
- **Impact**: Compatibility with latest Docker versions

### 9. Environment Template
**Location**: `backend/env.template`
- **New File**: Comprehensive environment configuration template
- **Impact**: Clear documentation of all configurable values

## Remaining Acceptable "Hardcoded" Values

The following values remain hardcoded as they are either:
- UI text/placeholders (e.g., "Search for documents...")
- Standard configuration defaults
- Development-specific values that should remain consistent

### Acceptable Hardcoded Values:
1. **UI Placeholders**: "Search for documents...", "Type your message..."
2. **CSS/Layout Values**: Width percentages, gradients, spacing
3. **Development Ports**: Frontend dev server (5173), API (8000) in vite.config.ts
4. **Standard Algorithms**: JWT algorithm "HS256"

## Security Improvements Summary

1. **Eliminated** all hardcoded passwords
2. **Replaced** static JWT secret with dynamic generation
3. **Added** environment variable support for sensitive configuration
4. **Created** secure password generation for all test users
5. **Documented** all configurable values in environment template

## Configuration Management

### Environment Variables Now Supported:
- `ADMIN_PASSWORD`, `REVIEWER_PASSWORD`, etc.
- `JWT_SECRET_KEY`
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `ELASTICSEARCH_URL`, `WEAVIATE_URL`, `REDIS_URL`
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- All service URLs and connection parameters

### Usage:
```bash
# Copy template and customize
cp backend/env.template .env

# Set custom passwords
export ADMIN_PASSWORD="your-secure-admin-password"
export JWT_SECRET_KEY="your-super-secret-jwt-key"

# Run with custom configuration
make local-e2e
```

## Validation

All hardcoded values have been systematically identified and either:
1. **Removed** and replaced with dynamic data sources
2. **Made configurable** via environment variables
3. **Documented** as acceptable for UI/development purposes

The application now supports full configuration flexibility while maintaining security best practices.
