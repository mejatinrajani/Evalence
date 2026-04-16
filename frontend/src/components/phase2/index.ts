import React from 'react';

/**
 * Phase 2 Components Library
 * All Real-Time Tournament & Analytics Components
 */

// ==================== MULTI-ROUND TOURNAMENT ====================
export { MultiRoundTournament } from './MultiRoundTournament';
export type { RoundEnhancedResponse as Round } from './MultiRoundTournament';

// ==================== APPEALS SYSTEM ====================
export { AppealForm } from './AppealForm';
export type { AppealData } from './AppealForm';

// ==================== NOTIFICATIONS ====================
export { NotificationCenter } from './NotificationCenter';
export type { Notification, NotificationType } from './NotificationCenter';

// ==================== ANALYTICS & INSIGHTS ====================
export { AnalyticsDashboard } from './AnalyticsDashboard';
export type { AnalyticsData, JudgeAnalysis } from './AnalyticsDashboard';

// ==================== REAL-TIME LEADERBOARD ====================
export { RealTimeLeaderboard } from './RealTimeLeaderboard';
export type { LeaderboardTeam } from './RealTimeLeaderboard';

// ==================== TYPES ====================
export interface Phase2Config {
  enableWebSocket: boolean;
  enableAnalytics: boolean;
  enableAppeals: boolean;
  enableMultiRound: boolean;
  analyticsRefreshInterval: number; // ms
  notificationRefreshInterval: number; // ms
}

export interface Round {
  id: number;
  name: string;
  status: 'scheduled' | 'active' | 'evaluation' | 'closed';
  order: number;
  bracket_type: string;
  teams: TeamWithStatus[];
  criteria_count: number;
  judges_assigned: number;
}

export interface TeamWithStatus {
  id: number;
  name: string;
  status: 'participating' | 'eliminated' | 'advanced' | 'winner';
  seed?: number;
  current_score?: number;
  judges_remaining?: number;
}

export interface AppealFormData {
  team_id: number;
  appeal_type: 'score_dispute' | 'judge_bias' | 'technical_issue' | 'rule_violation';
  title: string;
  description: string;
  evidence_url?: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  hackathon_id?: number;
  related_id?: number;
}

export interface AnalyticsData {
  total_evaluations: number;
  average_score: number;
  std_deviation: number;
  min_score: number;
  max_score: number;
  judge_count: number;
  teams_evaluated: number;
  score_distribution: Record<string, number>;
}

export interface JudgeAnalysis {
  judge_id: number;
  judge_name: string;
  average_score: number;
  score_count: number;
  deviation_from_average: number;
  bias_type: string | null;
  flag_status: string;
}

export interface LeaderboardTeam {
  rank: number;
  team_id: number;
  name: string;
  score: number;
  previous_score?: number;
  judges_completed: number;
  judges_total: number;
  status: 'pending' | 'evaluated' | 'winner';
  z_score?: number;
  deviation?: number;
}

// ==================== WEBSOCKET EVENTS ====================
export type WebSocketEventType =
  | 'EVALUATION_SUBMITTED'
  | 'TEAM_ADVANCED'
  | 'LEADERBOARD_UPDATED'
  | 'JUDGE_ASSIGNED'
  | 'APPEAL_STATUS_CHANGED'
  | 'ROUND_STARTED'
  | 'ROUND_ENDING_SOON'
  | 'PERMISSION_GRANTED'
  | 'MESSAGE_RECEIVED';

export interface WebSocketEvent {
  type: WebSocketEventType;
  timestamp: string;
  data: Record<string, any>;
  message: string;
}

// ==================== API HOOKS ====================

/**
 * useRounds - Fetch and manage tournament rounds
 */
export const useRounds = (hackathon_id: number) => {
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRounds = async () => {
      try {
        const response = await fetch(`/api/rounds/${hackathon_id}`);
        const data = await response.json();
        setRounds(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rounds');
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, [hackathon_id]);

  return { rounds, loading, error };
};

/**
 * useNotifications - Real-time notifications with WebSocket
 */
export const useNotifications = (user_id: number, hackathon_id: number) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const ws = new WebSocket(
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/${user_id}/${hackathon_id}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount((prev) => prev + 1);
    };

    return () => ws.close();
  }, [user_id, hackathon_id]);

  const markAsRead = async (notification_id: number) => {
    await fetch(`/api/notifications/${notification_id}/read`, {
      method: 'PUT',
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification_id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, markAllRead };
};

/**
 * useAnalytics - Fetch scoring and judge analytics
 */
export const useAnalytics = (hackathon_id: number, round_id?: number) => {
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [judgePerformance, setJudgePerformance] = React.useState<JudgeAnalysis[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const params = new URLSearchParams();
        if (round_id) params.append('round_id', round_id.toString());

        const [analyticsRes, performanceRes] = await Promise.all([
          fetch(`/api/analytics/${hackathon_id}/scoring-summary?${params}`),
          fetch(`/api/analytics/${hackathon_id}/judge-performance?${params}`),
        ]);

        const analyticsData = await analyticsRes.json();
        const performanceData = await performanceRes.json();

        setAnalytics(analyticsData);
        setJudgePerformance(performanceData);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [hackathon_id, round_id]);

  return { analytics, judgePerformance, loading };
};

/**
 * useAppeals - Submit and manage appeals
 */
export const useAppeals = (hackathon_id: number) => {
  const [appeals, setAppeals] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const submitAppeal = async (appealData: AppealFormData) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/appeals/?hackathon_id=${hackathon_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appealData),
      });

      if (!response.ok) throw new Error('Failed to submit appeal');

      const newAppeal = await response.json();
      setAppeals((prev) => [newAppeal, ...prev]);
      return newAppeal;
    } finally {
      setLoading(false);
    }
  };

  return { appeals, submitAppeal, loading };
};

// ==================== CONTEXT PROVIDERS ====================

/**
 * Phase2Context - Share Phase 2 state across app
 */
export const Phase2Context = React.createContext<{
  config: Phase2Config;
  updateConfig: (config: Partial<Phase2Config>) => void;
}>({
  config: {
    enableWebSocket: true,
    enableAnalytics: true,
    enableAppeals: true,
    enableMultiRound: true,
    analyticsRefreshInterval: 30000,
    notificationRefreshInterval: 5000,
  },
  updateConfig: () => {},
});

export const Phase2Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = React.useState<Phase2Config>({
    enableWebSocket: true,
    enableAnalytics: true,
    enableAppeals: true,
    enableMultiRound: true,
    analyticsRefreshInterval: 30000,
    notificationRefreshInterval: 5000,
  });

  const updateConfig = (updates: Partial<Phase2Config>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <Phase2Context.Provider value={{ config, updateConfig }}>
      {children}
    </Phase2Context.Provider>
  );
};

export const usePhase2Config = () => {
  const context = React.useContext(Phase2Context);
  if (!context) {
    throw new Error('usePhase2Config must be used within Phase2Provider');
  }
  return context;
};

// ==================== EXPORTS ====================

export default {
  // Components
  MultiRoundTournament: React.lazy(
    () => import('./MultiRoundTournament')
  ),
  AppealForm: React.lazy(() => import('./AppealForm')),
  NotificationCenter: React.lazy(() => import('./NotificationCenter')),
  AnalyticsDashboard: React.lazy(() => import('./AnalyticsDashboard')),
  RealTimeLeaderboard: React.lazy(() => import('./RealTimeLeaderboard')),

  // Hooks
  useRounds,
  useNotifications,
  useAnalytics,
  useAppeals,

  // Provider
  Phase2Provider,
  usePhase2Config,
};
