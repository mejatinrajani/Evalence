import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Phase 3: Achievements & Badges Component
 * Gamification system with badges, progress, and leaderboard
 */

interface BadgeDefinition {
  badge_id: number;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: string;
  points: number;
}

interface UserAchievement {
  achievement_id: number;
  badge_id: number;
  badge_name: string;
  earned_at: string;
  user_name?: string;
  user_id?: number;
}

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_name: string;
  total_points: number;
  badges_earned: number;
  avatar?: string;
}

interface AchievementsBadgesProps {
  current_user_id: number;
  my_achievements: UserAchievement[];
  my_total_points: number;
  available_badges: BadgeDefinition[];
  leaderboard: LeaderboardEntry[];
}

export const AchievementsBadges: React.FC<AchievementsBadgesProps> = ({
  current_user_id,
  my_achievements = [],
  my_total_points = 0,
  available_badges = [],
  leaderboard = [],
}) => {
  const [viewMode, setViewMode] = useState<'overview' | 'collection' | 'leaderboard'>('overview');
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  // Get rarity badge styling
  const getRarityColor = (rarity: string) => {
    const rarityColors: Record<string, { bg: string; text: string; glow: string }> = {
      common: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        glow: 'shadow-slate-400',
      },
      rare: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        glow: 'shadow-blue-400',
      },
      epic: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        glow: 'shadow-purple-400',
      },
      legendary: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        glow: 'shadow-amber-400',
      },
    };
    return rarityColors[rarity] || rarityColors.common;
  };

  // Check if badge is earned
  const isBadgeEarned = (badge_id: number) => {
    return my_achievements.some((a) => a.badge_id === badge_id);
  };

  // Filter badges based on view
  const filteredBadges = useMemo(() => {
    if (filter === 'earned') {
      return available_badges.filter((b) => isBadgeEarned(b.badge_id));
    }
    if (filter === 'locked') {
      return available_badges.filter((b) => !isBadgeEarned(b.badge_id));
    }
    return available_badges;
  }, [filter, available_badges, my_achievements]);

  const earnedCount = my_achievements.length;
  const totalBadges = available_badges.length;
  const progressPercentage = (earnedCount / totalBadges) * 100;

  // Find current user's leaderboard position
  const userRank = leaderboard.find((entry) => entry.user_id === current_user_id)?.rank || '-';

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl">
      <h2 className="text-3xl font-bold text-slate-900">🏆 Achievements & Badges</h2>

      {/* View Mode Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['overview', 'collection', 'leaderboard'] as const).map((mode) => (
          <motion.button
            key={mode}
            onClick={() => setViewMode(mode)}
            whileHover={{ scale: 1.05 }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === mode
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-white text-slate-700 border-2 border-slate-200'
            }`}
          >
            {mode === 'overview' && '📊 Overview'}
            {mode === 'collection' && '🎖️ Collection'}
            {mode === 'leaderboard' && '🥇 Leaderboard'}
          </motion.button>
        ))}
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="p-6 bg-white rounded-lg border-2 border-amber-300 shadow-lg"
            >
              <p className="text-slate-600 text-sm font-semibold">Total Points</p>
              <p className="text-4xl font-bold text-amber-600 mt-2">{my_total_points}</p>
              <p className="text-xs text-slate-500 mt-2">🚀 Keep grinding!</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-white rounded-lg border-2 border-yellow-300 shadow-lg"
            >
              <p className="text-slate-600 text-sm font-semibold">Badges Earned</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">
                {earnedCount}/{totalBadges}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-white rounded-lg border-2 border-orange-300 shadow-lg"
            >
              <p className="text-slate-600 text-sm font-semibold">Leaderboard Rank</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">#{userRank}</p>
              <p className="text-xs text-slate-500 mt-2">📈 Climb the ranks!</p>
            </motion.div>
          </div>

          {/* Recent Achievements */}
          <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">🎖️ Recent Achievements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {my_achievements.slice(-8).map((achievement, idx) => {
                const badge = available_badges.find((b) => b.badge_id === achievement.badge_id);
                if (!badge) return null;
                return (
                  <motion.div
                    key={achievement.achievement_id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-center p-3 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-lg"
                  >
                    <p className="text-3xl mb-1">{badge.icon}</p>
                    <p className="text-xs font-bold text-slate-900 line-clamp-2">{badge.name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(achievement.earned_at).toLocaleDateString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Streaks & Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3">🔥 Current Streak</h4>
              <p className="text-3xl font-bold text-red-600">5 Days</p>
              <p className="text-sm text-slate-600 mt-2">Keep going to earn the Consistency badge!</p>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3">⭐ Next Milestone</h4>
              <p className="text-sm text-slate-600 mb-2">Earn 500 more points to reach Gold tier</p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Collection Tab */}
      {viewMode === 'collection' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'earned', 'locked'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  filter === f
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {f === 'all' && '✨ All'}
                {f === 'earned' && '✅ Earned'}
                {f === 'locked' && '🔒 Locked'}
              </button>
            ))}
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge, idx) => {
              const earned = isBadgeEarned(badge.badge_id);
              const colors = getRarityColor(badge.rarity);
              return (
                <motion.div
                  key={badge.badge_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedBadge(badge)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    earned
                      ? `${colors.bg} ${colors.text} shadow-lg`
                      : 'bg-slate-100 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-4xl mb-2">{badge.icon}</p>
                    <h4 className="font-bold mb-1">{badge.name}</h4>
                    <div className="flex justify-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={
                            i <
                            (badge.rarity === 'common'
                              ? 1
                              : badge.rarity === 'rare'
                                ? 2
                                : badge.rarity === 'epic'
                                  ? 3
                                  : 4)
                              ? '⭐'
                              : '☆'
                          }
                        />
                      ))}
                    </div>
                    <p className="text-xs mb-2">{badge.points} pts</p>
                    {earned && (
                      <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded font-bold">
                        ✓ Earned
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Leaderboard Tab */}
      {viewMode === 'leaderboard' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {leaderboard.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-lg">
              <p className="text-slate-600">Leaderboard not available yet</p>
            </div>
          ) : (
            leaderboard.slice(0, 20).map((entry, idx) => {
              const isCurrentUser = entry.user_id === current_user_id;
              const medalEmoji =
                entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border-2 flex justify-between items-center ${
                    isCurrentUser
                      ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-blue-500'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center font-bold text-lg min-w-8">
                      {medalEmoji || `#${entry.rank}`}
                    </div>
                    <div>
                      <p className={`font-bold ${isCurrentUser ? 'text-blue-600' : 'text-slate-900'}`}>
                        {entry.user_name}
                        {isCurrentUser && ' (You)'}
                      </p>
                      <p className="text-xs text-slate-600">{entry.badges_earned} badges</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-amber-600">{entry.total_points} pts</p>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedBadge(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="p-6 bg-white rounded-lg max-w-md mx-auto"
          >
            <div className="text-center mb-4">
              <p className="text-6xl mb-3">{selectedBadge.icon}</p>
              <h3 className="text-2xl font-bold text-slate-900">{selectedBadge.name}</h3>
              <p className="text-slate-600 mt-2">{selectedBadge.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-slate-100 rounded">
                <p className="text-xs text-slate-600 font-semibold">Rarity</p>
                <p className="text-lg font-bold text-slate-900 capitalize">
                  {selectedBadge.rarity}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded">
                <p className="text-xs text-slate-600 font-semibold">Points</p>
                <p className="text-lg font-bold text-amber-600">{selectedBadge.points}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded">
                <p className="text-xs text-slate-600 font-semibold">How to Earn</p>
                <p className="text-sm text-slate-900 mt-2">{selectedBadge.criteria}</p>
              </div>
            </div>

            {isBadgeEarned(selectedBadge.badge_id) && (
              <div className="p-3 bg-green-100 text-green-800 rounded font-bold text-center mb-4">
                ✓ You have earned this badge!
              </div>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-bold"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AchievementsBadges;
