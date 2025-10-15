# Security Migration Notice

**Date:** 2025-10-15 12:35:00

## What Happened

This repository is a clean migration from the original `indoc-app` repository due to 
a security incident where sensitive data was inadvertently committed to git history.

## Actions Taken

1. ✅ Created new repository with clean history
2. ✅ Migrated ONLY source code (no user data, credentials, or sensitive files)
3. ✅ Implemented comprehensive .gitignore
4. ✅ Added pre-commit hooks for secret detection
5. ⚠️  Old repository archived as `indoc-app-archived`

## What Was Excluded

- User data and uploads
- Database backups
- Private documentation
- Credentials and keys
- Test data files
- Build artifacts
- Logs and temporary files

## Next Steps

1. Rotate all credentials from the old repository
2. Review and update team access
3. Implement secret scanning in CI/CD
4. Train team on git security best practices

## Old Repository

The original repository has been archived and kept private for audit purposes.
**Do NOT use credentials from the old repository.**

---
*This migration was performed to maintain the highest security standards for inDoc.*
