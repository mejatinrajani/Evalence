"""
Phase 4: Admin Panel Models
Audit logs, role management, settings, and compliance
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.database import Base


class AdminRole(str, enum.Enum):
    """Admin role types"""
    SUPER_ADMIN = "super_admin"
    PLATFORM_ADMIN = "platform_admin"
    COMPLIANCE_OFFICER = "compliance_officer"
    SUPPORT_ADMIN = "support_admin"
    ANALYTICS_ADMIN = "analytics_admin"


class PermissionScope(str, enum.Enum):
    """Permission scopes for role-based access control"""
    USER_MANAGEMENT = "user_management"
    EVENT_MANAGEMENT = "event_management"
    JUDGE_MANAGEMENT = "judge_management"
    ANALYTICS = "analytics"
    COMPLIANCE = "compliance"
    SETTINGS = "settings"
    REPORTING = "reporting"
    AUDIT_LOG = "audit_log"


class AdminUser(Base):
    """Admin users with role-based access control"""
    __tablename__ = "admin_user"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), unique=True, nullable=False)
    
    role = Column(SQLEnum(AdminRole), nullable=False)
    
    # Permissions (JSON for flexibility)
    permissions = Column(JSON, default=list)  # List of PermissionScope values
    
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class AuditLog(Base):
    """Audit trail for all admin actions and system changes"""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    
    # Who performed the action
    admin_id = Column(Integer, ForeignKey("admin_user.id"), nullable=True)
    admin_user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    ip_address = Column(String(15), nullable=True)
    
    # What was the action
    action = Column(String(100), nullable=False)  # e.g., "user_created", "event_updated", "judge_assigned"
    entity_type = Column(String(50), nullable=False)  # e.g., "user", "hackathon", "judge_assignment"
    entity_id = Column(Integer, nullable=False)  # ID of the entity that was changed
    
    # Before/after state
    changes = Column(JSON, nullable=True)  # {"field": {"old": "value", "new": "value"}}
    description = Column(Text, nullable=True)
    
    # Severity for important actions
    severity = Column(String(20), default="info")  # "info", "warning", "critical"
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    admin_user = relationship("AdminUser", foreign_keys=[admin_id])
    user = relationship("User", foreign_keys=[admin_user_id])


class PlatformSetting(Base):
    """Global platform configuration"""
    __tablename__ = "platform_setting"

    id = Column(Integer, primary_key=True)
    
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    setting_type = Column(String(20))  # "string", "integer", "boolean", "json"
    
    category = Column(String(50))  # "general", "security", "email", "storage", "limits"
    description = Column(Text, nullable=True)
    
    is_sensitive = Column(Boolean, default=False)  # Hide from UI if true
    is_editable = Column(Boolean, default=True)
    
    updated_by = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[updated_by])


class EventManagementLog(Base):
    """Detailed log of event management actions"""
    __tablename__ = "event_management_log"

    id = Column(Integer, primary_key=True)
    
    hackathon_id = Column(Integer, ForeignKey("hackathon.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("admin_user.id"), nullable=False)
    
    action = Column(String(100), nullable=False)  # "created", "updated", "cancelled", "reset_phase", etc.
    old_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    
    reasoning = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)  # What was affected by this action
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    hackathon = relationship("Hackathon", foreign_keys=[hackathon_id])
    admin = relationship("AdminUser", foreign_keys=[admin_id])


class ComplianceReport(Base):
    """Compliance and governance reports"""
    __tablename__ = "compliance_report"

    id = Column(Integer, primary_key=True)
    
    report_type = Column(String(50))  # "gdpr", "data_retention", "judge_fairness", "bias_analysis", "security_audit"
    hackathon_id = Column(Integer, ForeignKey("hackathon.id"), nullable=True)
    
    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=False)
    report_data = Column(JSON)  # Detailed findings
    
    status = Column(String(20))  # "draft", "review", "approved", "archived"
    severity = Column(String(20))  # "info", "warning", "critical"
    
    findings = Column(JSON)  # List of specific findings
    recommendations = Column(JSON)  # List of recommendations
    
    generated_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    generated_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # When report expires (for compliance)
    
    # Relationships
    hackathon = relationship("Hackathon", foreign_keys=[hackathon_id])
    generated_by_user = relationship("User", foreign_keys=[generated_by])
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by])


class SystemHealthMetric(Base):
    """Track system health and performance metrics"""
    __tablename__ = "system_health_metric"

    id = Column(Integer, primary_key=True)
    
    metric_name = Column(String(100), nullable=False)
    metric_type = Column(String(50))  # "uptime", "response_time", "error_rate", "database", "memory"
    
    value = Column(Text)  # Can store various types
    unit = Column(String(20))  # "%", "ms", "count", etc.
    
    status = Column(String(20))  # "healthy", "warning", "critical"
    threshold_warning = Column(Text)
    threshold_critical = Column(Text)
    
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Additional metadata (renamed to avoid SQLAlchemy reserved name)
    meta_info = Column(JSON, nullable=True)


class AdminNotification(Base):
    """Important notifications for admins"""
    __tablename__ = "admin_notification"

    id = Column(Integer, primary_key=True)
    
    admin_id = Column(Integer, ForeignKey("admin_user.id"), nullable=False)
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    notification_type = Column(String(50))  # "system_alert", "urgent_action", "audit_finding", "user_issue", "event_issue"
    priority = Column(String(20))  # "low", "medium", "high", "critical"
    
    action_url = Column(String(255), nullable=True)
    action_type = Column(String(50), nullable=True)  # "review_report", "approve_event", "check_judge_bias"
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    expires_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    admin = relationship("AdminUser", foreign_keys=[admin_id])


class DataExportLog(Base):
    """Track all data exports for compliance"""
    __tablename__ = "data_export_log"

    id = Column(Integer, primary_key=True)
    
    requested_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    
    export_type = Column(String(100))  # "user_data", "hackathon_results", "audit_trail", "statistics"
    hackathon_id = Column(Integer, ForeignKey("hackathon.id"), nullable=True)
    
    included_data = Column(JSON)  # List of data types included
    file_format = Column(String(20))  # "csv", "json", "xlsx", "pdf"
    
    row_count = Column(Integer)
    file_size_kb = Column(Integer)
    
    download_count = Column(Integer, default=0)
    last_downloaded_at = Column(DateTime, nullable=True)
    
    expires_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[requested_by])
    hackathon = relationship("Hackathon", foreign_keys=[hackathon_id])


class AdminDashboardMetric(Base):
    """Aggregated metrics for admin dashboard"""
    __tablename__ = "admin_dashboard_metric"

    id = Column(Integer, primary_key=True)
    
    metric_date = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Platform metrics
    total_users = Column(Integer, default=0)
    total_hackathons = Column(Integer, default=0)
    active_hackathons = Column(Integer, default=0)
    
    # Judge metrics
    total_judges = Column(Integer, default=0)
    active_judges = Column(Integer, default=0)
    total_evaluations = Column(Integer, default=0)
    
    # Quality metrics
    average_judge_fairness = Column(Integer, default=0)  # 0-100
    bias_detection_rate = Column(Integer, default=0)  # %
    judge_completion_rate = Column(Integer, default=0)  # %
    
    # System metrics
    system_uptime_percentage = Column(Integer, default=100)
    average_response_time_ms = Column(Integer)
    error_rate_percentage = Column(Integer, default=0)
    
    # Security metrics
    security_alerts_count = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
