/**
 * Phase 3: Component Library & Custom Hooks
 * Exports all Phase 3 components and provides shared utilities
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================
// COMPONENTS EXPORTS
// ============================================================

export { AIInsights } from './AIInsights';
export { MentorshipMatching } from './MentorshipMatching';
export { TeamMessaging } from './TeamMessaging';
export { AchievementsBadges } from './AchievementsBadges';
export { AdvancedReporting } from './AdvancedReporting';

// ============================================================
// TYPESCRIPT INTERFACES
// ============================================================

export interface AIPrediction {
  team_id: number;
  team_name: string;
  predicted_score: number;
  confidence_level: number;
  key_factors: {
    current_average: number;
    judges_evaluated: number;
    trend: string;
  };
  recommendation: string;
}

export interface MentorProfile {
  mentor_id: number;
  mentor_name: string;
  expertise: string[];
  bio: string;
  rating: number;
  sessions_completed: number;
  availability: string;
  profile_image?: string;
}

export interface MentorshipRequest {
  request_id: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  mentor_name?: string;
  requested_date: string;
  accepted_date?: string;
}

export interface MentorshipSession {
  session_id: number;
  mentor_name: string;
  topic: string;
  date: string;
  duration_minutes: number;
  notes: string;
  rating?: number;
}

export interface TeamMessage {
  message_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  attachments?: {
    type: 'link' | 'file' | 'image';
    url: string;
    name?: string;
  }[];
  is_pinned: boolean;
  created_at: string;
  edited_at?: string;
}

export interface BadgeDefinition {
  badge_id: number;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: string;
  points: number;
}

export interface UserAchievement {
  achievement_id: number;
  badge_id: number;
  badge_name: string;
  earned_at: string;
  user_name?: string;
  user_id?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_name: string;
  total_points: number;
  badges_earned: number;
  avatar?: string;
}

// ============================================================
// CUSTOM HOOKS
// ============================================================

/**
 * Hook: useAIPredictions
 * Manages AI scoring predictions state and API calls
 */
export const useAIPredictions = (hackathon_id: number) => {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [model_accuracy, setModelAccuracy] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      // API call would go here
      // const response = await fetch(`/api/ai/predict/${hackathon_id}`);
      // setPredictions(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, [hackathon_id]);

  const trainModel = useCallback(async () => {
    setLoading(true);
    try {
      // API call would go here
      // const response = await fetch(`/api/ai/train-model/${hackathon_id}`, {
      //   method: 'POST'
      // });
      // const data = await response.json();
      // setModelAccuracy(data.accuracy);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to train model');
    } finally {
      setLoading(false);
    }
  }, [hackathon_id]);

  return { predictions, model_accuracy, loading, error, fetchPredictions, trainModel };
};

/**
 * Hook: useMentorship
 * Manages mentorship requests, matching, and sessions
 */
export const useMentorship = (hackathon_id: number, user_id: number) => {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMentors = useCallback(async () => {
    setLoading(true);
    try {
      // API call would go here
      // const response = await fetch(`/api/mentorship/available/${hackathon_id}`);
      // setMentors(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mentors');
    } finally {
      setLoading(false);
    }
  }, [hackathon_id]);

  const sendMentorshipRequest = useCallback(
    async (mentor_id: number, skills: string[], message: string) => {
      try {
        // API call would go here
        // const response = await fetch(`/api/mentorship/request`, {
        //   method: 'POST',
        //   body: JSON.stringify({ mentor_id, mentee_id: user_id, skills, message })
        // });
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send request');
        return false;
      }
    },
    [user_id]
  );

  const logSession = useCallback(
    async (mentorship_id: number, topic: string, notes: string, duration: number) => {
      try {
        // API call would go here
        // const response = await fetch(`/api/mentorship/${mentorship_id}/session`, {
        //   method: 'POST',
        //   body: JSON.stringify({ topic, notes, duration_minutes: duration })
        // });
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log session');
        return false;
      }
    },
    []
  );

  return {
    mentors,
    requests,
    sessions,
    loading,
    error,
    fetchMentors,
    sendMentorshipRequest,
    logSession,
  };
};

/**
 * Hook: useTeamMessaging
 * Manages team chat messages, real-time updates, and pinning
 */
export const useTeamMessaging = (team_id: number, user_id: number) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMessages = useCallback(async (limit = 50, offset = 0) => {
    setLoading(true);
    try {
      // API call would go here
      // const response = await fetch(`/api/messages/${team_id}?limit=${limit}&offset=${offset}`);
      // setMessages(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [team_id]);

  const sendMessage = useCallback(
    async (content: string, attachments?: any[]) => {
      try {
        // API call would go here
        // const response = await fetch(`/api/messages/${team_id}`, {
        //   method: 'POST',
        //   body: JSON.stringify({ content, attachments, sender_id: user_id })
        // });
        // const newMessage = await response.json();
        // setMessages(prev => [...prev, newMessage]);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return false;
      }
    },
    [team_id, user_id]
  );

  const pinMessage = useCallback(
    async (message_id: number) => {
      try {
        // API call would go here
        // await fetch(`/api/messages/${message_id}/pin`, { method: 'PUT' });
        // Update local state
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === message_id ? { ...msg, is_pinned: !msg.is_pinned } : msg
          )
        );
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to pin message');
        return false;
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    unreadCount,
    fetchMessages,
    sendMessage,
    pinMessage,
  };
};

/**
 * Hook: useAchievements
 * Manages user achievements, badges, and leaderboard
 */
export const useAchievements = (user_id: number, hackathon_id: number) => {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    try {
      // API call would go here
      // const [achievResp, badgeResp, leaderResp, pointsResp] = await Promise.all([
      //   fetch(`/api/achievements/${user_id}`),
      //   fetch(`/api/badges`),
      //   fetch(`/api/leaderboard/${hackathon_id}`),
      //   fetch(`/api/user-points/${user_id}`)
      // ]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch achievements');
    } finally {
      setLoading(false);
    }
  }, [user_id, hackathon_id]);

  return {
    achievements,
    badges,
    leaderboard,
    userPoints,
    loading,
    error,
    fetchAchievements,
  };
};

/**
 * Hook: useReporting
 * Manages report generation, export, and download
 */
export const useReporting = (hackathon_id: number) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const generateReport = useCallback(
    async (type: string, format: string) => {
      setLoading(true);
      setDownloadProgress(0);
      try {
        // API call would go here
        // const response = await fetch(`/api/reports/${hackathon_id}`, {
        //   method: 'POST',
        //   body: JSON.stringify({ type, format })
        // });
        // const report = await response.json();
        // setReports(prev => [...prev, report]);
        setDownloadProgress(100);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate report');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [hackathon_id]
  );

  const exportData = useCallback(
    async (format: string) => {
      setLoading(true);
      try {
        // API call would go here
        // const response = await fetch(`/api/reports/export/${hackathon_id}?format=${format}`);
        // const blob = await response.blob();
        // Create download link
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export data');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [hackathon_id]
  );

  return {
    reports,
    loading,
    error,
    downloadProgress,
    generateReport,
    exportData,
  };
};

/**
 * Hook: usePhase3Data
 * Combined hook for all Phase 3 data fetching and state management
 */
export const usePhase3Data = (hackathon_id: number, user_id: number) => {
  const ai = useAIPredictions(hackathon_id);
  const mentorship = useMentorship(hackathon_id, user_id);
  const messaging = useTeamMessaging(0, user_id); // team_id would come from context
  const achievements = useAchievements(user_id, hackathon_id);
  const reporting = useReporting(hackathon_id);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      ai.fetchPredictions(),
      mentorship.fetchMentors(),
      messaging.fetchMessages(),
      achievements.fetchAchievements(),
    ]);
  }, [
    ai.fetchPredictions,
    mentorship.fetchMentors,
    messaging.fetchMessages,
    achievements.fetchAchievements,
  ]);

  return {
    ai,
    mentorship,
    messaging,
    achievements,
    reporting,
    loadAllData,
  };
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format time to readable string
 */
export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Calculate time ago from date
 */
export const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(dateString);
};

/**
 * Get badge rarity color
 */
export const getBadgeRarityColor = (
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
): { bg: string; text: string } => {
  const colors: Record<string, { bg: string; text: string }> = {
    common: { bg: 'bg-slate-100', text: 'text-slate-700' },
    rare: { bg: 'bg-blue-100', text: 'text-blue-700' },
    epic: { bg: 'bg-purple-100', text: 'text-purple-700' },
    legendary: { bg: 'bg-amber-100', text: 'text-amber-700' },
  };
  return colors[rarity] || colors.common;
};

/**
 * Calculate confidence color based on percentage
 */
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-blue-500';
  if (confidence >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * Generate random color from a set of predefined colors
 */
export const getRandomColor = (): string => {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// ============================================================
// CONTEXT PROVIDERS (Optional - for shared state)
// ============================================================

import { createContext, useContext, ReactNode } from 'react';

export interface Phase3ContextType {
  hackathon_id: number;
  user_id: number;
  user_name: string;
  is_organizer: boolean;
  data: ReturnType<typeof usePhase3Data>;
}

export const Phase3Context = createContext<Phase3ContextType | undefined>(undefined);

export const usePhase3Context = (): Phase3ContextType => {
  const context = useContext(Phase3Context);
  if (!context) {
    throw new Error('usePhase3Context must be used within Phase3Provider');
  }
  return context;
};

export interface Phase3ProviderProps {
  children: ReactNode;
  value: Phase3ContextType;
}

export const Phase3Provider: React.FC<Phase3ProviderProps> = ({ children, value }) => (
  <Phase3Context.Provider value={value}>{children}</Phase3Context.Provider>
);

export default {
  // Re-export everything
};
