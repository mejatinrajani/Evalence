"""
Celery Configuration for Phase 1: Event Lifecycle Automation

This module sets up Celery for handling background tasks:
- Automatic event phase transitions
- Submission deadline enforcement  
- Leaderboard calculation & publishing
- Reminder email notifications
"""

from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv

load_dotenv()

# Create Celery instance
celery_app = Celery(
    'evalence',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0')
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes hard limit
    result_expires=3600,  # Results expire after 1 hour
    
    # Task routing
    task_routes={
        'backend.tasks.check_event_deadlines': {'queue': 'default'},
        'backend.tasks.auto_close_submissions': {'queue': 'default'},
        'backend.tasks.send_reminder_emails': {'queue': 'emails'},
        'backend.tasks.calculate_leaderboard': {'queue': 'default'},
        'backend.tasks.publish_leaderboard': {'queue': 'default'},
    },
)

# Configure Celery Beat schedule for background job execution
celery_app.conf.beat_schedule = {
    # Check event deadlines every minute
    'check-event-deadlines': {
        'task': 'backend.tasks.check_event_deadlines',
        'schedule': 60.0,  # Every 60 seconds
    },
    
    # Send reminder emails every 5 minutes
    'send-reminder-emails': {
        'task': 'backend.tasks.send_reminder_emails',
        'schedule': 300.0,  # Every 5 minutes
    },
    
    # Calculate leaderboard every 10 minutes (when evaluating phase)
    'calculate-leaderboard': {
        'task': 'backend.tasks.calculate_leaderboard_all',
        'schedule': 600.0,  # Every 10 minutes
    },
}

# Additional Celery configuration
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.worker_max_tasks_per_child = 1000
celery_app.conf.task_acks_late = True
