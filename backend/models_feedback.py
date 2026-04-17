"""
Phase 3: Judge Feedback & Rating Models
Enables judges to provide detailed feedback on teams
"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.database import Base


class FeedbackType(str, enum.Enum):
    """Types of feedback judges can provide"""
    POSITIVE = "positive"
    CONSTRUCTIVE = "constructive"
    CRITICAL = "critical"
    NEUTRAL = "neutral"


class JudgeFeedback(Base):
    """Detailed feedback from judges to teams"""
    __tablename__ = "judge_feedback"

    id = Column(Integer, primary_key=True)
    hackathon_id = Column(Integer, ForeignKey("hackathon.id"), nullable=False)
    judge_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("team.id"), nullable=False)
    
    # Feedback content
    feedback_text = Column(Text, nullable=False)
    feedback_type = Column(SQLEnum(FeedbackType), default=FeedbackType.NEUTRAL)
    
    # Ratings
    innovation_rating = Column(Float, nullable=False)  # 1-10
    execution_rating = Column(Float, nullable=False)   # 1-10
    presentation_rating = Column(Float, nullable=False)  # 1-10
    market_potential_rating = Column(Float, nullable=False)  # 1-10
    
    # Detailed scores
    code_quality_score = Column(Float, nullable=True)
    ui_ux_score = Column(Float, nullable=True)
    scalability_score = Column(Float, nullable=True)
    documentation_score = Column(Float, nullable=True)
    
    # Meta
    is_public = Column(Boolean, default=False)
    private_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    judge = relationship("User", foreign_keys=[judge_id])
    team = relationship("Team", foreign_keys=[team_id])
    hackathon = relationship("Hackathon", foreign_keys=[hackathon_id])


class FeedbackTag(Base):
    """Tags for categorizing feedback"""
    __tablename__ = "feedback_tag"

    id = Column(Integer, primary_key=True)
    feedback_id = Column(Integer, ForeignKey("judge_feedback.id"), nullable=False)
    tag = Column(String(50), nullable=False)  # e.g., "needs-polish", "great-idea", "incomplete"
    
    # Relationships
    feedback = relationship("JudgeFeedback")


class TeamResponse(Base):
    """Team response to judge feedback"""
    __tablename__ = "team_response"

    id = Column(Integer, primary_key=True)
    feedback_id = Column(Integer, ForeignKey("judge_feedback.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("team.id"), nullable=False)
    
    response_text = Column(Text, nullable=False)
    response_type = Column(String(20))  # "acknowledgment", "rebuttal", "thank_you"
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    feedback = relationship("JudgeFeedback")
    team = relationship("Team")


class JudgeRating(Base):
    """Ratings of judges by teams (for judge quality assessment)"""
    __tablename__ = "judge_rating"

    id = Column(Integer, primary_key=True)
    hackathon_id = Column(Integer, ForeignKey("hackathon.id"), nullable=False)
    judge_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("team.id"), nullable=False)
    
    # Rating dimensions
    fairness_rating = Column(Float, nullable=False)  # 1-5, how fair was the judge
    clarity_rating = Column(Float, nullable=False)   # 1-5, how clear was feedback
    helpfulness_rating = Column(Float, nullable=False)  # 1-5, how helpful was feedback
    professionalism_rating = Column(Float, nullable=False)  # 1-5
    
    comments = Column(Text, nullable=True)
    would_recommend = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    judge = relationship("User", foreign_keys=[judge_id])
    team = relationship("Team", foreign_keys=[team_id])
    hackathon = relationship("Hackathon", foreign_keys=[hackathon_id])


class FeedbackCategory(Base):
    """Custom feedback categories per hackathon"""
    __tablename__ = "feedback_category"

    id = Column(Integer, primary_key=True)
    hackathon_id = Column(Integer, ForeignKey("hackathon.id"), nullable=False)
    
    name = Column(String(100), nullable=False)  # e.g., "Technical Depth", "Market Fit"
    description = Column(Text, nullable=True)
    weight = Column(Float, default=1.0)  # How much this category impacts overall score
    is_required = Column(Boolean, default=False)
    min_score = Column(Float, default=1)
    max_score = Column(Float, default=10)
    
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")


class DetailedEvaluation(Base):
    """Extended evaluation with all judge feedback fields"""
    __tablename__ = "detailed_evaluation"

    id = Column(Integer, primary_key=True)
    evaluation_id = Column(Integer, ForeignKey("evaluation.id"), nullable=False, unique=True)
    
    # Judge experience
    expertise_level = Column(String(20))  # "beginner", "intermediate", "expert"
    time_spent_minutes = Column(Integer)
    evaluation_confidence = Column(Float)  # 0-1, judge confidence in their score
    
    # Detailed breakdown
    strengths = Column(Text)
    weaknesses = Column(Text)
    improvement_suggestions = Column(Text)
    
    # Project assessment
    project_completeness = Column(Float)  # 0-100%
    project_originality = Column(Float)   # 0-100%
    project_feasibility = Column(Float)   # 0-100%
    
    # Judge state
    judge_alert_level = Column(String(20))  # "green", "yellow", "red" (for bias detection)
    score_deviation = Column(Float)  # How many stds from judge's average
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    evaluation = relationship("Evaluation")
