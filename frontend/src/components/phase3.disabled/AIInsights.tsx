import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 3: AI Scoring Insights Component
 * Shows AI predictions, recommendations, and model performance
 */

interface AIPrediction {
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

interface AIInsightsProps {
  hackathon_id: number;
  predictions: AIPrediction[];
  model_accuracy?: number;
  is_organizer: boolean;
  onTrainModel?: () => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  hackathon_id,
  predictions,
  model_accuracy = 0,
  is_organizer,
  onTrainModel,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<AIPrediction | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'detailed'>('cards');

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { color: 'bg-green-100 text-green-800', label: 'High' };
    if (confidence >= 0.6) return { color: 'bg-blue-100 text-blue-800', label: 'Medium' };
    return { color: 'bg-yellow-100 text-yellow-800', label: 'Low' };
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈 Improving';
    if (trend === 'declining') return '📉 Declining';
    return '➡️ Stable';
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">🤖 AI Scoring Insights</h2>
        <div className="flex gap-2">
          {['cards', 'detailed'].map((mode) => (
            <motion.button
              key={mode}
              onClick={() => setViewMode(mode as typeof viewMode)}
              whileHover={{ scale: 1.05 }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {mode === 'cards' ? '📇 Cards' : '📊 Detailed'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Model Info */}
      {is_organizer && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white rounded-lg border-2 border-blue-200"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900">Model Performance</h3>
              <p className="text-sm text-slate-600 mt-1">
                Accuracy: {(model_accuracy * 100).toFixed(1)}%
              </p>
            </div>
            {model_accuracy < 0.7 && onTrainModel && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={onTrainModel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                🧠 Train Model
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((pred, idx) => {
          const confidence = getConfidenceBadge(pred.confidence_level);
          return (
            <motion.div
              key={pred.team_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedTeam(pred)}
              className="p-4 bg-white rounded-lg border-2 border-slate-200 cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-slate-900">{pred.team_name}</h4>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${confidence.color}`}>
                  {confidence.label}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Predicted:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {pred.predicted_score.toFixed(1)}
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(pred.confidence_level * 100)}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-600">
                    {getTrendIcon(pred.key_factors.trend)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed View */}
      <AnimatePresence>
        {selectedTeam && viewMode === 'detailed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-white rounded-lg border-2 border-blue-400"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-slate-900">
                🔍 Detailed Analysis: {selectedTeam.team_name}
              </h3>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Predicted Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {selectedTeam.predicted_score.toFixed(1)}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-slate-600">Confidence Level</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {(selectedTeam.confidence_level * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900">Key Factors:</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-100 rounded">
                  <p className="text-xs text-slate-600">Current Average</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedTeam.key_factors.current_average.toFixed(1)}
                  </p>
                </div>
                <div className="p-3 bg-slate-100 rounded">
                  <p className="text-xs text-slate-600">Judges Evaluated</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedTeam.key_factors.judges_evaluated}
                  </p>
                </div>
                <div className="p-3 bg-slate-100 rounded">
                  <p className="text-xs text-slate-600">Trend</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedTeam.key_factors.trend}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Recommendation:</strong> {selectedTeam.recommendation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIInsights;
