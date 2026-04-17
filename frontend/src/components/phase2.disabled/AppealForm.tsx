import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 2: Appeal Form Component
 * Allows teams to submit appeals against scores or process
 */

interface AppealFormProps {
  hackathon_id: number;
  team_id: number;
  onSubmit: (appeal_data: AppealData) => void;
  isLoading?: boolean;
}

interface AppealData {
  appeal_type: 'score_dispute' | 'judge_bias' | 'technical_issue' | 'rule_violation';
  title: string;
  description: string;
  evidence_url?: string;
}

export const AppealForm: React.FC<AppealFormProps> = ({
  hackathon_id,
  team_id,
  onSubmit,
  isLoading = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AppealData>({
    appeal_type: 'score_dispute',
    title: '',
    description: '',
    evidence_url: '',
  });

  const appealTypes = [
    { value: 'score_dispute', label: '📊 Score Dispute', icon: '📊' },
    { value: 'judge_bias', label: '⚖️ Judge Bias', icon: '⚖️' },
    { value: 'technical_issue', label: '⚙️ Technical Issue', icon: '⚙️' },
    { value: 'rule_violation', label: '📋 Rule Violation', icon: '📋' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.description.trim()) {
      onSubmit(formData);
      setFormData({ appeal_type: 'score_dispute', title: '', description: '', evidence_url: '' });
      setShowForm(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!showForm ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          📋 Submit an Appeal
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl p-8 border-2 border-amber-100"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Submit an Appeal</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-500 hover:text-slate-700 text-2xl"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-600 mb-6">
            If you believe there's an issue with the scoring or process, please provide details below.
            Our organizers will review your appeal within 24 hours.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Appeal Type Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">Appeal Type</label>
              <div className="grid grid-cols-2 gap-2">
                {appealTypes.map((type) => (
                  <motion.button
                    key={type.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        appeal_type: type.value as AppealData['appeal_type'],
                      })
                    }
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.appeal_type === type.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {type.icon} {type.label.split(' ')[1]}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Appeal Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of your appeal"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                required
              />
              <p className="text-xs text-slate-500 mt-1">{formData.title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Detailed Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide as much detail as possible about your appeal..."
                rows={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={1000}
                required
              />
              <p className="text-xs text-slate-500 mt-1">{formData.description.length}/1000</p>
            </div>

            {/* Evidence URL */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Evidence Link (Optional)
              </label>
              <input
                type="url"
                value={formData.evidence_url}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                placeholder="Link to supporting evidence (video, screenshot, etc.)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Include a link to any documentation that supports your appeal
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                ⚠️ <strong>Important:</strong> False appeals may result in sanctions. Please ensure your appeal
                is submitted in good faith with valid reasons.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 font-bold"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-bold disabled:opacity-50"
              >
                {isLoading ? '⏳ Submitting...' : '✅ Submit Appeal'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default AppealForm;
