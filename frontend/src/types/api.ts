// ============================================
// Unified API Types for All Phases
// ============================================

// ============================================
// AUTH & USER TYPES
// ============================================

export interface User {
  id: number
  email: string
  full_name: string
  role: 'participant' | 'mentor' | 'judge' | 'super_admin' | 'coordinator'
  bio?: string
  github_url?: string
  skills?: string[]
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface AuthToken {
  access_token: string
  refresh_token: string
  token_type: string
  role: string
  full_name: string
  user_id: number
}

export interface AuthResponse {
  message?: string
  token?: AuthToken
  user?: User
}

// ============================================
// HACKATHON TYPES (PHASE 1)
// ============================================

export interface Criterion {
  id: number
  name: string
  description?: string
  weight?: number
  max_points?: number
  round_id?: number
}

export interface Round {
  id: number
  name: string
  description?: string
  hackathon_id?: number
  criteria: Criterion[]
  created_at?: string
  updated_at?: string
}

export interface Team {
  id: number
  name: string
  members: TeamMember[]
  hackathon_id: number
  created_at?: string
  updated_at?: string
  status?: string
}

export interface TeamMember {
  id?: string
  name: string
  email: string
  role?: string
}

export interface Project {
  id: number
  title: string
  description: string
  github_url?: string
  demo_url?: string
  tech_stack?: string[]
  team_id: number
  hackathon_id: number
  created_at?: string
  updated_at?: string
}

export interface Hackathon {
  id: number
  name: string
  description: string
  start_date: string
  end_date: string
  prize_pool?: number
  max_teams?: number
  status: 'registration_open' | 'in_progress' | 'evaluation' | 'results'
  mentor_id: number
  created_at?: string
  updated_at?: string
  rounds?: Round[]
  teams?: Team[]
}

export interface HackathonDetail extends Hackathon {
  judges?: { id: number; user_id: number; assigned_at: string }[]
  coordinators?: { id: number; user_id: number; assigned_at: string }[]
  credentials?: Credentials[]
}

export interface Credentials {
  id: number
  hackathon_id: number
  username: string
  person_name: string
  role: 'judge' | 'coordinator'
  is_active: boolean
  created_at?: string
}

export interface CredentialsWithPassword extends Credentials {
  password?: string
}

// ============================================
// EVALUATION & SCORING (PHASE 1)
// ============================================

export interface EvaluationScore {
  criteria_id: number
  score: number
  comment?: string
}

export interface Evaluation {
  id: number
  judge_id: number
  team_id: number
  round_id: number
  hackathon_id: number
  score?: number
  scores?: EvaluationScore[]
  feedback?: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at?: string
  updated_at?: string
}

export interface EvaluationHistory {
  id: number
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  criteria_count: number
  total_score: number
  average_score: number
  created_at?: string
  updated_at?: string
}

export interface TeamLeaderboard {
  team_id: number
  team_name: string
  raw_score_sum: number
  z_score_total: number
  eval_count: number
  rank?: number
}

export interface Announcement {
  id: number
  hackathon_id: number
  title: string
  body: string
  author_id: number
  created_at?: string
  updated_at?: string
}

// ============================================
// JUDGE PORTAL TYPES (PHASE 2)
// ============================================

export interface JudgeAssignment {
  id: number
  hackathon_id: number
  judge_id: number
  team_id: number
  round_id: number
  status: 'pending' | 'evaluating' | 'completed' | 'finalized'
  assigned_at?: string
  started_at?: string
  completed_at?: string
}

export interface TeamQueueItem {
  id: number
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  status: string
  assigned_at?: string
  started_at?: string
  completed_at?: string
  members?: TeamMember[]
  project_title?: string
  project_description?: string
  criteria_count?: number
  total_possible_points?: number
}

export interface CriterionEvaluation {
  criterion_id: number
  criterion_name: string
  max_points: number
  current_score?: number
  feedback?: string
  description?: string
}

export interface TeamEvaluationDetail {
  assignment_id: number
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  project_title?: string
  project_description?: string
  demo_url?: string
  github_url?: string
  tech_stack?: string[]
  members: TeamMember[]
  criteria: CriterionEvaluation[]
  status: string
  assigned_at?: string
  started_at?: string
  completed_at?: string
}

export interface JudgeDashboard {
  total_assigned: number
  completed: number
  pending: number
  in_progress: number
  completion_percentage: number
  current_round?: { id: number; name: string; criteria_count: number }
  upcoming_rounds: { id: number; name: string; criteria_count: number }[]
  recent_activity: { type: string; team_id: number; team_name: string; score?: number; timestamp?: string }[]
}

export interface JudgeProgress {
  total_evaluations: number
  completed_evaluations: number
  pending_evaluations: number
  average_score: number
  score_distribution: { A: number; B: number; C: number; D: number; F: number }
  top_performing_criteria: { criterion_id: number; name: string; average_score: number; percentage: number; count: number }[]
  lowest_performing_criteria: { criterion_id: number; name: string; average_score: number; percentage: number; count: number }[]
  completion_trend: { date: string; completed: number }[]
}

// ============================================
// TOURNAMENT & ANALYTICS (PHASE 2)
// ============================================

export interface RoundEnhanced {
  id: number
  name: string
  description?: string
  order: number
  bracket_type: string
  is_blind_evaluation: boolean
  start_date?: string
  end_date?: string
  evaluation_deadline?: string
  min_score: number
  max_score: number
  status: string
  hackathon_id: number
  created_at?: string
}

export interface Appeal {
  id: number
  evaluation_id: number
  appeal_description: string
  status: 'open' | 'in_review' | 'resolved'
  resolver_notes?: string
  created_at?: string
  updated_at?: string
}

export interface Notification {
  id: number
  recipient_id: number
  type: string
  title: string
  body: string
  is_read: boolean
  created_at?: string
}

export interface ScoringAnalytic {
  id: number
  round_id: number
  team_id?: number
  judge_id?: number
  average_score: number
  median_score: number
  score_distribution: Record<string, number>
  variance: number
  skewness: number
}

export interface JudgeBiasAnalysis {
  id: number
  round_id: number
  judge_id: number
  lenient_ratio: number
  harsh_ratio: number
  consistency_score: number
  bias_score: number
}

// ============================================
// AI & ADVANCED FEATURES (PHASE 3)
// ============================================

export interface AIScoringModel {
  id: number
  name: string
  version: string
  model_type: string
  accuracy?: number
  last_trained?: string
}

export interface ScoringPrediction {
  id: number
  team_id: number
  predicted_score: number
  confidence_level: number
  key_factors: Record<string, number>
  created_at?: string
}

export interface MentorshipRequest {
  id: number
  mentor_id?: number
  mentee_id: number
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  message?: string
  requested_at?: string
  accepted_at?: string
}

export interface MentorshipSession {
  id: number
  request_id: number
  session_date: string
  duration_minutes: number
  topic: string
  notes?: string
  created_at?: string
}

export interface TeamMessage {
  id: number
  team_id: number
  sender_id: number
  sender_name: string
  message: string
  type: 'text' | 'update' | 'alert'
  created_at?: string
}

export interface HackathonAnnouncement {
  id: number
  hackathon_id: number
  title: string
  body: string
  priority: 'low' | 'medium' | 'high'
  published_at?: string
  expires_at?: string
}

export interface UserConnection {
  id: number
  user_id_1: number
  user_id_2: number
  connection_type: 'mentor' | 'peer' | 'judge'
  status: 'pending' | 'connected' | 'ended'
  created_at?: string
}

export interface GeneratedReport {
  id: number
  hackathon_id: number
  report_type: string
  content: string
  generated_at?: string
  file_url?: string
}

export interface AchievementBadge {
  id: number
  name: string
  description: string
  icon_url?: string
  criteria: string
}

export interface UserAchievement {
  id: number
  user_id: number
  badge_id: number
  earned_at?: string
  badge?: AchievementBadge
}

// ============================================
// ANALYTICS & REPORTING
// ============================================

export interface HackathonStats {
  hackathon_id: number
  hackathon_name: string
  total_teams: number
  total_projects: number
  projects_submitted: number
  submission_rate: number
  total_evaluations: number
  expected_evaluations: number
  evaluation_progress: number
  status: string
  criteria_stats: Record<string, any>
}

export interface LiveAnalytics {
  hackathon_id: number
  snapshot: {
    total_registered: number
    teams_registered: number
    projects_submitted: number
    judges_assigned: number
    eval_started: number
    eval_completed: number
    participants_count: number
    average_score: number
  }
  last_updated?: string
}

export interface PlatformStats {
  total_hackathons: number
  total_teams: number
  total_evaluations: number
  pending_evaluations: number
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface CreateHackathonData {
  name: string
  description: string
  start_date: string
  end_date: string
  prize_pool?: number
  max_teams?: number
  teams?: { name: string; members: TeamMember[] }[]
  rounds?: { name: string; criteria: { name: string; weight: number }[] }[]
}

export interface CreateTeamData {
  name: string
  members: TeamMember[]
}

export interface SubmitEvaluationData {
  team_id: number
  round_id: number
  scores: Record<number, number>
  feedback?: Record<number, string>
}

export interface AssignJudgeData {
  judge_id: number
  team_id: number
  round_id: number
}

// ============================================
// FILTER & QUERY TYPES
// ============================================

export interface HackathonFilter {
  status?: string
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'start_date' | 'name'
  sort_order?: 'asc' | 'desc'
}

export interface EvaluationFilter {
  hackathon_id?: number
  round_id?: number
  judge_id?: number
  status?: string
  skip?: number
  limit?: number
}
