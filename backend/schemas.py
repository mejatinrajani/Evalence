from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import RoleEnum


# =============================================
# USER / AUTH
# =============================================
class UserBase(BaseModel):
    email: str
    full_name: str
    role: RoleEnum

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    bio: Optional[str] = None
    github_url: Optional[str] = None
    skills: Optional[List[str]] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    github_url: Optional[str] = None
    skills: Optional[List[str]] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int

class StatusUpdate(BaseModel):
    status: str

# =============================================
# HACKATHON
# =============================================
class CriterionBase(BaseModel):
    name: str
    max_points: int

class CriterionResponse(CriterionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class RoundBase(BaseModel):
    name: str
    criteria: List[CriterionBase]

class RoundResponse(BaseModel):
    id: int
    name: str
    criteria: List[CriterionResponse]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TeamBase(BaseModel):
    name: str
    members: List[Dict[str, Any]]

class TeamResponse(TeamBase):
    id: int
    hackathon_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    members: Optional[List[Dict[str, Any]]] = None

class TeamImportRow(BaseModel):
    team_name: str
    members: Optional[str] = None  # JSON string: [{"name": "John", "email": "john@example.com"}, ...]

class TeamImportResponse(BaseModel):
    total: int
    imported: int
    failed: int
    errors: List[str] = []

class HackathonCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    prize_pool: Optional[str] = None
    max_teams: Optional[int] = None
    teams: List[TeamBase] = []
    rounds: List[RoundBase] = []

class HackathonResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    prize_pool: Optional[str]
    max_teams: Optional[int]
    status: str
    mentor_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class HackathonDetailResponse(HackathonResponse):
    teams: List[TeamResponse] = []
    rounds: List[RoundResponse] = []

# =============================================
# PROJECTS
# =============================================
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    github_url: Optional[str] = None
    demo_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    team_id: int
    hackathon_id: int

class ProjectResponse(ProjectCreate):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# =============================================
# ANNOUNCEMENTS
# =============================================
class AnnouncementCreate(BaseModel):
    title: str
    body: str

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    body: str
    hackathon_id: int
    author_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# =============================================
# JUDGING & LEADERBOARD
# =============================================
class EvaluationCreate(BaseModel):
    team_id: int
    criterion_id: int
    score: int
    feedback: Optional[str] = None

class TeamLeaderboardResponse(BaseModel):
    team_id: int
    team_name: str
    raw_score_sum: int
    z_score_total: float
    eval_count: int


# =============================================
# JUDGE & COORDINATOR MANAGEMENT
# =============================================
class HackathonJudgeResponse(BaseModel):
    id: int
    hackathon_id: int
    user_id: int
    assigned_at: Optional[datetime] = None
    class Config:
        from_attributes = True


class HackathonCoordinatorResponse(BaseModel):
    id: int
    hackathon_id: int
    user_id: int
    assigned_at: Optional[datetime] = None
    class Config:
        from_attributes = True


class CredentialsCreate(BaseModel):
    person_name: str
    role: str  # "judge" or "coordinator"


class CredentialsResponse(BaseModel):
    id: int
    username: str
    person_name: str
    role: str
    is_active: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


class CredentialsWithPasswordResponse(CredentialsResponse):
    password: str  # Only returned once at creation


class OrganizerHackathonDetailResponse(HackathonDetailResponse):
    judges: List[Dict[str, Any]] = []
    coordinators: List[Dict[str, Any]] = []
    credentials: List[CredentialsResponse] = []


# =============================================
# JUDGE ASSIGNMENT
# =============================================
class JudgeAssignmentBase(BaseModel):
    judge_id: int
    team_id: int
    round_id: Optional[int] = None

class JudgeAssignmentCreate(JudgeAssignmentBase):
    pass

class JudgeAssignmentResponse(JudgeAssignmentBase):
    id: int
    hackathon_id: int
    status: str
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class JudgeAssignmentUpdate(BaseModel):
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# =============================================
# ROUNDS WITH CRITERIA
# =============================================
class RoundCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None

class RoundUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None

class CriterionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    max_points: int = 10
    weight: Optional[float] = 1.0

class CriterionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_points: Optional[int] = None
    weight: Optional[float] = None


# =============================================
# ANALYTICS & LIVE DASHBOARD
# =============================================
class AnalyticsSnapshot(BaseModel):
    total_registered: int
    teams_registered: int
    projects_submitted: int
    judges_assigned: int
    eval_started: int
    eval_completed: int
    participants_count: int
    average_score: Optional[float] = None
    phase_duration_remaining_minutes: Optional[int] = None

class LiveAnalyticsResponse(BaseModel):
    hackathon_id: int
    snapshot: AnalyticsSnapshot
    last_updated: datetime


# =============================================
# COMMUNICATION
# =============================================
class AnnouncementCreateRequest(BaseModel):
    title: str
    body: str
    audience: str = "all"  # all, judges, coordinators, participants

class AnnouncementSendEmailRequest(BaseModel):
    subject: str
    body: str
    audience: str = "all"  # all, judges, coordinators, participants


# =============================================
# PARTICIPANTS
# =============================================
class ParticipantRegistrationResponse(BaseModel):
    id: int
    user_id: int
    team_id: Optional[int] = None
    status: str
    registered_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ParticipantListResponse(BaseModel):
    id: int
    email: str
    full_name: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    status: str
    registered_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================
# EVENT LOG
# =============================================
class EventLogCreate(BaseModel):
    event_type: str
    user_id: Optional[int] = None
    team_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None

class EventLogResponse(BaseModel):
    id: int
    hackathon_id: int
    event_type: str
    user_id: Optional[int] = None
    team_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

