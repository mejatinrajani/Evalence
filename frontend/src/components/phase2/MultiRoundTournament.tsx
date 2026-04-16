import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 2: Multi-Round Tournament System
 * Displays tournament brackets and team progression
 */

interface Round {
  id: number;
  name: string;
  status: 'scheduled' | 'active' | 'evaluation' | 'closed';
  order: number;
  bracket_type: string;
  teams: TeamWithStatus[];
  criteria_count: number;
  judges_assigned: number;
}

interface TeamWithStatus {
  id: number;
  name: string;
  status: 'participating' | 'eliminated' | 'advanced' | 'winner';
  seed?: number;
  current_score?: number;
  judges_remaining?: number;
}

interface MultiRoundTournamentProps {
  hackathon_id: number;
  rounds: Round[];
  is_organizer: boolean;
  onRoundStatusChange: (round_id: number, new_status: string) => void;
  onAdvanceTeams: (round_id: number, team_ids: number[]) => void;
}

export const MultiRoundTournament: React.FC<MultiRoundTournamentProps> = ({
  hackathon_id,
  rounds,
  is_organizer,
  onRoundStatusChange,
  onAdvanceTeams,
}) => {
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [advancingTeams, setAdvancingTeams] = useState<Set<number>>(new Set());

  const handleSelectTeam = (team_id: number) => {
    const updated = new Set(advancingTeams);
    if (updated.has(team_id)) {
      updated.delete(team_id);
    } else {
      updated.add(team_id);
    }
    setAdvancingTeams(updated);
  };

  const handleAdvance = (round_id: number) => {
    onAdvanceTeams(round_id, Array.from(advancingTeams));
    setAdvancingTeams(new Set());
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-gray-100 text-gray-700',
      active: 'bg-blue-100 text-blue-700',
      evaluation: 'bg-purple-100 text-purple-700',
      closed: 'bg-green-100 text-green-700',
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const getTeamStatusIcon = (status: string) => {
    const icons = {
      participating: '⚪',
      eliminated: '❌',
      advanced: '✅',
      winner: '🏆',
    };
    return icons[status as keyof typeof icons] || '⚪';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
      <h2 className="text-3xl font-bold text-slate-900 mb-6">🏆 Tournament Bracket</h2>

      {/* Round Timeline */}
      <div className="flex overflow-x-auto gap-3 mb-8 pb-2">
        {rounds.map((round, idx) => (
          <motion.button
            key={round.id}
            onClick={() => setSelectedRound(round.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              selectedRound === round.id
                ? 'bg-blue-600 text-white shadow-lg'
                : `${getStatusColor(round.status)} hover:shadow-md`
            }`}
          >
            <div className="text-sm">Round {round.order}</div>
            <div className="text-xs opacity-75">{round.status}</div>
          </motion.button>
        ))}
      </div>

      {/* Selected Round Details */}
      <AnimatePresence mode="wait">
        {selectedRound && (
          <motion.div
            key={selectedRound}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {rounds.map(
              (round) =>
                round.id === selectedRound && (
                  <div key={round.id} className="bg-white rounded-lg shadow-md p-6">
                    {/* Round Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{round.name}</h3>
                        <p className="text-slate-600">
                          {round.teams.length} teams • {round.criteria_count} criteria •{' '}
                          {round.judges_assigned} judges
                        </p>
                      </div>
                      {is_organizer && (
                        <div className="flex gap-2">
                          {round.status === 'scheduled' && (
                            <button
                              onClick={() => onRoundStatusChange(round.id, 'active')}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                            >
                              ▶️ Start Round
                            </button>
                          )}
                          {round.status === 'active' && (
                            <button
                              onClick={() => onRoundStatusChange(round.id, 'evaluation')}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                            >
                              📊 Move to Evaluation
                            </button>
                          )}
                          {round.status === 'evaluation' && (
                            <button
                              onClick={() => onRoundStatusChange(round.id, 'closed')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                            >
                              ✅ Close Round
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Teams Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {round.teams.map((team) => (
                        <motion.div
                          key={team.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => round.status === 'evaluation' && handleSelectTeam(team.id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            team.status === 'winner'
                              ? 'border-yellow-400 bg-yellow-50'
                              : team.status === 'advanced'
                              ? 'border-green-400 bg-green-50'
                              : team.status === 'eliminated'
                              ? 'border-red-400 bg-red-50'
                              : 'border-blue-400 bg-blue-50'
                          } ${
                            is_organizer && round.status === 'evaluation' && advancingTeams.has(team.id)
                              ? 'ring-2 ring-blue-600 ring-offset-2'
                              : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900">{team.name}</h4>
                              <p className="text-sm text-slate-600">
                                {getTeamStatusIcon(team.status)} {team.status}
                              </p>
                            </div>
                            {team.seed && (
                              <div className="text-xs font-bold bg-slate-200 px-2 py-1 rounded">
                                Seed #{team.seed}
                              </div>
                            )}
                          </div>
                          {team.current_score !== undefined && (
                            <div className="mt-3 pt-3 border-t border-slate-300">
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Score:</span>
                                <span className="font-bold text-slate-900">{team.current_score}</span>
                              </div>
                              {team.judges_remaining !== undefined && (
                                <div className="mt-1 text-xs text-slate-600">
                                  {team.judges_remaining} judges pending
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* Advance Teams Controls */}
                    {is_organizer && round.status === 'evaluation' && advancingTeams.size > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-blue-50 border border-blue-300 rounded-lg"
                      >
                        <button
                          onClick={() => handleAdvance(round.id)}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                        >
                          ✈️ Advance {advancingTeams.size} Team{advancingTeams.size !== 1 ? 's' : ''} to
                          Next Round
                        </button>
                      </motion.div>
                    )}
                  </div>
                )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {rounds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg">No rounds created yet</p>
        </div>
      )}
    </div>
  );
};

export default MultiRoundTournament;
