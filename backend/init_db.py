"""
Initialize database with tables and default users
"""
import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize database with tables and default data"""
    
    # Create engine
    engine = create_engine(settings.SYNC_DATABASE_URL, echo=True)
    
    # Create all tables
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create session
    with Session(engine) as session:
        # Check if admin user exists
        existing_admin = session.query(User).filter_by(email="admin@indoc.local").first()
        
        if not existing_admin:
            logger.info("Creating default users...")
            
            # Create default admin user
            admin_user = User(
                email="admin@indoc.local",
                username="admin",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(admin_user)
            
            # Create demo users for each role
            demo_users = [
                User(
                    email="reviewer@indoc.local",
                    username="reviewer",
                    full_name="Demo Reviewer",
                    hashed_password=get_password_hash("reviewer123"),
                    role=UserRole.REVIEWER,
                    is_active=True,
                    is_verified=True
                ),
                User(
                    email="uploader@indoc.local",
                    username="uploader",
                    full_name="Demo Uploader",
                    hashed_password=get_password_hash("uploader123"),
                    role=UserRole.UPLOADER,
                    is_active=True,
                    is_verified=True
                ),
                User(
                    email="viewer@indoc.local",
                    username="viewer",
                    full_name="Demo Viewer",
                    hashed_password=get_password_hash("viewer123"),
                    role=UserRole.VIEWER,
                    is_active=True,
                    is_verified=True
                ),
                User(
                    email="compliance@indoc.local",
                    username="compliance",
                    full_name="Compliance Officer",
                    hashed_password=get_password_hash("compliance123"),
                    role=UserRole.COMPLIANCE,
                    is_active=True,
                    is_verified=True
                )
            ]
            
            for user in demo_users:
                session.add(user)
            
            session.commit()
            logger.info("Default users created successfully!")
            
            # Print user credentials
            print("\n" + "="*50)
            print("DEFAULT USER CREDENTIALS")
            print("="*50)
            print("\nAdmin User:")
            print("  Email: admin@indoc.local")
            print("  Password: admin123")
            print("\nDemo Users:")
            print("  Reviewer: reviewer@indoc.local / reviewer123")
            print("  Uploader: uploader@indoc.local / uploader123")
            print("  Viewer: viewer@indoc.local / viewer123")
            print("  Compliance: compliance@indoc.local / compliance123")
            print("="*50 + "\n")
        else:
            logger.info("Admin user already exists, skipping user creation")
        
        # Verify users were created
        user_count = session.query(User).count()
        logger.info(f"Total users in database: {user_count}")
        
        # List all users
        users = session.query(User).all()
        print("\nCurrent users in database:")
        for user in users:
            print(f"  - {user.email} (Role: {user.role.value})")


if __name__ == "__main__":
    init_database()