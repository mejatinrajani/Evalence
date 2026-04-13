import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface Participant {
  id: number;
  email: string;
  full_name: string;
  team_id?: number;
  team_name?: string;
  status: string;
  registered_at?: string;
}

interface ParticipantsTableProps {
  hackathonId: number;
}

export default function ParticipantsTable({ hackathonId }: ParticipantsTableProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  useEffect(() => {
    fetchParticipants();
  }, [hackathonId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/me/hackathons/${hackathonId}/participants`);
      setParticipants(data);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      alert('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.request(`/me/hackathons/${hackathonId}/export/participants`);
      const element = document.createElement('a');
      const file = new Blob([response.csv], { type: 'text/csv' });
      element.href = URL.createObjectURL(file);
      element.download = `participants_${hackathonId}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export data');
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = !filterTeam || p.team_name === filterTeam;
    return matchesSearch && matchesTeam;
  });

  const uniqueTeams = [...new Set(participants.filter(p => p.team_name).map(p => p.team_name))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading participants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users size={20} />
          Participants ({participants.length})
        </h3>
        <Button
          onClick={handleExportCSV}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download size={18} />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
        >
          <option value="">All Teams</option>
          {uniqueTeams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Team</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No participants found
                </td>
              </tr>
            ) : (
              filteredParticipants.map((participant, index) => (
                <motion.tr
                  key={participant.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                    {participant.full_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {participant.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {participant.team_name ? (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded text-xs font-medium">
                        {participant.team_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded text-xs font-medium capitalize">
                      {participant.status}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-lg border border-blue-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{participants.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Participants</div>
        </div>
        <div className="bg-purple-50 dark:bg-slate-800 p-4 rounded-lg border border-purple-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{uniqueTeams.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Teams Registered</div>
        </div>
        <div className="bg-green-50 dark:bg-slate-800 p-4 rounded-lg border border-green-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {(participants.length / Math.max(uniqueTeams.length, 1)).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Members/Team</div>
        </div>
      </div>
    </div>
  );
}
