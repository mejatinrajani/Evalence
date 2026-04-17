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
    max_points: Optional[int] = 100

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
class EvaluationScoreCreate(BaseModel):
    criteria_id: int
    score: float
    comment: Optional[str] = None

class EvaluationCreate(BaseModel):
    team_id: int
    round_id: int
    scores: list[EvaluationScoreCreate]
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
# JUDGE PORTAL - EVALUATIONS
# =============================================
class EvaluationResponse(BaseModel):
    id: int
    judge_id: int
    team_id: int
    criterion_id: int
    score: int
    feedback: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class EvaluationSubmitRequest(BaseModel):
    team_id: int
    round_id: int
    scores: Dict[int, int]  # criterion_id -> score mapping
    feedback: Optional[Dict[int, str]] = None  # criterion_id -> feedback mapping

class TeamQueueItemResponse(BaseModel):
    id: int
    team_id: int
    team_name: str
    hackathon_id: int
    hackathon_name: str
    round_id: int
    round_name: str
    status: str  # pending, evaluating, completed
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    members: Optional[List[Dict[str, Any]]] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    criteria_count: int = 0
    total_possible_points: int = 0
    class Config:
        from_attributes = True

class CriterionEvaluationDetail(BaseModel):
    criterion_id: int
    criterion_name: str
    max_points: Optional[int] = 100
    current_score: Optional[int] = None
    feedback: Optional[str] = None
    description: Optional[str] = None

class TeamEvaluationDetailResponse(BaseModel):
    assignment_id: int
    team_id: int
    team_name: str
    hackathon_id: int
    hackathon_name: str
    round_id: int
    round_name: str
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    demo_url: Optional[str] = None
    github_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    members: Optional[List[Dict[str, Any]]] = None
    criteria: List[CriterionEvaluationDetail] = []
    status: str
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class JudgeDashboardResponse(BaseModel):
    total_assigned: int
    completed: int
    pending: int
    in_progress: int
    completion_percentage: float


# =============================================
# PHASE 1: TEAM SUBMISSION PORTAL
# =============================================
class ProjectSubmissionRequest(BaseModel):
    project_name: Optional[str] = None
    description: Optional[str] = None
    demo_url: Optional[str] = None
    github_url: Optional[str] = None
    presentation_slide_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    project_video_url: Optional[str] = None
    hackathon_id: int

class ProjectUpdateRequest(BaseModel):
    project_name: Optional[str] = None
    description: Optional[str] = None
    demo_url: Optional[str] = None
    github_url: Optional[str] = None
    presentation_slide_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    project_video_url: Optional[str] = None

class ProjectSubmissionResponse(BaseModel):
    id: int
    team_id: int
    hackathon_id: int
    project_name: Optional[str] = None
    description: Optional[str] = None
    demo_url: Optional[str] = None
    github_url: Optional[str] = None
    presentation_slide_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    project_video_url: Optional[str] = None
    submission_status: str
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProjectSubmissionLogResponse(BaseModel):
    id: int
    project_id: int
    action: str
    timestamp: datetime
    submitted_by_id: int
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# =============================================
# PHASE 1: JUDGE ASSIGNMENT
# =============================================
class AssignJudgeRequest(BaseModel):
    judge_id: int
    team_id: int
    round_id: int
    hackathon_id: int

class BatchAssignRequest(BaseModel):
    hackathon_id: int
    round_id: int
    csv_data: Optional[str] = None
    auto_balance: Optional[bool] = False
    judges_per_team: Optional[int] = 3

class ConflictRequest(BaseModel):
    judge_id: int
    team_id: int
    hackathon_id: int
    reason: str  # team_member, advisor, previous_team, other

class ConflictResponse(BaseModel):
    id: int
    judge_id: int
    judge_name: str
    team_id: int
    team_name: str
    reason: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class WorkloadValidationRequest(BaseModel):
    proposed_assignments: List[Dict[str, int]]  # [{ "judge_id": 1, "count": 5 }]

class WorkloadValidationResponse(BaseModel):
    balanced: bool
    details: List[Dict[str, Any]]
    average_load: float
    min_load: int
    max_load: int

class AssignmentStatusResponse(BaseModel):
    total_judges: int
    assigned_judges: int
    unassigned_judges: int
    total_teams: int
    assigned_teams: int
    unassigned_teams: int
    conflicts_detected: int
    workload_imbalance: bool


# =============================================
# PHASE 1: ORGANIZER DASHBOARD
# =============================================
class EvaluationProgressResponse(BaseModel):
    round_id: int
    round_name: str
    total_teams: int
    completed: int
    in_progress: int
    pending: int
    completion_percent: float
    avg_score: Optional[float] = None
    estimated_finish_time: Optional[str] = None

class JudgePerformanceResponse(BaseModel):
    judge_id: int
    judge_name: str
    assigned_count: int
    completed_count: int
    avg_score: Optional[float] = None
    avg_time_per_eval: Optional[float] = None
    score_std_dev: Optional[float] = None
    last_activity: Optional[datetime] = None

class BottlenecksResponse(BaseModel):
    idle_judges: List[Dict[str, Any]] = []
    slow_judges: List[Dict[str, Any]] = []
    unassigned_teams: int
    stalled_evaluations: int

class EventStatusResponse(BaseModel):
    current_phase: str  # registration, submission, judging, results, closed
    can_transition_to_next: bool
    submissions_deadline: Optional[datetime] = None
    judging_deadline: Optional[datetime] = None
    results_publish_time: Optional[datetime] = None
    time_remaining_in_phase: Optional[int] = None  # in minutes

class PhaseTransitionRequest(BaseModel):
    new_phase: str

class MetricsCardResponse(BaseModel):
    title: str
    value: str
    percentage: Optional[float] = None
    trend: Optional[str] = None
    variant: str = "default"

class OrganizerDashboardResponse(BaseModel):
    event_status: EventStatusResponse
    metrics: List[MetricsCardResponse]
    evaluation_progress: List[EvaluationProgressResponse]
    judge_performance: List[JudgePerformanceResponse]
    bottlenecks: BottlenecksResponse
    last_updated: datetime


# =============================================
# PHASE 1: RESULTS & LEADERBOARD
# =============================================
class TeamResultsDetail(BaseModel):
    team_id: int
    team_name: str
    rank: int
    final_score: float
    avg_score: float
    evaluations_received: int
    criteria_scores: Dict[int, float]  # criterion_id -> score
    feedback_summary: Optional[str] = None

class LeaderboardEntryResponse(BaseModel):
    rank: int
    team_id: int
    team_name: str
    final_score: float
    avg_score: float
    evaluations_received: int
    badge: Optional[str] = None  # gold, silver, bronze

class LeaderboardResponse(BaseModel):
    hackathon_id: int
    hackathon_name: str
    published_at: Optional[datetime] = None
    entries: List[LeaderboardEntryResponse]
    total_teams: int
    last_updated: datetime

class PublishResultsResponse(BaseModel):
    status: str
    published_at: datetime
    team_count: int
    winning_team: Optional[str] = None


# =============================================
# PHASE 2: APPEALS SYSTEM
# =============================================
class AppealSubmissionRequest(BaseModel):
    evaluation_id: int
    criterion_id: Optional[int] = None
    reason: str  # incorrect_scoring, missing_evaluation, other
    description: str
    evidence_url: Optional[str] = None

class AppealResponse(BaseModel):
    id: int
    team_id: int
    evaluation_id: int
    criterion_id: Optional[int] = None
    reason: str
    description: str
    evidence_url: Optional[str] = None
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    resolution: Optional[str] = None
    
    class Config:
        from_attributes = True

class AppealReviewRequest(BaseModel):
    decision: str  # approved, rejected
    resolution: str  # score_adjusted, re_evaluated, no_change
    review_notes: str


# =============================================
# PHASE 2: COMMUNICATION
# =============================================
class AnnouncementCreateFullRequest(BaseModel):
    title: str
    body: str
    target_role: str = "all"  # judge, team, organizer, all
    scheduled_time: Optional[datetime] = None
    hackathon_id: int

class AnnouncementResponseFull(BaseModel):
    id: int
    title: str
    body: str
    target_role: str
    scheduled_time: Optional[datetime] = None
    published_at: Optional[datetime] = None
    author_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
    current_round: Optional[Dict[str, Any]] = None
    upcoming_rounds: List[Dict[str, Any]] = []
    recent_activity: List[Dict[str, Any]] = []

class EvaluationHistoryItemResponse(BaseModel):
    id: int
    team_id: int
    team_name: str
    hackathon_id: int
    hackathon_name: str
    round_id: int
    round_name: str
    criteria_count: int
    total_score: float
    average_score: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class JudgeProgressResponse(BaseModel):
    total_evaluations: int
    completed_evaluations: int
    pending_evaluations: int
    average_score: float
    score_distribution: Dict[str, int]  # grade -> count
    top_performing_criteria: List[Dict[str, Any]] = []
    lowest_performing_criteria: List[Dict[str, Any]] = []
    completion_trend: List[Dict[str, Any]] = []

class EvaluationUpdateRequest(BaseModel):
    scores: Dict[int, int]  # criterion_id -> score mapping
    feedback: Optional[Dict[int, str]] = None  # criterion_id -> feedback mapping


# =============================================
# NEW EVALUATION SCHEMAS - MULTI-CRITERIA
# =============================================
class CriteriaDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    weight: float
    max_points: Optional[int] = 100

    class Config:
        from_attributes = True


class RoundEvaluationResponse(BaseModel):
    id: int
    team_id: int
    team_name: str
    round_id: int
    round_name: str
    criteria: List[CriteriaDetailResponse]
    current_scores: Dict[int, float]  # {criteria_id: score}
    status: str  # "pending", "in_progress", "completed"
    feedback: Optional[str]
    average_score: Optional[float]

    class Config:
        from_attributes = True


class EvaluationSubmitFormRequest(BaseModel):
    scores: Dict[int, float]  # {criteria_id: score}
    feedback: Optional[str] = None
    submit: bool = False  # True to finalize, False to save draft


class EvaluationSubmitResponse(BaseModel):
    status: str
    evaluation_id: int
    message: str
    average_score: float
    scores_count: int
    timestamp: datetime
    is_draft: bool = False

    class Config:
        from_attributes = True


class LeaderboardTeamResponse(BaseModel):
    rank: int
    team_id: int
    team_name: str
    final_score: float
    z_score: float
    member_count: int
    project_title: Optional[str]
    evaluations_count: int
    scores_by_evaluation: List[float]

    class Config:
        from_attributes = True


class JudgeAssignmentsSummary(BaseModel):
    judge_id: int
    judge_name: str
    teams_assigned: int
    evaluations_completed: int
    completion_percentage: int
    scores_breakdown: Dict[str, Dict]  # {team_name: {avg, count}}

    class Config:
        from_attributes = True


class ResultsCalculationResponse(BaseModel):
    status: str
    leaderboard: List[LeaderboardTeamResponse]
    judge_assignments: List[JudgeAssignmentsSummary]
    statistics: Dict
    calculated_at: datetime

    class Config:
        from_attributes = True


class ImportErrorDetail(BaseModel):
    row: int
    field: str
    value: str
    error: str
    action: str = "Fix and re-upload"


class ParticipantImportResponse(BaseModel):
    status: str  # success, partial, error
    summary: Dict
    errors: List[ImportErrorDetail] = []
    warnings: List[Dict] = []
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


# =============================================
# TEAM FEEDBACK & COMMENTS
# =============================================
class EvaluationFeedbackCreate(BaseModel):
    feedback: str
    suggestions: Optional[str] = None

class FeedbackResponse(BaseModel):
    judge_name: str
    round: str
    score: float
    detailed_feedback: Optional[str] = None
    suggestions: Optional[str] = None
    submitted_at: Optional[datetime] = None


# =============================================
# SCORE APPEAL/REVIEW SYSTEM
# =============================================
class ScoreAppealCreate(BaseModel):
    evaluation_id: int
    reason: str

class ScoreAppealResponse(BaseModel):
    appeal_id: int
    status: str  # pending, approved, rejected
    message: str
    submitted_at: datetime

class AppealReviewRequest(BaseModel):
    status: str  # approved or rejected
    review_notes: Optional[str] = None

class AppealResponse(BaseModel):
    appeal_id: int
    team_id: int
    team_name: str
    reason: str
    status: str
    submitted_at: datetime
    review_notes: Optional[str] = None


# =============================================
# JUDGE PERFORMANCE METRICS
# =============================================
class JudgePerformanceMetrics(BaseModel):
    judge_id: int
    total_assigned: int
    completed: int
    in_progress: int
    pending: int
    avg_completion_time: float
    consistency_score: float

class JudgePerformanceResponse(BaseModel):
    hackathon_id: int
    judges: List[JudgePerformanceMetrics]
    total_judges: int


# =============================================
# NOTIFICATIONS
# =============================================
class NotificationCreate(BaseModel):
    title: str
    message: str
    recipient_ids: List[int]

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    recipient_id: int
    read: bool = False
    created_at: datetime


# =============================================
# TEAM PROGRESS TRACKING
# =============================================
class TeamProgressItem(BaseModel):
    team_id: int
    team_name: str
    members_count: int
    project_submitted: bool
    project_title: Optional[str] = None
    total_judges_assigned: int
    evaluations_completed: int
    evaluation_progress: float  # percentage

class TeamProgressResponse(BaseModel):
    hackathon_id: int
    total_teams: int
    teams: List[TeamProgressItem]


# =============================================
# AUTO-ASSIGN JUDGES
# =============================================
class JudgeAutoAssignConfig(BaseModel):
    balanced_workload: bool = True
    judges_per_team: int = 3
    exclude_judge_ids: Optional[List[int]] = None

class JudgeAutoAssignResponse(BaseModel):
    message: str
    assignments_created: int
    total_judges: int
    total_teams: int
    rounds_processed: int

