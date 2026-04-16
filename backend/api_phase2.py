"""
Phase 2: Enhanced Backend APIs - Multi-Round, Appeals, Notifications, Analytics
Seamless integration with existing FastAPI backend
"""

from fastapi import APIRouter, HTTPException, Depends, Query, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import json
import numpy as np
from collections import defaultdict

# Import existing models
import sys
sys.path.append('/backend')
from models import User, Hackathon, Team, Evaluation, Criteria
from models_phase2 import (
    RoundEnhanced, RoundTeamAssignment, Appeal, AppealStatus,
    Notification, NotificationType, ScoringAnalytic, JudgeBiasAnalysis,
    JudgeBiasAnalysis, ScoringAnomalies
)
from database import get_db
from security import get_current_user

from schemas import BaseSchema
from pydantic import BaseModel

# ==================== SCHEMAS ====================

class RoundEnhancedCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order: int
    bracket_type: str = "single_elimination"
    is_blind_evaluation: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    evaluation_deadline: Optional[datetime] = None
    min_score: float = 0.0
    max_score: float = 100.0

class RoundEnhancedResponse(RoundEnhancedCreate):
    id: int
    hackathon_id: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class AppealCreate(BaseModel):
    team_id: int
    appeal_type: str  # score_dispute, judge_bias, technical_issue, rule_violation
    title: str
    description: str
    evidence_url: Optional[str] = None

class AppealResponse(BaseModel):
    id: int
    status: str
    title: str
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ==================== ROUTERS ====================

# Multi-Round Tournament APIs
rounds_router = APIRouter(prefix="/api/rounds", tags=["Rounds"])

@rounds_router.post("/", response_model=RoundEnhancedResponse)
def create_round(
    hackathon_id: int,
    round_data: RoundEnhancedCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new tournament round"""
    # Verify organizer permission
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_round = RoundEnhanced(
        hackathon_id=hackathon_id,
        **round_data.dict()
    )
    db.add(new_round)
    db.commit()
    db.refresh(new_round)
    return new_round

@rounds_router.get("/{hackathon_id}", response_model=List[RoundEnhancedResponse])
def get_hackathon_rounds(
    hackathon_id: int,
    db: Session = Depends(get_db)
):
    """Get all rounds for a hackathon"""
    rounds = db.query(RoundEnhanced).filter(
        RoundEnhanced.hackathon_id == hackathon_id
    ).order_by(RoundEnhanced.order).all()
    return rounds

@rounds_router.put("/{round_id}/status")
def update_round_status(
    round_id: int,
    new_status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update round status (scheduled → active → evaluation → closed)"""
    round_obj = db.query(RoundEnhanced).filter(RoundEnhanced.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Verify permission
    if round_obj.hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    round_obj.status = new_status
    round_obj.updated_at = datetime.utcnow()
    db.commit()
    
    # Trigger notification
    if new_status == "active":
        notify_users(
            db, round_obj.hackathon_id,
            NotificationType.ROUND_STARTED,
            f"Round '{round_obj.name}' has started!",
            f"Evaluation for {round_obj.name} is now live"
        )
    
    return {"status": "updated", "round_id": round_id, "new_status": new_status}

@rounds_router.post("/{round_id}/advance-teams")
def advance_teams_to_next_round(
    round_id: int,
    team_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Advance teams to next round (tournament progression)"""
    round_obj = db.query(RoundEnhanced).filter(RoundEnhanced.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Verify permission
    if round_obj.hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get next round
    next_round = db.query(RoundEnhanced).filter(
        RoundEnhanced.hackathon_id == round_obj.hackathon_id,
        RoundEnhanced.order == round_obj.order + 1
    ).first()
    
    if not next_round:
        raise HTTPException(status_code=400, detail="No next round exists")
    
    # Update team statuses
    for team_id in team_ids:
        # Mark team as advanced in current round
        assignment = db.query(RoundTeamAssignment).filter(
            RoundTeamAssignment.round_id == round_id,
            RoundTeamAssignment.team_id == team_id
        ).first()
        if assignment:
            assignment.status = "advanced"
        
        # Add team to next round
        next_assignment = RoundTeamAssignment(
            round_id=next_round.id,
            team_id=team_id,
            status="participating"
        )
        db.add(next_assignment)
        
        # Notify team
        team = db.query(Team).filter(Team.id == team_id).first()
        if team and team.lead_id:
            notify_user(
                db, team.lead_id,
                NotificationType.TEAM_ADVANCED,
                "🎉 Congratulations!",
                f"Your team has advanced to {next_round.name}!"
            )
    
    db.commit()
    return {"advanced": len(team_ids), "to_round": next_round.name}


# Appeal System APIs
appeals_router = APIRouter(prefix="/api/appeals", tags=["Appeals"])

@appeals_router.post("/", response_model=AppealResponse)
def submit_appeal(
    hackathon_id: int,
    appeal_data: AppealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an appeal against scoring or process"""
    team = db.query(Team).filter(Team.id == appeal_data.team_id).first()
    if not team or team.lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only appeal for your team")
    
    appeal = Appeal(
        hackathon_id=hackathon_id,
        team_id=appeal_data.team_id,
        appeal_type=appeal_data.appeal_type,
        title=appeal_data.title,
        description=appeal_data.description,
        evidence_url=appeal_data.evidence_url,
        submitted_by_id=current_user.id
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    
    # Notify organizer
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    notify_user(
        db, hackathon.organizer_id,
        NotificationType.APPEAL_STATUS_CHANGED,
        f"New Appeal: {appeal_data.title}",
        f"Team {team.name} has submitted an appeal"
    )
    
    return appeal

@appeals_router.get("/{hackathon_id}")
def get_appeals(
    hackathon_id: int,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get appeals for a hackathon (organizer only)"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(Appeal).filter(Appeal.hackathon_id == hackathon_id)
    if status:
        query = query.filter(Appeal.status == status)
    
    return query.all()

@appeals_router.put("/{appeal_id}/review")
def review_appeal(
    appeal_id: int,
    new_status: str,
    resolution: str,
    score_adjustment: float = 0.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Review and resolve an appeal"""
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    hackathon = db.query(Hackathon).filter(Hackathon.id == appeal.hackathon_id).first()
    if hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    appeal.status = new_status
    appeal.reviewed_by_id = current_user.id
    appeal.reviewed_at = datetime.utcnow()
    appeal.resolution = resolution
    appeal.score_adjustment = score_adjustment
    appeal.resolved_at = datetime.utcnow()
    
    db.commit()
    
    # Notify team
    notify_user(
        db, appeal.submitted_by_id,
        NotificationType.APPEAL_STATUS_CHANGED,
        "Appeal Resolved",
        f"Your appeal has been {new_status}: {resolution}"
    )
    
    return {"status": "updated", "appeal_id": appeal_id}


# Notifications APIs
notifications_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@notifications_router.get("/", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    unread_only: bool = Query(False),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Get notifications for current user"""
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_archived == False
    ).order_by(Notification.created_at.desc())
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    return query.limit(limit).all()

@notifications_router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"status": "read"}

@notifications_router.put("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    return {"status": "all marked read"}


# Analytics APIs
analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@analytics_router.get("/{hackathon_id}/scoring-summary")
def get_scoring_analytics(
    hackathon_id: int,
    round_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive scoring analytics"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(Evaluation).filter(Evaluation.hackathon_id == hackathon_id)
    if round_id:
        query = query.filter(Evaluation.round_id == round_id)
    
    evaluations = query.all()
    
    if not evaluations:
        return {
            "total_evaluations": 0,
            "average_score": 0.0,
            "std_deviation": 0.0,
            "judge_count": 0,
            "score_distribution": {}
        }
    
    scores = np.array([e.total_score for e in evaluations if e.total_score])
    
    # Score distribution
    bins = {
        "0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0
    }
    for score in scores:
        if score < 20: bins["0-20"] += 1
        elif score < 40: bins["20-40"] += 1
        elif score < 60: bins["40-60"] += 1
        elif score < 80: bins["60-80"] += 1
        else: bins["80-100"] += 1
    
    # Judge diversity
    judges = set(e.judge_id for e in evaluations)
    
    return {
        "total_evaluations": len(evaluations),
        "average_score": float(np.mean(scores)) if scores.size > 0 else 0.0,
        "std_deviation": float(np.std(scores)) if scores.size > 0 else 0.0,
        "min_score": float(np.min(scores)) if scores.size > 0 else 0.0,
        "max_score": float(np.max(scores)) if scores.size > 0 else 0.0,
        "judge_count": len(judges),
        "score_distribution": bins,
        "teams_evaluated": len(set(e.team_id for e in evaluations))
    }

@analytics_router.get("/{hackathon_id}/judge-performance")
def get_judge_performance(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze judge scoring patterns for bias detection"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    evaluations = db.query(Evaluation).filter(
        Evaluation.hackathon_id == hackathon_id
    ).all()
    
    # Group by judge
    judge_scores = defaultdict(list)
    for e in evaluations:
        if e.total_score:
            judge_scores[e.judge_id].append(e.total_score)
    
    general_average = np.mean([s for scores in judge_scores.values() for s in scores])
    
    judge_analysis = []
    for judge_id, scores in judge_scores.items():
        judge = db.query(User).filter(User.id == judge_id).first()
        avg = np.mean(scores)
        deviation = avg - general_average
        
        # Determine bias type
        bias_type = None
        if abs(deviation) > 10:
            bias_type = "lenient" if deviation > 0 else "harsh"
        elif np.std(scores) > 20:
            bias_type = "inconsistent"
        
        judge_analysis.append({
            "judge_id": judge_id,
            "judge_name": judge.full_name if judge else "Unknown",
            "average_score": float(avg),
            "score_count": len(scores),
            "deviation_from_average": float(deviation),
            "bias_type": bias_type,
            "flag_status": "flagged" if bias_type else "normal"
        })
    
    return sorted(judge_analysis, key=lambda x: abs(x["deviation_from_average"]), reverse=True)


# ==================== HELPER FUNCTIONS ====================

def notify_user(db: Session, user_id: int, notif_type: NotificationType, title: str, message: str):
    """Helper function to create notification"""
    notif = Notification(
        user_id=user_id,
        notification_type=notif_type.value,
        title=title,
        message=message
    )
    db.add(notif)
    db.commit()
    return notif

def notify_users(db: Session, hackathon_id: int, notif_type: NotificationType, title: str, message: str):
    """Helper function to notify all users in hackathon"""
    # Get all users associated with hackathon
    from sqlalchemy import or_
    users = db.query(User).join(Team).filter(
        Team.hackathon_id == hackathon_id
    ).distinct().all()
    
    for user in users:
        notify_user(db, user.id, notif_type, title, message)


# ==================== EXPORTS ====================

__all__ = [
    'rounds_router',
    'appeals_router',
    'notifications_router',
    'analytics_router',
]
