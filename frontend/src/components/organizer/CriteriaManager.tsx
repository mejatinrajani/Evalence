import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';

interface Criterion {
  id: number;
  name: string;
  max_points: number;
  description?: string;
  weight?: number;
}

interface CriteriaManagerProps {
  hackathonId: number;
  roundId?: number;
}

export default function CriteriaManager({ hackathonId, roundId }: CriteriaManagerProps) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newCriterion, setNewCriterion] = useState({
    name: '',
    max_points: 10,
    description: '',
    weight: 1.0
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    max_points: 10,
    description: '',
    weight: 1.0
  });

  useEffect(() => {
    if (roundId) {
      fetchCriteria();
    }
  }, [roundId, hackathonId]);

  const fetchCriteria = async () => {
    if (!roundId) return;
    try {
      setLoading(true);
      const data = await api.request(`/me/hackathons/${hackathonId}/rounds/${roundId}`);
      setCriteria(data.criteria || []);
    } catch (error) {
      console.error('Failed to fetch criteria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCriterion = async () => {
    if (!newCriterion.name.trim()) {
      alert('Criterion name is required');
      return;
    }

    if (!roundId) {
      alert('Please select a round first');
      return;
    }

    try {
      const created = await api.request(
        `/me/hackathons/${hackathonId}/rounds/${roundId}/criteria`,
        {
          method: 'POST',
          body: JSON.stringify(newCriterion)
        }
      );
      setCriteria([...criteria, created]);
      setNewCriterion({
        name: '',
        max_points: 10,
        description: '',
        weight: 1.0
      });
      setShowForm(false);
      alert('Criterion added successfully!');
    } catch (error) {
      console.error('Failed to create criterion:', error);
      alert('Failed to add criterion');
    }
  };

  const handleUpdateCriterion = async (criterionId: number) => {
    if (!editData.name.trim()) {
      alert('Criterion name is required');
      return;
    }

    try {
      const updated = await api.request(
        `/me/hackathons/${hackathonId}/criteria/${criterionId}`,
        {
          method: 'PUT',
          body: JSON.stringify(editData)
        }
      );
      setCriteria(criteria.map(c => c.id === criterionId ? updated : c));
      setEditingId(null);
      alert('Criterion updated successfully!');
    } catch (error) {
      console.error('Failed to update criterion:', error);
      alert('Failed to update criterion');
    }
  };

  const handleDeleteCriterion = async (criterionId: number) => {
    if (!confirm('Are you sure you want to delete this criterion?')) return;

    try {
      await api.request(
        `/me/hackathons/${hackathonId}/criteria/${criterionId}`,
        {
          method: 'DELETE'
        }
      );
      setCriteria(criteria.filter(c => c.id !== criterionId));
      alert('Criterion deleted successfully!');
    } catch (error) {
      console.error('Failed to delete criterion:', error);
      alert('Failed to delete criterion');
    }
  };

  if (!roundId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Select a round to manage its evaluation criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scoring Criteria</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Add Criterion
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border border-purple-200 dark:border-slate-600"
          >
            <div className="space-y-3">
              <Input
                placeholder="Criterion name (e.g., Innovation)"
                value={newCriterion.name}
                onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={newCriterion.description}
                onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Points</label>
                  <Input
                    type="number"
                    value={newCriterion.max_points}
                    onChange={(e) => setNewCriterion({ ...newCriterion, max_points: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight</label>
                  <Input
                    type="number"
                    value={newCriterion.weight}
                    onChange={(e) => setNewCriterion({ ...newCriterion, weight: parseFloat(e.target.value) })}
                    step="0.1"
                    min="0.1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateCriterion} className="flex-1">Add Criterion</Button>
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

      {/* Criteria List */}
      <div className="space-y-2">
        {criteria.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No criteria yet. Add your first scoring criterion!</p>
          </div>
        ) : (
          criteria.map((criterion, index) => (
            <motion.div
              key={criterion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700"
            >
              {editingId === criterion.id ? (
                <div className="space-y-3">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Criterion name"
                  />
                  <Input
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Points</label>
                      <Input
                        type="number"
                        value={editData.max_points}
                        onChange={(e) => setEditData({ ...editData, max_points: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight</label>
                      <Input
                        type="number"
                        value={editData.weight}
                        onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) })}
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateCriterion(criterion.id)} className="flex-1">Save</Button>
                    <Button onClick={() => setEditingId(null)} variant="outline" className="flex-1">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{criterion.name}</h4>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs rounded">
                        {criterion.max_points} pts
                      </span>
                      {criterion.weight && criterion.weight !== 1 && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 text-xs rounded">
                          {criterion.weight}x weight
                        </span>
                      )}
                    </div>
                    {criterion.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{criterion.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(criterion.id);
                        setEditData({
                          name: criterion.name,
                          max_points: criterion.max_points,
                          description: criterion.description || '',
                          weight: criterion.weight || 1.0
                        });
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCriterion(criterion.id)}
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
