import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';

interface Round {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

interface RoundListProps {
  hackathonId: number;
  onRoundSelect?: (round: Round) => void;
}

export default function RoundsList({ hackathonId, onRoundSelect }: RoundListProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newRound, setNewRound] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchRounds();
  }, [hackathonId]);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/me/hackathons/${hackathonId}/rounds`);
      setRounds(data);
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
      alert('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRound = async () => {
    if (!newRound.name.trim()) {
      alert('Round name is required');
      return;
    }

    try {
      const createdRound = await api.request(`/me/hackathons/${hackathonId}/rounds`, {
        method: 'POST',
        body: JSON.stringify(newRound)
      });
      setRounds([...rounds, createdRound]);
      setNewRound({ name: '', description: '' });
      setShowForm(false);
      alert('Round created successfully!');
    } catch (error) {
      console.error('Failed to create round:', error);
      alert('Failed to create round');
    }
  };

  const handleUpdateRound = async (roundId: number) => {
    if (!editData.name.trim()) {
      alert('Round name is required');
      return;
    }

    try {
      const updated = await api.request(`/me/hackathons/${hackathonId}/rounds/${roundId}`, {
        method: 'PUT',
        body: JSON.stringify(editData)
      });
      setRounds(rounds.map(r => r.id === roundId ? updated : r));
      setEditingId(null);
      alert('Round updated successfully!');
    } catch (error) {
      console.error('Failed to update round:', error);
      alert('Failed to update round');
    }
  };

  const handleDeleteRound = async (roundId: number) => {
    if (!confirm('Are you sure you want to delete this round?')) return;

    try {
      await api.request(`/me/hackathons/${hackathonId}/rounds/${roundId}`, {
        method: 'DELETE'
      });
      setRounds(rounds.filter(r => r.id !== roundId));
      alert('Round deleted successfully!');
    } catch (error) {
      console.error('Failed to delete round:', error);
      alert('Failed to delete round');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading rounds...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Round Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Evaluation Rounds</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Add Round
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border border-blue-200 dark:border-slate-600"
          >
            <div className="space-y-3">
              <Input
                placeholder="Round name (e.g., Presentation)"
                value={newRound.name}
                onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
              />
              <Input
                placeholder="Description (optional)"
                value={newRound.description}
                onChange={(e) => setNewRound({ ...newRound, description: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreateRound} className="flex-1">Create</Button>
                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rounds List */}
      <div className="space-y-2">
        {rounds.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No rounds yet. Create your first evaluation round!</p>
          </div>
        ) : (
          rounds.map((round, index) => (
            <motion.div
              key={round.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 transition-colors"
            >
              {editingId === round.id ? (
                <div className="space-y-3">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Round name"
                  />
                  <Input
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateRound(round.id)}
                      className="flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onRoundSelect?.(round)}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">{round.name}</h4>
                    {round.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{round.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(round.id);
                        setEditData({ name: round.name, description: round.description || '' });
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteRound(round.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
