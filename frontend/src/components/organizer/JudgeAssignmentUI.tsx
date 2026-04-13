import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface Judge {
  id: number;
  person_name: string;
  username: string;
}

interface Team {
  id: number;
  name: string;
  members: any[];
}

interface Assignment {
  id: number;
  judge_id: number;
  team_id: number;
  status: string;
}

interface JudgeAssignmentUIProps {
  hackathonId: number;
}

export default function JudgeAssignmentUI({ hackathonId }: JudgeAssignmentUIProps) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [hackathonId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [judgesData, teamsData, assignmentsData] = await Promise.all([
        api.request(`/me/hackathons/${hackathonId}/judges`),
        api.request(`/hackathons/${hackathonId}/teams`),
        api.request(`/me/hackathons/${hackathonId}/judge-assignments`)
      ]);
      setJudges(judgesData);
      setTeams(teamsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to fetch assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedJudge || !selectedTeam) {
      alert('Please select both a judge and a team');
      return;
    }

    try {
      const newAssignment = await api.request(
        `/me/hackathons/${hackathonId}/judge-assignments`,
        {
          method: 'POST',
          body: JSON.stringify({
            judge_id: selectedJudge,
            team_id: selectedTeam,
            round_id: null
          })
        }
      );
      setAssignments([...assignments, newAssignment]);
      setSelectedJudge(null);
      setSelectedTeam(null);
      setShowAssignForm(false);
      alert('Judge assigned successfully!');
    } catch (error: any) {
      console.error('Failed to assign judge:', error);
      alert(error.response?.data?.detail || 'Failed to assign judge');
    }
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!confirm('Remove this assignment?')) return;

    try {
      await api.request(
        `/me/hackathons/${hackathonId}/judge-assignments/${assignmentId}`,
        { method: 'DELETE' }
      );
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      alert('Assignment removed successfully!');
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading assignment data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users size={20} />
          Judge Assignments
        </h3>
        <Button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Assign Judge
        </Button>
      </div>

      {/* Assignment Form */}
      {showAssignForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border border-green-200 dark:border-slate-600 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Judge
            </label>
            <select
              value={selectedJudge || ''}
              onChange={(e) => setSelectedJudge(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose a judge...</option>
              {judges.map(judge => (
                <option key={judge.id} value={judge.id}>
                  {judge.person_name} ({judge.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Team
            </label>
            <select
              value={selectedTeam || ''}
              onChange={(e) => setSelectedTeam(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.members?.length || 0} members)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAssign} className="flex-1">Assign Judge</Button>
            <Button
              onClick={() => setShowAssignForm(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Assignments List */}
      <div className="space-y-2">
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No judge assignments yet. Create your first one!</p>
          </div>
        ) : (
          assignments.map((assignment, index) => {
            const judge = judges.find(j => j.id === assignment.judge_id);
            const team = teams.find(t => t.id === assignment.team_id);

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {judge?.person_name}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {team?.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Status: <span className="capitalize font-medium">{assignment.status}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleUnassign(assignment.id)}
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
