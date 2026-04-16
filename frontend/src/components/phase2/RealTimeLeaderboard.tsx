import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 2: Real-Time Leaderboard with WebSocket Updates
 * Live scoring updates with animations
 */

interface LeaderboardTeam {
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

interface RealTimeLeaderboardProps {
  hackathon_id: number;
  teams: LeaderboardTeam[];
  isLoading?: boolean;
  show_z_scores?: boolean;
  update_frequency?: number; // ms
}

const ScoreChangeIndicator: React.FC<{ previous?: number; current: number }> = ({
  previous,
  current,
}) => {
  if (!previous) return null;

  const change = current - previous;
  if (change === 0) return <span className="text-slate-500">→</span>;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`font-bold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}
    >
      {change > 0 ? '📈' : '📉'} {change > 0 ? '+' : ''}{change.toFixed(1)}
    </motion.span>
  );
};

const MedalIcon: React.FC<{ rank: number }> = ({ rank }) => {
  const medals = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };
  return <span className="text-2xl">{medals[rank as keyof typeof medals] || `#${rank}`}</span>;
};

export const RealTimeLeaderboard: React.FC<RealTimeLeaderboardProps> = ({
  hackathon_id,
  teams,
  isLoading = false,
  show_z_scores = true,
  update_frequency = 5000,
}) => {
  const [displayTeams, setDisplayTeams] = useState(teams);
  const [highlightedTeam, setHighlightedTeam] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'evaluated' | 'pending'>('all');

  useEffect(() => {
    setDisplayTeams(teams);
  }, [teams]);

  // Highlight updated scores
  useEffect(() => {
    const updateUsage = new Map();
    teams.forEach((team) => {
      if (team.previous_score && team.previous_score !== team.score) {
        setHighlightedTeam(team.team_id);
        setTimeout(() => setHighlightedTeam(null), 2000);
      }
    });
  }, [teams]);

  const filteredTeams = displayTeams.filter((t) => {
    if (filterStatus === 'evaluated') return t.status === 'evaluated' || t.status === 'winner';
    if (filterStatus === 'pending') return t.status === 'pending';
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600 animate-pulse">⏳ Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">🏆 Live Leaderboard</h2>
        <div className="flex gap-2">
          {(['all', 'evaluated', 'pending'] as const).map((status) => (
            <motion.button
              key={status}
              onClick={() => setFilterStatus(status)}
              whileHover={{ scale: 1.05 }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {status === 'all' && '📊 All'}
              {status === 'evaluated' && '✅ Finalized'}
              {status === 'pending' && '⏳ In Progress'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Top 3 Highlights */}
      {filteredTeams.slice(0, 3).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredTeams.slice(0, 3).map((team, idx) => (
            <motion.div
              key={team.team_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-lg text-white text-center transform ${
                idx === 0
                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 scale-105'
                  : idx === 1
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                  : 'bg-gradient-to-br from-orange-400 to-orange-500'
              }`}
            >
              <div className="text-5xl mb-2">
                <MedalIcon rank={team.rank} />
              </div>
              <h3 className="text-xl font-bold mb-2">{team.name}</h3>
              <div className="text-3xl font-bold">{team.score.toFixed(1)}</div>
              {show_z_scores && team.z_score !== undefined && (
                <p className="text-sm mt-2 opacity-90">Z-Score: {team.z_score.toFixed(2)}</p>
              )}
              <p className="text-xs mt-2">
                {team.judges_completed} of {team.judges_total} judges
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Rankings Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-lg overflow-hidden"
      >
        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold text-sm">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Team</div>
          <div className="col-span-2">Score</div>
          <div className="col-span-2">Progress</div>
          {show_z_scores && <div className="col-span-3">Z-Score</div>}
        </div>

        {/* Teams List */}
        <div className="divide-y divide-slate-200">
          <AnimatePresence>
            {filteredTeams.map((team, idx) => (
              <motion.div
                key={team.team_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  highlightedTeam === team.team_id ? 'bg-blue-100' : ''
                } ${team.status === 'winner' ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
              >
                {/* Mobile View */}
                <div className="md:hidden space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        <MedalIcon rank={team.rank} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{team.name}</h4>
                        <p className="text-xs text-slate-600">
                          {team.judges_completed}/{team.judges_total} evaluated
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{team.score.toFixed(1)}</p>
                      <ScoreChangeIndicator
                        previous={team.previous_score}
                        current={team.score}
                      />
                    </div>
                  </div>

                  {/* Progress Bar on Mobile */}
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(team.judges_completed / team.judges_total) * 100}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    />
                  </div>

                  {show_z_scores && team.z_score !== undefined && (
                    <p className="text-xs text-slate-600">
                      Z-Score: {team.z_score.toFixed(2)} (Deviation: {team.deviation?.toFixed(1)})
                    </p>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                  {/* Rank */}
                  <div className="col-span-1">
                    <div className="text-2xl">
                      <MedalIcon rank={team.rank} />
                    </div>
                  </div>

                  {/* Team Name */}
                  <div className="col-span-4">
                    <h4 className="font-bold text-slate-900 truncate">{team.name}</h4>
                    <p className="text-xs text-slate-600">
                      {team.status === 'winner' && '🏆 Winner • '}
                      {team.status === 'evaluated' && '✅ Evaluated • '}
                      {team.status === 'pending' && '⏳ Evaluating • '}
                      {team.judges_total} judges total
                    </p>
                  </div>

                  {/* Score */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {team.score.toFixed(1)}
                      </span>
                      <ScoreChangeIndicator
                        previous={team.previous_score}
                        current={team.score}
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(team.judges_completed / team.judges_total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-12 text-right">
                        {team.judges_completed}/{team.judges_total}
                      </span>
                    </div>
                  </div>

                  {/* Z-Score */}
                  {show_z_scores && (
                    <div className="col-span-3">
                      {team.z_score !== undefined ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{team.z_score.toFixed(2)}</span>
                          <span className="text-xs text-slate-600">
                            {team.deviation && team.deviation > 0 ? '📈 +' : '📉 '}
                            {team.deviation?.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredTeams.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-600">
              {filterStatus === 'evaluated' && '✅ No teams finalized yet'}
              {filterStatus === 'pending' && '⏳ No teams in evaluation'}
              {filterStatus === 'all' && 'No teams available'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 px-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full" />
          Updated
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full" />
          Highlighted
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded-full" />
          Winner
        </div>
        {show_z_scores && (
          <div className="flex items-center gap-2">
            <span>📊</span>
            Normalized
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeLeaderboard;
