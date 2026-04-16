"""
Phase 2: Advanced Models for Multi-Round Tournaments, Appeals, Permissions
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey, Enum, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base, engine, get_db

# ==================== MULTI-ROUND SYSTEM ====================

class RoundStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    EVALUATION = "evaluation"
    CLOSED = "closed"
    ARCHIVED = "archived"

class RoundEnhanced(Base):
    """Enhanced Round model with tournament features"""
    __tablename__ = "rounds_enhanced"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    name = Column(String(255), index=True)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=1)  # Round sequence (1, 2, 3...)
    status = Column(String(50), default=RoundStatus.SCHEDULED.value)
    
    # Tournament structure
    bracket_type = Column(String(50), default="single_elimination")  # single, double, round_robin
    min_teams_advance = Column(Integer, default=1)
    max_teams_advance = Column(Integer, default=999)
    
    # Evaluation mode
    is_blind_evaluation = Column(Boolean, default=False)  # Judge can't see team name
    is_anonymous_feedback = Column(Boolean, default=False)  # Judges anonymous
    
    # Scheduling
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    evaluation_deadline = Column(DateTime, nullable=True)
    
    # Scores
    min_score = Column(Float, default=0.0)
    max_score = Column(Float, default=100.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon", back_populates="rounds_enhanced")
    criteria = relationship("Criteria", back_populates="round")
    team_assignments = relationship("RoundTeamAssignment", back_populates="round")
    
    def __repr__(self):
        return f"<RoundEnhanced {self.name}>"


class RoundTeamAssignment(Base):
    """Track which teams participate in which rounds"""
    __tablename__ = "round_team_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds_enhanced.id"), index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True)
    status = Column(String(50), default="participating")  # participating, eliminated, advanced, winner
    seed = Column(Integer, nullable=True)  # Tournament seeding
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    round = relationship("RoundEnhanced", back_populates="team_assignments")
    team = relationship("Team")


# ==================== APPEAL SYSTEM ====================

class AppealStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    RESOLVED = "resolved"

class Appeal(Base):
    """Hackathon appeal/complaint system"""
    __tablename__ = "appeals"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True)
    round_id = Column(Integer, ForeignKey("rounds_enhanced.id"), nullable=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=True)
    
    # Appeal details
    appeal_type = Column(String(50))  # score_dispute, judge_bias, technical_issue, rule_violation
    title = Column(String(255))
    description = Column(Text)
    evidence_url = Column(String(500), nullable=True)  # Link to supporting evidence
    
    status = Column(String(50), default=AppealStatus.SUBMITTED.value)
    
    # Review process
    submitted_by_id = Column(Integer, ForeignKey("users.id"))
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution = Column(Text, nullable=True)
    
    # Results
    score_adjustment = Column(Float, default=0.0)
    other_action = Column(String(250), nullable=True)
    
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    hackathon = relationship("Hackathon")
    team = relationship("Team")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by_id])
    
    def __repr__(self):
        return f"<Appeal {self.id} - {self.status}>"


# ==================== PERMISSIONS SYSTEM ====================

class JudgePermissionRequest(Base):
    """Request for elevated judge permissions"""
    __tablename__ = "judge_permission_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    judge_id = Column(Integer, ForeignKey("users.id"), index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    permission_type = Column(String(50))  # view_all_scores, re_evaluate, override_blind
    
    status = Column(String(50), default="pending")  # pending, approved, denied
    reason = Column(Text)
    organizer_response = Column(Text, nullable=True)
    
    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    judge = relationship("User", foreign_keys=[judge_id])
    organizer = relationship("User", foreign_keys=[approved_by])


# ==================== NOTIFICATIONS ====================

class NotificationType(str, enum.Enum):
    EVALUATION_SUBMITTED = "evaluation_submitted"
    TEAM_ADVANCED = "team_advanced"
    LEADERBOARD_UPDATED = "leaderboard_updated"
    JUDGE_ASSIGNED = "judge_assigned"
    APPEAL_STATUS_CHANGED = "appeal_status_changed"
    ROUND_STARTED = "round_started"
    ROUND_ENDING_SOON = "round_ending_soon"
    PERMISSION_GRANTED = "permission_granted"
    MESSAGE_RECEIVED = "message_received"

class Notification(Base):
    """Real-time notifications for all users"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    notification_type = Column(String(50))
    title = Column(String(255))
    message = Column(Text)
    
    # Context
    hackathon_id = Column(Integer, nullable=True)
    related_id = Column(Integer, nullable=True)  # evaluation_id, appeal_id, etc.
    
    # Status
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    
    # Delivery
    should_email = Column(Boolean, default=True)
    should_notify = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<Notification {self.id}>"


# ==================== ANALYTICS & INSIGHTS ====================

class ScoringAnalytic(Base):
    """Analytics for scoring patterns"""
    __tablename__ = "scoring_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    round_id = Column(Integer, ForeignKey("rounds_enhanced.id"), nullable=True)
    
    # Aggregate data
    total_evaluations = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    std_deviation = Column(Float, default=0.0)
    
    # Judge analysis
    judge_count = Column(Integer, default=0)
    judge_bias_detected = Column(Boolean, default=False)
    
    # Score distribution
    score_distribution = Column(JSON)  # {"0-20": 5, "20-40": 10, ...}
    
    # Team performance
    top_team_id = Column(Integer, nullable=True)
    bottom_team_id = Column(Integer, nullable=True)
    
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")


class JudgeBiasAnalysis(Base):
    """Detect judge scoring patterns/biases"""
    __tablename__ = "judge_bias_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    judge_id = Column(Integer, ForeignKey("users.id"), index=True)
    round_id = Column(Integer, ForeignKey("rounds_enhanced.id"), nullable=True)
    
    # Scoring pattern
    average_score_given = Column(Float)
    score_variance = Column(Float)
    bias_type = Column(String(50), nullable=True)  # lenient, harsh, consistent, inconsistent
    
    # Comparison to other judges
    vs_average_deviation = Column(Float)  # How different from average judge
    statistical_significance = Column(Float)  # 0.0-1.0
    
    # Flags
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(250), nullable=True)
    
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")
    judge = relationship("User")


# ==================== AI SCORING FEATURES ====================

class ScoringAnomalies(Base):
    """Detect unusual scoring patterns"""
    __tablename__ = "scoring_anomalies"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"))
    
    # Anomaly details
    anomaly_type = Column(String(50))  # outlier, inconsistent, suspicious
    severity = Column(Integer, default=1)  # 1-5 scale
    description = Column(Text)
    
    similar_scores = Column(JSON)  # Scores that should be similar
    z_score = Column(Float)  # Statistical z-score
    
    is_investigated = Column(Boolean, default=False)
    investigation_result = Column(String(50), nullable=True)  # false_alarm, confirmed, resolved
    
    detected_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")
    evaluation = relationship("Evaluation")


# Create all tables
if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("✅ Phase 2 models created successfully!")
