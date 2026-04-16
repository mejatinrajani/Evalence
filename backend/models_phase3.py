"""
Phase 3: Advanced Models for AI Scoring, Mentorship, Social Features, Admin Controls
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey, Enum, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base, engine, get_db

# ==================== AI SCORING SYSTEM ====================

class AIScoringModel(Base):
    """Trained ML model for scoring suggestions"""
    __tablename__ = "ai_scoring_models"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    model_name = Column(String(255))
    model_version = Column(String(50))
    
    # Model details
    algorithm = Column(String(100))  # random_forest, gradient_boosting, neural_net
    training_samples = Column(Integer)  # Number of evaluations used
    accuracy_score = Column(Float)  # 0.0-1.0
    
    # Model parameters
    feature_importance = Column(JSON)  # Feature weights for scoring
    model_weights = Column(JSON, nullable=True)  # Serialized model weights
    
    # Status
    is_active = Column(Boolean, default=False)
    is_trained = Column(Boolean, default=False)
    
    trained_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")
    
    def __repr__(self):
        return f"<AIScoringModel {self.model_name} v{self.model_version}>"


class ScoringPrediction(Base):
    """AI predictions for team scores"""
    __tablename__ = "scoring_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True)
    round_id = Column(Integer, ForeignKey("rounds_enhanced.id"), nullable=True)
    
    # Prediction details
    predicted_score = Column(Float)  # AI predicted final score
    confidence_level = Column(Float, default=0.0)  # 0.0-1.0
    
    # Explanation
    key_factors = Column(JSON)  # Factors influencing prediction
    similar_past_teams = Column(JSON)  # Team IDs with similar patterns
    
    # Actual vs predicted
    actual_score = Column(Float, nullable=True)
    is_accurate = Column(Boolean, nullable=True)  # True if within 5 points
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")
    team = relationship("Team")


# ==================== MENTORSHIP SYSTEM ====================

class MentorshipRequest(Base):
    """Mentor-mentee matching system"""
    __tablename__ = "mentorship_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    mentee_id = Column(Integer, ForeignKey("users.id"), index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Request details
    mentee_skills = Column(JSON)  # Skills mentee wants to learn
    mentor_expertise = Column(JSON, nullable=True)  # Mentor's expertise areas
    
    # Status
    status = Column(String(50), default="pending")  # pending, accepted, active, completed, rejected
    message = Column(Text, nullable=True)
    
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Ratings
    mentee_rating = Column(Float, nullable=True)  # 1-5 stars
    mentor_rating = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    hackathon = relationship("Hackathon")
    mentee = relationship("User", foreign_keys=[mentee_id])
    mentor = relationship("User", foreign_keys=[mentor_id])


class MentorshipSession(Base):
    """Track mentorship meetings and discussions"""
    __tablename__ = "mentorship_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    mentorship_id = Column(Integer, ForeignKey("mentorship_requests.id"), index=True)
    
    # Session details
    session_topic = Column(String(255))
    session_notes = Column(Text, nullable=True)
    resources_shared = Column(JSON)  # URLs or document references
    
    # Scheduling
    scheduled_time = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    
    # Feedback
    mentee_feedback = Column(Text, nullable=True)
    mentor_feedback = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== SOCIAL & COMMUNITY ====================

class TeamMessage(Base):
    """Team messaging and communication"""
    __tablename__ = "team_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Message content
    content = Column(Text)
    message_type = Column(String(50), default="text")  # text, announcement, link, file
    
    # Media
    file_url = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    
    # Features
    is_pinned = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    team = relationship("Team")
    sender = relationship("User")


class HackathonAnnouncement(Base):
    """Platform-wide announcements"""
    __tablename__ = "hackathon_announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Announcement details
    title = Column(String(255))
    content = Column(Text)
    priority = Column(String(50), default="normal")  # urgent, high, normal, low
    
    # Categories
    category = Column(String(50))  # schedule, results, rules, support, other
    
    # Status
    is_pinned = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    
    published_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Reactions
    view_count = Column(Integer, default=0)
    reaction_count = Column(JSON)  # {"👍": 5, "❤️": 3}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserConnection(Base):
    """Network connections between users"""
    __tablename__ = "user_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id_1 = Column(Integer, ForeignKey("users.id"), index=True)
    user_id_2 = Column(Integer, ForeignKey("users.id"), index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=True)
    
    # Connection type
    connection_type = Column(String(50))  # friend, collaborator, mentor, inspiration
    
    # Status
    is_connected = Column(Boolean, default=False)
    is_mutual = Column(Boolean, default=False)
    
    connected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== REPORTING & EXPORTS ====================

class GeneratedReport(Base):
    """Team or hackathon reports"""
    __tablename__ = "generated_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Report details
    report_type = Column(String(50))  # summary, detailed, analytics, judge_feedback
    title = Column(String(255))
    
    # Content
    report_data = Column(JSON)  # Report content
    template_used = Column(String(100))
    
    # Access
    is_public = Column(Boolean, default=False)
    is_downloadable = Column(Boolean, default=True)
    
    # Files
    pdf_url = Column(String(500), nullable=True)
    excel_url = Column(String(500), nullable=True)
    json_url = Column(String(500), nullable=True)
    
    generated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    hackathon = relationship("Hackathon")
    team = relationship("Team")
    organizer = relationship("User")


class ExportLog(Base):
    """Track all data exports for audit"""
    __tablename__ = "export_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Export details
    export_type = Column(String(50))  # teams, evaluations, leaderboard, full
    export_format = Column(String(20))  # csv, excel, json, pdf
    
    # File info
    file_url = Column(String(500))
    file_size = Column(Integer)  # bytes
    
    # Status
    record_count = Column(Integer)  # Number of records exported
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== ADMIN & MODERATION ====================

class AdminLog(Base):
    """Audit trail for admin actions"""
    __tablename__ = "admin_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), index=True)
    hackathon_id = Column(Integer, nullable=True)
    
    # Action details
    action_type = Column(String(100))  # user_created, score_adjusted, judge_removed, etc.
    resource_type = Column(String(50))  # user, evaluation, appeal, hackathon
    resource_id = Column(Integer, nullable=True)
    
    # Changes
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    change_reason = Column(Text, nullable=True)
    
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    admin = relationship("User")


class ContentModerationFlag(Base):
    """Flag inappropriate content"""
    __tablename__ = "content_moderation_flags"
    
    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), index=True)
    
    # Content
    content_type = Column(String(50))  # message, project_name, feedback, comment
    content_id = Column(Integer)
    content_preview = Column(String(500))
    
    # Flag details
    flag_type = Column(String(50))  # spam, abuse, inappropriate, plagiarism, other
    reported_by = Column(Integer, ForeignKey("users.id"))
    
    # Resolution
    status = Column(String(50), default="pending")  # pending, reviewed, approved, removed
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    
    reported_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)


# ==================== USER PREFERENCES & SETTINGS ====================

class UserPreferences(Base):
    """User customization and settings"""
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Theme preferences
    theme_mode = Column(String(20), default="light")  # light, dark, auto
    color_scheme = Column(String(50), default="blue")  # blue, purple, green, etc.
    
    # Notification preferences
    email_on_evaluation = Column(Boolean, default=True)
    email_on_appeal = Column(Boolean, default=True)
    email_on_message = Column(Boolean, default=True)
    email_on_announcement = Column(Boolean, default=True)
    email_digest_frequency = Column(String(20), default="daily")  # daily, weekly, never
    
    # Display preferences
    show_z_scores = Column(Boolean, default=True)
    show_judge_names = Column(Boolean, default=True)
    compact_view = Column(Boolean, default=False)
    
    # Privacy
    profile_visibility = Column(String(20), default="team")  # public, team, private
    allow_messages = Column(Boolean, default=True)
    allow_connections = Column(Boolean, default=True)
    
    # Accessibility
    high_contrast = Column(Boolean, default=False)
    font_size = Column(String(20), default="normal")  # small, normal, large
    reduce_animations = Column(Boolean, default=False)
    screen_reader_enabled = Column(Boolean, default=False)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")


# ==================== GAMIFICATION & ACHIEVEMENTS ====================

class AchievementBadge(Base):
    """Achievement badges for users"""
    __tablename__ = "achievement_badges"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Badge details
    badge_name = Column(String(100), unique=True)
    badge_icon = Column(String(20))  # emoji or icon code
    badge_description = Column(Text)
    
    # Categories
    category = Column(String(50))  # participation, excellence, community, innovation
    rarity = Column(String(20))  # common, rare, epic, legendary
    
    # Criteria
    criteria_type = Column(String(50))  # score_threshold, participation, special
    criteria_value = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class UserAchievement(Base):
    """Track achieved badges"""
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    badge_id = Column(Integer, ForeignKey("achievement_badges.id"), index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=True)
    
    # Achievement details
    points_earned = Column(Integer, default=10)
    achievement_description = Column(Text, nullable=True)
    
    achieved_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    badge = relationship("AchievementBadge")


# Create all tables
if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("✅ Phase 3 models created successfully!")
