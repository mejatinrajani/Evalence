/**
 * Frontend Library Exports
 * 
 * This barrel export provides convenient access to all API utilities.
 * Separates concerns: lib/api.ts handles implementation, types/api.ts handles types
 * 
 * USAGE:
 *   import { api, PHASE1_ENDPOINTS, User } from '@/lib'
 *   import type { Hackathon, Team } from '@/types/api'
 */

// Re-export API client implementation
export { api, BASE_URL, PHASE1_ENDPOINTS, PHASE2_ENDPOINTS, PHASE3_ENDPOINTS, ORG_ENDPOINTS } from './api'

// Re-export all types for convenience
export type {
  // Auth & User
  User,
  AuthToken,
  AuthResponse,
  // Hackathon & Teams
  Criterion,
  Round,
  Team,
  TeamMember,
  Project,
  Hackathon,
  HackathonDetail,
  Credentials,
  CredentialsWithPassword,
  // Evaluations
  EvaluationScore,
  Evaluation,
  EvaluationHistory,
  TeamLeaderboard,
  Announcement,
  // Judge Portal
  JudgeAssignment,
  TeamQueueItem,
  CriterionEvaluation,
  TeamEvaluationDetail,
  JudgeDashboard,
  JudgeProgress,
  // Phase 2
  RoundEnhanced,
  Appeal,
  Notification,
  ScoringAnalytic,
  JudgeBiasAnalysis,
  // Phase 3
  AIScoringModel,
  ScoringPrediction,
  MentorshipRequest,
  MentorshipSession,
  TeamMessage,
  HackathonAnnouncement,
  UserConnection,
  GeneratedReport,
  AchievementBadge,
  UserAchievement,
  // Analytics
  HackathonStats,
  LiveAnalytics,
  PlatformStats,
  // Utilities
  ApiResponse,
  PaginatedResponse,
  CreateHackathonData,
  CreateTeamData,
  SubmitEvaluationData,
  AssignJudgeData,
} from '@/types/api'
