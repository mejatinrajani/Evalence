"""
Phase 3: Advanced Backend APIs - AI Scoring, Mentorship, Social, Reporting, Admin
Seamless integration with existing FastAPI backend
"""

from fastapi import APIRouter, HTTPException, Depends, Query, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import json
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import logging

# Import models
import sys
sys.path.append('/backend')
from models import User, Hackathon, Team, Evaluation, Criteria
from models_phase2 import RoundEnhanced
from models_phase3 import (
    AIScoringModel, ScoringPrediction, MentorshipRequest, MentorshipSession,
    TeamMessage, HackathonAnnouncement, UserConnection, GeneratedReport,
    ExportLog, AdminLog, ContentModerationFlag, UserPreferences,
    AchievementBadge, UserAchievement
)
from database import get_db
from security import get_current_user

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ==================== SCHEMAS ====================

class ScoringPredictionResponse(BaseModel):
    id: int
    team_id: int
    predicted_score: float
    confidence_level: float
    key_factors: dict

class MentorshipRequestCreate(BaseModel):
    mentee_id: int
    mentee_skills: List[str]
    message: Optional[str] = None

class MentorshipRequestResponse(BaseModel):
    id: int
    status: str
    mentee_id: int
    mentor_id: Optional[int] = None
    created_at: datetime

class TeamMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    category: str
    priority: str = "normal"

class ReportCreate(BaseModel):
    report_type: str
    title: str
    template_used: str

# ==================== ROUTERS ====================

# AI Scoring System APIs
ai_router = APIRouter(prefix="/api/ai", tags=["AI Scoring"])

@ai_router.post("/train-model/{hackathon_id}")
def train_scoring_model(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Train AI model on historical evaluations"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all evaluations for training
    evaluations = db.query(Evaluation).filter(
        Evaluation.hackathon_id == hackathon_id,
        Evaluation.total_score.isnot(None)
    ).all()
    
    if len(evaluations) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 evaluations to train")
    
    # Prepare training data
    X = []
    y = []
    for eval in evaluations:
        # Use criteria scores as features
        features = [
            eval.score1 or 0,
            eval.score2 or 0,
            eval.score3 or 0,
            eval.score4 or 0,
            eval.score5 or 0,
        ]
        X.append(features)
        y.append(eval.total_score)
    
    X = np.array(X)
    y = np.array(y)
    
    # Train Random Forest model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Calculate accuracy
    train_accuracy = model.score(X, y)
    
    # Store model
    ai_model = AIScoringModel(
        hackathon_id=hackathon_id,
        model_name=f"RF-v{hackathon_id}",
        model_version="1.0",
        algorithm="random_forest",
        training_samples=len(evaluations),
        accuracy_score=train_accuracy,
        feature_importance={
            "criteria_1": float(model.feature_importances_[0]),
            "criteria_2": float(model.feature_importances_[1]),
            "criteria_3": float(model.feature_importances_[2]),
            "criteria_4": float(model.feature_importances_[3]),
            "criteria_5": float(model.feature_importances_[4]),
        },
        is_trained=True,
        is_active=True,
        trained_at=datetime.utcnow()
    )
    db.add(ai_model)
    db.commit()
    
    return {
        "status": "trained",
        "model_name": ai_model.model_name,
        "accuracy": train_accuracy,
        "samples": len(evaluations)
    }

@ai_router.get("/predict/{team_id}")
def get_score_prediction(
    team_id: int,
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI score prediction for team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get trained model
    model = db.query(AIScoringModel).filter(
        AIScoringModel.hackathon_id == hackathon_id,
        AIScoringModel.is_active == True,
        AIScoringModel.is_trained == True
    ).first()
    
    if not model:
        raise HTTPException(status_code=400, detail="No trained model available")
    
    # Get current team scores
    evaluations = db.query(Evaluation).filter(
        Evaluation.team_id == team_id,
        Evaluation.hackathon_id == hackathon_id
    ).all()
    
    if not evaluations:
        raise HTTPException(status_code=400, detail="No evaluations yet for prediction")
    
    # Average current scores
    avg_scores = [
        np.mean([e.score1 for e in evaluations if e.score1]),
        np.mean([e.score2 for e in evaluations if e.score2]),
        np.mean([e.score3 for e in evaluations if e.score3]),
        np.mean([e.score4 for e in evaluations if e.score4]),
        np.mean([e.score5 for e in evaluations if e.score5]),
    ]
    
    # Make prediction (would use actual model in production)
    predicted_score = np.mean(avg_scores) * 1.1  # Simplified prediction
    confidence = min(len(evaluations) / 10, 1.0)  # Confidence based on sample size
    
    prediction = ScoringPrediction(
        hackathon_id=hackathon_id,
        team_id=team_id,
        predicted_score=predicted_score,
        confidence_level=confidence,
        key_factors={
            "current_average": float(np.mean(avg_scores)),
            "judges_evaluated": len(evaluations),
            "trend": "improving" if evaluations[-1].total_score > evaluations[0].total_score else "stable"
        }
    )
    db.add(prediction)
    db.commit()
    
    return {
        "team_id": team_id,
        "predicted_score": round(predicted_score, 2),
        "confidence": round(confidence, 2),
        "key_factors": prediction.key_factors
    }


# Mentorship System APIs
mentorship_router = APIRouter(prefix="/api/mentorship", tags=["Mentorship"])

@mentorship_router.post("/request")
def request_mentor(
    hackathon_id: int,
    request_data: MentorshipRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit mentorship request"""
    mentorship = MentorshipRequest(
        hackathon_id=hackathon_id,
        mentee_id=request_data.mentee_id,
        mentee_skills=request_data.mentee_skills,
        message=request_data.message
    )
    db.add(mentorship)
    db.commit()
    db.refresh(mentorship)
    
    return {"status": "request_submitted", "mentorship_id": mentorship.id}

@mentorship_router.get("/requests/{hackathon_id}")
def get_mentor_requests(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get mentorship requests (for mentors)"""
    requests = db.query(MentorshipRequest).filter(
        MentorshipRequest.hackathon_id == hackathon_id,
        MentorshipRequest.status == "pending"
    ).all()
    return requests

@mentorship_router.post("/{mentorship_id}/accept")
def accept_mentorship(
    mentorship_id: int,
    mentor_expertise: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept mentorship request"""
    mentorship = db.query(MentorshipRequest).filter(
        MentorshipRequest.id == mentorship_id
    ).first()
    
    if not mentorship:
        raise HTTPException(status_code=404, detail="Request not found")
    
    mentorship.mentor_id = current_user.id
    mentorship.mentor_expertise = mentor_expertise
    mentorship.status = "active"
    mentorship.accepted_at = datetime.utcnow()
    db.commit()
    
    return {"status": "accepted"}

@mentorship_router.post("/{mentorship_id}/session")
def log_mentorship_session(
    mentorship_id: int,
    session_topic: str,
    session_notes: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log mentorship session"""
    session = MentorshipSession(
        mentorship_id=mentorship_id,
        session_topic=session_topic,
        session_notes=session_notes,
        scheduled_time=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    
    return {"status": "session_logged", "session_id": session.id}


# Team Communication APIs
messaging_router = APIRouter(prefix="/api/messages", tags=["Messaging"])

@messaging_router.post("/{team_id}")
def send_team_message(
    team_id: int,
    message_data: TeamMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send message in team chat"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    message = TeamMessage(
        team_id=team_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        file_url=message_data.file_url
    )
    db.add(message)
    db.commit()
    
    return {"status": "sent", "message_id": message.id}

@messaging_router.get("/{team_id}")
def get_team_messages(
    team_id: int,
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Get team messages"""
    messages = db.query(TeamMessage).filter(
        TeamMessage.team_id == team_id
    ).offset(offset).limit(limit).all()
    return messages

@messaging_router.put("/{message_id}/pin")
def pin_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pin important message"""
    message = db.query(TeamMessage).filter(TeamMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404)
    
    message.is_pinned = True
    db.commit()
    return {"status": "pinned"}


# Announcements API
announcements_router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

@announcements_router.post("/{hackathon_id}")
def create_announcement(
    hackathon_id: int,
    announcement_data: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create hackathon announcement (organizer only)"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    announcement = HackathonAnnouncement(
        hackathon_id=hackathon_id,
        organizer_id=current_user.id,
        title=announcement_data.title,
        content=announcement_data.content,
        category=announcement_data.category,
        priority=announcement_data.priority
    )
    db.add(announcement)
    db.commit()
    
    return {"status": "created", "announcement_id": announcement.id}

@announcements_router.get("/{hackathon_id}")
def get_announcements(
    hackathon_id: int,
    db: Session = Depends(get_db)
):
    """Get all announcements"""
    announcements = db.query(HackathonAnnouncement).filter(
        HackathonAnnouncement.hackathon_id == hackathon_id,
        HackathonAnnouncement.is_published == True
    ).order_by(HackathonAnnouncement.published_at.desc()).all()
    return announcements


# Reporting & Export APIs
reporting_router = APIRouter(prefix="/api/reports", tags=["Reporting"])

@reporting_router.post("/{hackathon_id}")
def generate_report(
    hackathon_id: int,
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate team or hackathon report"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    report = GeneratedReport(
        hackathon_id=hackathon_id,
        organizer_id=current_user.id,
        report_type=report_data.report_type,
        title=report_data.title,
        template_used=report_data.template_used,
        report_data={"generated_at": datetime.utcnow().isoformat()}
    )
    db.add(report)
    db.commit()
    
    return {"status": "generated", "report_id": report.id}

@reporting_router.post("/export/{hackathon_id}")
def export_data(
    hackathon_id: int,
    export_type: str,
    export_format: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export hackathon data"""
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon or hackathon.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Track export in audit log
    export_log = ExportLog(
        hackathon_id=hackathon_id,
        user_id=current_user.id,
        export_type=export_type,
        export_format=export_format,
        file_url=f"/exports/hackathon_{hackathon_id}_{export_type}.{export_format}",
        file_size=1024,  # Placeholder
        record_count=100  # Placeholder
    )
    db.add(export_log)
    db.commit()
    
    return {
        "status": "exported",
        "file_url": export_log.file_url,
        "export_log_id": export_log.id
    }


# Admin APIs
admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])

@admin_router.get("/logs")
def get_admin_logs(
    current_user: User = Depends(get_current_user),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    """Get admin action logs (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    logs = db.query(AdminLog).order_by(
        AdminLog.created_at.desc()
    ).limit(limit).all()
    return logs

@admin_router.post("/log-action")
def log_admin_action(
    action_type: str,
    resource_type: str,
    resource_id: int,
    change_reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log admin action"""
    log = AdminLog(
        admin_id=current_user.id,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        change_reason=change_reason
    )
    db.add(log)
    db.commit()
    
    return {"status": "logged"}

@admin_router.post("/moderate-content")
def flag_content(
    hackathon_id: int,
    content_type: str,
    content_id: int,
    flag_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Flag content for moderation"""
    flag = ContentModerationFlag(
        hackathon_id=hackathon_id,
        content_type=content_type,
        content_id=content_id,
        flag_type=flag_type,
        reported_by=current_user.id
    )
    db.add(flag)
    db.commit()
    
    return {"status": "flagged", "flag_id": flag.id}

@admin_router.put("/moderate/{flag_id}")
def moderate_content(
    flag_id: int,
    status: str,
    review_notes: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Review flagged content"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    flag = db.query(ContentModerationFlag).filter(
        ContentModerationFlag.id == flag_id
    ).first()
    
    if not flag:
        raise HTTPException(status_code=404)
    
    flag.status = status
    flag.moderator_id = current_user.id
    flag.review_notes = review_notes
    flag.reviewed_at = datetime.utcnow()
    db.commit()
    
    return {"status": "reviewed"}


# User Preferences API
preferences_router = APIRouter(prefix="/api/preferences", tags=["Preferences"])

@preferences_router.get("/")
def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences"""
    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
        db.commit()
    
    return prefs

@preferences_router.put("/")
def update_preferences(
    theme_mode: Optional[str] = None,
    email_digest_frequency: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user preferences"""
    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
    
    if theme_mode:
        prefs.theme_mode = theme_mode
    if email_digest_frequency:
        prefs.email_digest_frequency = email_digest_frequency
    
    db.commit()
    return {"status": "updated"}


# ==================== EXPORTS ====================

__all__ = [
    'ai_router',
    'mentorship_router',
    'messaging_router',
    'announcements_router',
    'reporting_router',
    'admin_router',
    'preferences_router',
]
