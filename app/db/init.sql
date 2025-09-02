-- Initial database setup for inDoc
-- This file is executed when PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Admin', 'Reviewer', 'Uploader', 'Viewer', 'Compliance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
-- These will be created after tables are created by Alembic

-- Create default admin user (password: admin123)
-- This will be inserted after tables are created