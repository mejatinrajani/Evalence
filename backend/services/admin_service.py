"""
Phase 4: Admin Management Service
Handles admin operations, audit logging, compliance, and platform governance
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from backend.models_admin import (
    AdminUser, AuditLog, PlatformSetting, EventManagementLog,
    ComplianceReport, SystemHealthMetric, AdminNotification,
    DataExportLog, AdminDashboardMetric, AdminRole, PermissionScope
)
from backend.models import User, Hackathon
from pydantic import BaseModel, Field
import json


class AuditLogEntry(BaseModel):
    """Request to create audit log entry"""
    action: str
    entity_type: str
    entity_id: int
    changes: Optional[Dict] = None
    description: Optional[str] = None
    severity: str = "info"


class AdminService:
    """Service for managing admin operations and governance"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== User & Role Management ====================
    
    def create_admin_user(
        self,
        user_id: int,
        role: str,
        permissions: List[str]
    ) -> AdminUser:
        """Promote user to admin with specific role"""
        
        admin = AdminUser(
            user_id=user_id,
            role=role,
            permissions=permissions
        )
        
        self.db.add(admin)
        self.db.commit()
        
        # Log this action
        self.create_audit_log(
            admin_user_id=user_id,
            action="admin_user_created",
            entity_type="admin_user",
            entity_id=admin.id,
            description=f"User promoted to {role}",
            severity="warning"
        )
        
        return admin
    
    def update_admin_permissions(
        self,
        admin_id: int,
        new_permissions: List[str]
    ) -> AdminUser:
        """Update admin permissions"""
        
        admin = self.db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        old_permissions = admin.permissions
        
        admin.permissions = new_permissions
        self.db.commit()
        
        self.create_audit_log(
            action="admin_permissions_updated",
            entity_type="admin_user",
            entity_id=admin_id,
            changes={"permissions": {"old": old_permissions, "new": new_permissions}},
            severity="warning"
        )
        
        return admin
    
    def deactivate_admin(self, admin_id: int) -> AdminUser:
        """Deactivate admin access"""
        
        admin = self.db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        admin.is_active = False
        self.db.commit()
        
        self.create_audit_log(
            action="admin_user_deactivated",
            entity_type="admin_user",
            entity_id=admin_id,
            severity="critical"
        )
        
        return admin
    
    def grant_permission(
        self,
        admin_id: int,
        permission: str
    ) -> AdminUser:
        """Grant specific permission to admin"""
        
        admin = self.db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        
        if permission not in admin.permissions:
            admin.permissions.append(permission)
            self.db.commit()
            
            self.create_audit_log(
                action="permission_granted",
                entity_type="admin_user",
                entity_id=admin_id,
                description=f"Permission {permission} granted",
                severity="info"
            )
        
        return admin
    
    def revoke_permission(
        self,
        admin_id: int,
        permission: str
    ) -> AdminUser:
        """Revoke specific permission from admin"""
        
        admin = self.db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        
        if permission in admin.permissions:
            admin.permissions.remove(permission)
            self.db.commit()
            
            self.create_audit_log(
                action="permission_revoked",
                entity_type="admin_user",
                entity_id=admin_id,
                description=f"Permission {permission} revoked",
                severity="warning"
            )
        
        return admin
    
    # ==================== Audit Logging ====================
    
    def create_audit_log(
        self,
        action: str,
        entity_type: str,
        entity_id: int,
        admin_id: Optional[int] = None,
        admin_user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        changes: Optional[Dict] = None,
        description: Optional[str] = None,
        severity: str = "info"
    ) -> AuditLog:
        """Create comprehensive audit log entry"""
        
        log = AuditLog(
            admin_id=admin_id,
            admin_user_id=admin_user_id,
            ip_address=ip_address,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes,
            description=description,
            severity=severity
        )
        
        self.db.add(log)
        self.db.commit()
        return log
    
    def get_audit_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        entity_type: Optional[str] = None,
        severity: Optional[str] = None,
        admin_id: Optional[int] = None,
        days_back: int = 30
    ) -> tuple[List[Dict], int]:
        """Retrieve audit logs with filtering"""
        
        query = self.db.query(AuditLog).filter(
            AuditLog.created_at >= datetime.utcnow() - timedelta(days=days_back)
        )
        
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if severity:
            query = query.filter(AuditLog.severity == severity)
        if admin_id:
            query = query.filter(AuditLog.admin_id == admin_id)
        
        total = query.count()
        logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()
        
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "admin_name": log.admin_user.full_name if log.admin_user else "System",
                "changes": log.changes,
                "description": log.description,
                "severity": log.severity,
                "created_at": log.created_at.isoformat(),
                "ip_address": log.ip_address
            })
        
        return result, total
    
    # ==================== Platform Settings ====================
    
    def get_setting(self, key: str) -> Optional[str]:
        """Get platform setting value"""
        
        setting = self.db.query(PlatformSetting).filter(
            PlatformSetting.key == key
        ).first()
        
        return setting.value if setting else None
    
    def set_setting(
        self,
        key: str,
        value: str,
        setting_type: str = "string",
        category: str = "general",
        admin_user_id: Optional[int] = None
    ) -> PlatformSetting:
        """Set platform setting"""
        
        setting = self.db.query(PlatformSetting).filter(
            PlatformSetting.key == key
        ).first()
        
        old_value = setting.value if setting else None
        
        if setting:
            setting.value = value
            setting.updated_by = admin_user_id
            setting.updated_at = datetime.utcnow()
        else:
            setting = PlatformSetting(
                key=key,
                value=value,
                setting_type=setting_type,
                category=category,
                updated_by=admin_user_id
            )
            self.db.add(setting)
        
        self.db.commit()
        
        # Log setting change
        self.create_audit_log(
            action="setting_updated",
            entity_type="platform_setting",
            entity_id=setting.id,
            admin_user_id=admin_user_id,
            changes={"value": {"old": old_value, "new": value}},
            severity="warning"
        )
        
        return setting
    
    def get_all_settings(self, category: Optional[str] = None) -> Dict[str, str]:
        """Get all platform settings"""
        
        query = self.db.query(PlatformSetting)
        
        if category:
            query = query.filter(PlatformSetting.category == category)
        
        settings = query.all()
        return {s.key: s.value for s in settings if not s.is_sensitive}
    
    # ==================== Event Management Logs ====================
    
    def log_event_action(
        self,
        hackathon_id: int,
        admin_id: int,
        action: str,
        old_state: Optional[Dict] = None,
        new_state: Optional[Dict] = None,
        reasoning: Optional[str] = None,
        impact: Optional[str] = None
    ) -> EventManagementLog:
        """Log hackathon management action"""
        
        log = EventManagementLog(
            hackathon_id=hackathon_id,
            admin_id=admin_id,
            action=action,
            old_state=old_state,
            new_state=new_state,
            reasoning=reasoning,
            impact=impact
        )
        
        self.db.add(log)
        self.db.commit()
        
        # Create notification for other admins
        self.create_admin_notification(
            admin_id=admin_id,
            title=f"Event Updated: {action}",
            message=f"Hackathon {hackathon_id} was {action}",
            notification_type="event_issue",
            priority="medium"
        )
        
        return log
    
    def get_event_history(self, hackathon_id: int) -> List[Dict]:
        """Get management history for hackathon"""
        
        logs = self.db.query(EventManagementLog).filter(
            EventManagementLog.hackathon_id == hackathon_id
        ).order_by(desc(EventManagementLog.created_at)).all()
        
        return [
            {
                "action": log.action,
                "admin_name": log.admin.user.full_name if log.admin and log.admin.user else "Unknown",
                "reasoning": log.reasoning,
                "impact": log.impact,
                "created_at": log.created_at.isoformat()
            }
            for log in logs
        ]
    
    # ==================== Compliance Reporting ====================
    
    def create_compliance_report(
        self,
        report_type: str,
        title: str,
        summary: str,
        report_data: Dict,
        generated_by: int,
        hackathon_id: Optional[int] = None,
        findings: Optional[List] = None,
        recommendations: Optional[List] = None,
        severity: str = "info"
    ) -> ComplianceReport:
        """Create compliance/audit report"""
        
        report = ComplianceReport(
            report_type=report_type,
            title=title,
            summary=summary,
            report_data=report_data,
            generated_by=generated_by,
            hackathon_id=hackathon_id,
            findings=findings or [],
            recommendations=recommendations or [],
            severity=severity,
            status="draft"
        )
        
        self.db.add(report)
        self.db.commit()
        
        # Create notification for admins
        priority = "critical" if severity == "critical" else "high"
        self.create_admin_notification(
            admin_id=None,  # TODO: notify all admins
            title=f"New {report_type} Report",
            message=summary[:100],
            notification_type="audit_finding",
            priority=priority,
            action_url=f"/admin/reports/{report.id}"
        )
        
        return report
    
    def approve_report(self, report_id: int, admin_id: int) -> ComplianceReport:
        """Approve compliance report"""
        
        report = self.db.query(ComplianceReport).filter(
            ComplianceReport.id == report_id
        ).first()
        
        report.status = "approved"
        report.reviewed_by = admin_id
        report.reviewed_at = datetime.utcnow()
        
        self.db.commit()
        return report
    
    def get_compliance_reports(
        self,
        report_type: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None
    ) -> List[Dict]:
        """Get compliance reports"""
        
        query = self.db.query(ComplianceReport)
        
        if report_type:
            query = query.filter(ComplianceReport.report_type == report_type)
        if status:
            query = query.filter(ComplianceReport.status == status)
        if severity:
            query = query.filter(ComplianceReport.severity == severity)
        
        reports = query.order_by(desc(ComplianceReport.generated_at)).all()
        
        return [
            {
                "id": report.id,
                "type": report.report_type,
                "title": report.title,
                "status": report.status,
                "severity": report.severity,
                "generated_at": report.generated_at.isoformat(),
                "reviewed_at": report.reviewed_at.isoformat() if report.reviewed_at else None
            }
            for report in reports
        ]
    
    # ==================== System Health & Notifications ====================
    
    def record_health_metric(
        self,
        metric_name: str,
        value: str,
        unit: str,
        metric_type: str,
        status: str = "healthy",
        metadata: Optional[Dict] = None
    ) -> SystemHealthMetric:
        """Record system health metric"""
        
        metric = SystemHealthMetric(
            metric_name=metric_name,
            value=value,
            unit=unit,
            metric_type=metric_type,
            status=status,
            metadata=metadata
        )
        
        self.db.add(metric)
        self.db.commit()
        
        # Alert if critical
        if status == "critical":
            self.create_admin_notification(
                admin_id=None,
                title="System Health Critical",
                message=f"{metric_name} is {status}: {value}{unit}",
                notification_type="system_alert",
                priority="critical"
            )
        
        return metric
    
    def create_admin_notification(
        self,
        title: str,
        message: str,
        notification_type: str,
        priority: str,
        admin_id: Optional[int] = None,
        action_url: Optional[str] = None,
        action_type: Optional[str] = None,
        expires_in_hours: int = 24
    ) -> AdminNotification:
        """Create admin notification"""
        
        notification = AdminNotification(
            admin_id=admin_id,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            action_url=action_url,
            action_type=action_type,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours)
        )
        
        self.db.add(notification)
        self.db.commit()
        return notification
    
    def get_admin_notifications(
        self,
        admin_id: int,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for admin"""
        
        query = self.db.query(AdminNotification).filter(
            AdminNotification.admin_id == admin_id
        )
        
        if unread_only:
            query = query.filter(AdminNotification.is_read == False)
        
        notifications = query.order_by(
            desc(AdminNotification.priority),
            desc(AdminNotification.created_at)
        ).limit(50).all()
        
        return [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "priority": n.priority,
                "action_url": n.action_url,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat()
            }
            for n in notifications
        ]
    
    def mark_notification_read(self, notification_id: int) -> AdminNotification:
        """Mark notification as read"""
        
        notification = self.db.query(AdminNotification).filter(
            AdminNotification.id == notification_id
        ).first()
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        self.db.commit()
        return notification
    
    # ==================== Admin Dashboard Metrics ====================
    
    def update_dashboard_metrics(
        self,
        total_users: int,
        total_hackathons: int,
        active_hackathons: int,
        total_judges: int,
        active_judges: int,
        total_evaluations: int,
        average_judge_fairness: int,
        bias_detection_rate: int,
        judge_completion_rate: int,
        system_uptime_percentage: int,
        average_response_time_ms: int,
        error_rate_percentage: int,
        security_alerts_count: int,
        failed_login_attempts: int
    ) -> AdminDashboardMetric:
        """Update admin dashboard metrics"""
        
        metric = AdminDashboardMetric(
            total_users=total_users,
            total_hackathons=total_hackathons,
            active_hackathons=active_hackathons,
            total_judges=total_judges,
            active_judges=active_judges,
            total_evaluations=total_evaluations,
            average_judge_fairness=average_judge_fairness,
            bias_detection_rate=bias_detection_rate,
            judge_completion_rate=judge_completion_rate,
            system_uptime_percentage=system_uptime_percentage,
            average_response_time_ms=average_response_time_ms,
            error_rate_percentage=error_rate_percentage,
            security_alerts_count=security_alerts_count,
            failed_login_attempts=failed_login_attempts
        )
        
        self.db.add(metric)
        self.db.commit()
        return metric
    
    def get_latest_dashboard_metrics(self) -> Optional[Dict]:
        """Get latest dashboard metrics"""
        
        metric = self.db.query(AdminDashboardMetric).order_by(
            desc(AdminDashboardMetric.metric_date)
        ).first()
        
        if not metric:
            return None
        
        return {
            "date": metric.metric_date.isoformat(),
            "users": {
                "total": metric.total_users
            },
            "hackathons": {
                "total": metric.total_hackathons,
                "active": metric.active_hackathons
            },
            "judges": {
                "total": metric.total_judges,
                "active": metric.active_judges,
                "evaluations": metric.total_evaluations,
                "avg_fairness": metric.average_judge_fairness,
                "completion_rate": metric.judge_completion_rate
            },
            "quality": {
                "bias_detection_rate": metric.bias_detection_rate,
                "average_judge_fairness": metric.average_judge_fairness
            },
            "system": {
                "uptime_percentage": metric.system_uptime_percentage,
                "avg_response_time_ms": metric.average_response_time_ms,
                "error_rate_percentage": metric.error_rate_percentage
            },
            "security": {
                "alerts_count": metric.security_alerts_count,
                "failed_login_attempts": metric.failed_login_attempts
            }
        }
    
    def get_dashboard_metrics_history(self, days: int = 30) -> List[Dict]:
        """Get dashboard metrics history"""
        
        metrics = self.db.query(AdminDashboardMetric).filter(
            AdminDashboardMetric.metric_date >= datetime.utcnow() - timedelta(days=days)
        ).order_by(AdminDashboardMetric.metric_date).all()
        
        return [
            {
                "date": m.metric_date.isoformat(),
                "uptime": m.system_uptime_percentage,
                "error_rate": m.error_rate_percentage,
                "evaluations": m.total_evaluations,
                "judges_active": m.active_judges,
                "security_alerts": m.security_alerts_count
            }
            for m in metrics
        ]
    
    # ==================== Data Export for Compliance ====================
    
    def log_data_export(
        self,
        requested_by: int,
        export_type: str,
        file_format: str,
        included_data: List[str],
        row_count: int,
        file_size_kb: int,
        expires_in_days: int = 30,
        hackathon_id: Optional[int] = None
    ) -> DataExportLog:
        """Log data export for GDPR/compliance"""
        
        log = DataExportLog(
            requested_by=requested_by,
            export_type=export_type,
            file_format=file_format,
            included_data=included_data,
            row_count=row_count,
            file_size_kb=file_size_kb,
            hackathon_id=hackathon_id,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days)
        )
        
        self.db.add(log)
        self.db.commit()
        
        self.create_audit_log(
            action="data_exported",
            entity_type="export",
            entity_id=log.id,
            admin_user_id=requested_by,
            description=f"Data export: {export_type}",
            severity="info"
        )
        
        return log
