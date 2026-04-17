"""
Phase 1: Background Tasks for Event Lifecycle Automation

Handles:
1. Automatic phase transitions (registration -> submission -> evaluating -> results_published)
2. Submission deadline enforcement (locking submissions)
3. Reminder emails (24h, 1h before deadlines)
4. Leaderboard calculation (Z-scores, anomaly detection)
5. Leaderboard publishing
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import json
import numpy as np
from celery_config import celery_app
from database import SessionLocal
from models import (
    Hackathon, Team, Project, Evaluation, EvaluationScore,
    TaskLog, Leaderboard, LeaderboardEntry, AdminLog
)
from models import Criteria as CriteriaModel
from sqlalchemy import func

logger = logging.getLogger(__name__)


def log_task_execution(task_name: str, hackathon_id: int = None, status: str = "success", 
                       error_msg: str = None, output: Dict = None, duration: float = None):
    """Helper to log task execution for debugging"""
    db = SessionLocal()
    try:
        task_log = TaskLog(
            task_name=task_name,
            hackathon_id=hackathon_id,
            status=status,
            error_message=error_msg,
            executed_at=datetime.utcnow(),
            duration_seconds=duration,
            task_output=output
        )
        db.add(task_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log task: {e}")
    finally:
        db.close()


# ============================================================
# TASK 1: Check Event Deadlines & Auto-Transition Phases
# ============================================================

@celery_app.task(name='backend.tasks.check_event_deadlines', bind=True)
def check_event_deadlines(self):
    """
    Automatically transition hackathon phases when deadlines pass.
    
    Flow:
    draft -> registration_open (at registration_start)
    registration_open -> submission (at registration_end)
    submission -> evaluating (at submission_end)
    evaluating -> results_published (at evaluation_end)
    """
    db = SessionLocal()
    start_time = datetime.utcnow()
    changes_made = 0
    
    try:
        now = datetime.utcnow()
        logger.info(f"[TASK] check_event_deadlines starting at {now}")
        
        # Find all hackathons that might need phase transitions
        hackathons = db.query(Hackathon).filter(
            Hackathon.auto_transition_enabled == True,
            Hackathon.status.in_(['draft', 'registration_open', 'submission', 'evaluating'])
        ).all()
        
        logger.info(f"Found {len(hackathons)} hackathons to check")
        
        for hackathon in hackathons:
            old_status = hackathon.status
            
            # Registration opens
            if (hackathon.status == 'draft' and 
                hackathon.registration_start and 
                now >= hackathon.registration_start):
                hackathon.status = 'registration_open'
                hackathon.status_last_changed = now
                changes_made += 1
                logger.info(f"Hackathon {hackathon.id}: {old_status} -> registration_open")
            
            # Registration closes, submission opens
            elif (hackathon.status == 'registration_open' and 
                  hackathon.registration_end and 
                  now >= hackathon.registration_end):
                hackathon.status = 'submission'
                hackathon.status_last_changed = now
                changes_made += 1
                logger.info(f"Hackathon {hackathon.id}: {old_status} -> submission")
            
            # Submission closes, evaluation opens
            elif (hackathon.status == 'submission' and 
                  hackathon.submission_end and 
                  now >= hackathon.submission_end):
                # Auto-lock all open submissions
                auto_close_submissions.delay(hackathon.id)
                hackathon.status = 'evaluating'
                hackathon.status_last_changed = now
                changes_made += 1
                logger.info(f"Hackathon {hackathon.id}: {old_status} -> evaluating")
            
            # Evaluation closes, results published
            elif (hackathon.status == 'evaluating' and 
                  hackathon.evaluation_end and 
                  now >= hackathon.evaluation_end):
                # Calculate and publish leaderboard
                calculate_leaderboard.delay(hackathon.id)
                publish_leaderboard.delay(hackathon.id)
                hackathon.status = 'results_published'
                hackathon.status_last_changed = now
                changes_made += 1
                logger.info(f"Hackathon {hackathon.id}: {old_status} -> results_published")
        
        db.commit()
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        result = {
            "checked": len(hackathons),
            "transitions": changes_made,
            "status": "success"
        }
        
        log_task_execution(
            "check_event_deadlines", 
            status="success", 
            output=result, 
            duration=duration
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking deadlines: {e}", exc_info=True)
        duration = (datetime.utcnow() - start_time).total_seconds()
        log_task_execution(
            "check_event_deadlines",
            status="failed",
            error_msg=str(e),
            duration=duration
        )
        raise
    finally:
        db.close()


# ============================================================
# TASK 2: Auto-Close Submissions at Deadline
# ============================================================

@celery_app.task(name='backend.tasks.auto_close_submissions', bind=True)
def auto_close_submissions(self, hackathon_id: int):
    """
    Lock all open submissions when deadline passes.
    Prevents late submissions from being registered.
    """
    db = SessionLocal()
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"[TASK] auto_close_submissions for hackathon {hackathon_id}")
        
        # Find all open projects for this hackathon
        projects = db.query(Project).filter(
            Project.hackathon_id == hackathon_id,
            Project.submission_status.in_(['draft', 'submitted'])
        ).all()
        
        locked_count = 0
        for project in projects:
            project.submission_status = 'locked'
            project.locked_at = datetime.utcnow()
            locked_count += 1
            logger.debug(f"Locked project {project.id}")
        
        db.commit()
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        result = {"locked_count": locked_count, "hackathon_id": hackathon_id}
        
        log_task_execution(
            "auto_close_submissions",
            hackathon_id=hackathon_id,
            status="success",
            output=result,
            duration=duration
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error closing submissions: {e}", exc_info=True)
        duration = (datetime.utcnow() - start_time).total_seconds()
        log_task_execution(
            "auto_close_submissions",
            hackathon_id=hackathon_id,
            status="failed",
            error_msg=str(e),
            duration=duration
        )
        raise
    finally:
        db.close()


# ============================================================
# TASK 3: Send Deadline Reminder Emails
# ============================================================

@celery_app.task(name='backend.tasks.send_reminder_emails', bind=True)
def send_reminder_emails(self):
    """
    Send reminder emails 24 hours and 1 hour before deadlines.
    - Registration deadline reminder
    - Submission deadline reminder
    - Evaluation deadline reminder
    """
    db = SessionLocal()
    now = datetime.utcnow()
    emails_sent = 0
    
    try:
        logger.info(f"[TASK] send_reminder_emails at {now}")
        
        # Look for hackathons with upcoming deadlines
        one_hour_future = now + timedelta(hours=1)
        one_day_future = now + timedelta(hours=24)
        
        # Check registration deadlines
        registration_1h = db.query(Hackathon).filter(
            Hackathon.registration_end <= one_hour_future,
            Hackathon.registration_end > now,
            Hackathon.status == 'registration_open'
        ).all()
        
        registration_24h = db.query(Hackathon).filter(
            Hackathon.registration_end <= one_day_future,
            Hackathon.registration_end > one_hour_future,
            Hackathon.status == 'registration_open'
        ).all()
        
        # Check submission deadlines
        submission_1h = db.query(Hackathon).filter(
            Hackathon.submission_end <= one_hour_future,
            Hackathon.submission_end > now,
            Hackathon.status == 'submission'
        ).all()
        
        submission_24h = db.query(Hackathon).filter(
            Hackathon.submission_end <= one_day_future,
            Hackathon.submission_end > one_hour_future,
            Hackathon.status == 'submission'
        ).all()
        
        logger.info(f"Found reminders: registration(1h)={len(registration_1h)}, "
                   f"registration(24h)={len(registration_24h)}, "
                   f"submission(1h)={len(submission_1h)}, "
                   f"submission(24h)={len(submission_24h)}")
        
        # In real implementation, would send emails here
        # For now, just logging
        emails_to_send = len(registration_1h) + len(registration_24h) + \
                        len(submission_1h) + len(submission_24h)
        
        result = {
            "registration_1h_reminders": len(registration_1h),
            "registration_24h_reminders": len(registration_24h),
            "submission_1h_reminders": len(submission_1h),
            "submission_24h_reminders": len(submission_24h),
            "total_reminders": emails_to_send
        }
        
        log_task_execution(
            "send_reminder_emails",
            status="success",
            output=result
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error sending reminder emails: {e}", exc_info=True)
        log_task_execution(
            "send_reminder_emails",
            status="failed",
            error_msg=str(e)
        )
        raise
    finally:
        db.close()


# ============================================================
# TASK 4: Calculate Leaderboard with Z-Score Normalization
# ============================================================

@celery_app.task(name='backend.tasks.calculate_leaderboard', bind=True)
def calculate_leaderboard(self, hackathon_id: int):
    """
    Calculate leaderboard for a hackathon.
    
    Algorithm:
    1. Get all completed evaluations
    2. Calculate average score per team
    3. Calculate population mean and std dev
    4. Calculate Z-scores for normalization
    5. Detect anomalies (|z-score| > 3)
    6. Generate rankings
    7. Store in database
    """
    db = SessionLocal()
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"[TASK] calculate_leaderboard for hackathon {hackathon_id}")
        
        hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
        if not hackathon:
            raise ValueError(f"Hackathon {hackathon_id} not found")
        
        if hackathon.status not in ['evaluating', 'results_published']:
            logger.warning(f"Leaderboard calculation skipped: hackathon in {hackathon.status} state")
            return {"status": "skipped", "reason": f"hackathon in {hackathon.status} state"}
        
        # Get all teams
        teams = db.query(Team).filter(Team.hackathon_id == hackathon_id).all()
        if not teams:
            logger.warning(f"No teams found for hackathon {hackathon_id}")
            return {"status": "skipped", "reason": "no teams"}
        
        # Collect scores per team
        team_scores = {}  # {team_id: [scores]}
        
        for team in teams:
            evaluations = db.query(Evaluation).filter(
                Evaluation.team_id == team.id,
                Evaluation.hackathon_id == hackathon_id,
                Evaluation.is_finalized == True
            ).all()
            
            scores = []
            for eval in evaluations:
                if eval.score is not None:
                    scores.append(eval.score)
            
            if scores:
                team_scores[team.id] = scores
        
        if not team_scores:
            logger.warning(f"No completed evaluations for hackathon {hackathon_id}")
            return {"status": "skipped", "reason": "no completed evaluations"}
        
        # Calculate statistics
        team_stats = {}
        all_scores = []
        
        for team_id, scores in team_scores.items():
            avg_score = float(np.mean(scores))
            std_dev = float(np.std(scores))
            team_stats[team_id] = {
                "team_id": team_id,
                "average_score": avg_score,
                "std_dev": std_dev,
                "evaluation_count": len(scores),
                "scores": scores  # Store individual scores for anomaly detection
            }
            all_scores.extend(scores)
        
        # Calculate population statistics
        global_mean = float(np.mean(all_scores))
        global_std = float(np.std(all_scores))
        
        logger.info(f"Population stats: mean={global_mean:.2f}, std={global_std:.2f}")
        
        # Calculate Z-scores and detect anomalies
        for team_id, stats in team_stats.items():
            if global_std > 0:
                z_score = (stats["average_score"] - global_mean) / global_std
            else:
                z_score = 0.0
            
            stats["z_score"] = z_score
            
            # Anomaly: Z-score outside ±3 σ (99.7% confidence)
            stats["anomaly_flagged"] = abs(z_score) > 3.0
            if stats["anomaly_flagged"]:
                stats["anomaly_reason"] = f"Z-score {z_score:.2f} is > 3 standard deviations"
                logger.warning(f"Anomaly detected for team {team_id}: Z={z_score:.2f}")
        
        # Sort by average score (descending)
        ranked_teams = sorted(
            team_stats.items(),
            key=lambda x: x[1]["average_score"],
            reverse=True
        )
        
        # Create leaderboard entry
        leaderboard = Leaderboard(
            hackathon_id=hackathon_id,
            total_teams=len(ranked_teams),
            global_mean=global_mean,
            global_std=global_std,
            is_published=False
        )
        db.add(leaderboard)
        db.flush()
        
        # Create leaderboard entries for each team
        for rank, (team_id, stats) in enumerate(ranked_teams, 1):
            entry = LeaderboardEntry(
                leaderboard_id=leaderboard.id,
                team_id=team_id,
                rank=rank,
                score=stats["average_score"],
                z_score=stats["z_score"],
                std_dev=stats["std_dev"],
                evaluation_count=stats["evaluation_count"],
                anomaly_flagged=stats["anomaly_flagged"],
                anomaly_reason=stats.get("anomaly_reason")
            )
            db.add(entry)
        
        # Store data snapshot
        leaderboard.data_snapshot = json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "ranked_teams": [
                {
                    "rank": rank,
                    "team_id": team_id,
                    "score": stats["average_score"],
                    "z_score": stats["z_score"],
                    "evaluation_count": stats["evaluation_count"],
                    "anomaly": stats["anomaly_flagged"]
                }
                for rank, (team_id, stats) in enumerate(ranked_teams, 1)
            ]
        })
        
        db.commit()
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        result = {
            "status": "success",
            "leaderboard_id": leaderboard.id,
            "teams_ranked": len(ranked_teams),
            "anomalies_detected": sum(1 for s in team_stats.values() if s.get("anomaly_flagged")),
            "global_mean": round(global_mean, 2),
            "global_std": round(global_std, 2)
        }
        
        log_task_execution(
            "calculate_leaderboard",
            hackathon_id=hackathon_id,
            status="success",
            output=result,
            duration=duration
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating leaderboard: {e}", exc_info=True)
        duration = (datetime.utcnow() - start_time).total_seconds()
        log_task_execution(
            "calculate_leaderboard",
            hackathon_id=hackathon_id,
            status="failed",
            error_msg=str(e),
            duration=duration
        )
        raise
    finally:
        db.close()


# ============================================================
# TASK 5: Publish Leaderboard to Participants
# ============================================================

@celery_app.task(name='backend.tasks.publish_leaderboard', bind=True)
def publish_leaderboard(self, hackathon_id: int):
    """
    Publish latest leaderboard to participants.
    Notifies teams of their ranking.
    """
    db = SessionLocal()
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"[TASK] publish_leaderboard for hackathon {hackathon_id}")
        
        # Get latest leaderboard
        leaderboard = db.query(Leaderboard).filter(
            Leaderboard.hackathon_id == hackathon_id
        ).order_by(Leaderboard.calculation_timestamp.desc()).first()
        
        if not leaderboard:
            logger.warning(f"No leaderboard found for hackathon {hackathon_id}")
            return {"status": "skipped", "reason": "no leaderboard calculated"}
        
        # Mark as published
        leaderboard.is_published = True
        leaderboard.published_at = datetime.utcnow()
        
        # Get all teams to notify
        teams = db.query(Team).filter(Team.hackathon_id == hackathon_id).all()
        
        # In real implementation, would send notifications here
        logger.info(f"Publishing leaderboard: {len(teams)} teams to notify")
        
        db.commit()
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        result = {
            "status": "published",
            "leaderboard_id": leaderboard.id,
            "teams_notified": len(teams)
        }
        
        log_task_execution(
            "publish_leaderboard",
            hackathon_id=hackathon_id,
            status="success",
            output=result,
            duration=duration
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error publishing leaderboard: {e}", exc_info=True)
        duration = (datetime.utcnow() - start_time).total_seconds()
        log_task_execution(
            "publish_leaderboard",
            hackathon_id=hackathon_id,
            status="failed",
            error_msg=str(e),
            duration=duration
        )
        raise
    finally:
        db.close()


# ============================================================
# CONVENIENCE TASK: Calculate all hackathon leaderboards
# ============================================================

@celery_app.task(name='backend.tasks.calculate_leaderboard_all', bind=True)
def calculate_leaderboard_all(self):
    """Run leaderboard calculation for all evaluating hackathons"""
    db = SessionLocal()
    
    try:
        hackathons = db.query(Hackathon).filter(
            Hackathon.status == 'evaluating'
        ).all()
        
        for hackathon in hackathons:
            calculate_leaderboard.delay(hackathon.id)
        
        return {"hackathons_queued": len(hackathons)}
        
    except Exception as e:
        logger.error(f"Error in calculate_leaderboard_all: {e}")
        raise
    finally:
        db.close()
