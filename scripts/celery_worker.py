#!/usr/bin/env python
"""
Celery worker entry point
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.celery_app import celery_app
from app.core.config import settings

if __name__ == "__main__":
    # Configure worker
    worker_config = {
        'loglevel': settings.LOG_LEVEL,
        'traceback': True,
        'autoscale': '10,3',  # Max 10, min 3 workers
        'max_tasks_per_child': 1000,
        'task_events': True,
        'pool': 'prefork'  # Use 'solo' for Windows
    }
    
    # Start worker
    celery_app.worker_main(
        argv=['worker', '--loglevel=info', '--concurrency=4']
    )