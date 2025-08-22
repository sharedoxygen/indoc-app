"""
Celery configuration and initialization
"""
from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "indoc",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    
    # Task routing
    task_routes={
        "app.tasks.document.*": {"queue": "document_processing"},
        "app.tasks.search.*": {"queue": "search_indexing"},
        "app.tasks.llm.*": {"queue": "llm_processing"},
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-old-sessions": {
            "task": "app.tasks.maintenance.cleanup_old_sessions",
            "schedule": 3600.0,  # Every hour
        },
        "update-tenant-usage": {
            "task": "app.tasks.maintenance.update_tenant_usage",
            "schedule": 300.0,  # Every 5 minutes
        },
        "process-pending-documents": {
            "task": "app.tasks.document.process_pending_documents",
            "schedule": 60.0,  # Every minute
        },
    },
)