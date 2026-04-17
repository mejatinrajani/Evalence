import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Phase 2: Advanced Analytics & Insights Dashboard
 * Real-time scoring analysis, judge bias detection, team performance
 */

interface AnalyticsData {
  total_evaluations: number;
  average_score: number;
  std_deviation: number;
  min_score: number;
  max_score: number;
  judge_count: number;
  teams_evaluated: number;
  score_distribution: { [key: string]: number };
}

interface JudgeAnalysis {
  judge_id: number;
  judge_name: string;
  average_score: number;
  score_count: number;
  deviation_from_average: number;
  bias_type: string | null;
  flag_status: string;
}

interface AnalyticsDashboardProps {
  hackathon_id: number;
  analytics: AnalyticsData | null;
  judge_performance: JudgeAnalysis[];
  isLoading?: boolean;
  is_organizer: boolean;
}

const ScoreDistributionChart: React.FC<{ distribution: { [key: string]: number } }> = ({
  distribution,
}) => {
  const max_value = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-3">
      {Object.entries(distribution).map(([range, count]) => (
        <div key={range}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-slate-700">{range}</span>
            <span className="text-slate-600">{count} teams</span>
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(count / max_value) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          />
        </div>
      ))}
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  color?: string;
}> = ({ title, value, icon, trend, color = 'blue' }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`p-6 rounded-lg bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-slate-600 font-semibold">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        {trend && <p className="text-xs text-slate-600 mt-2">{trend}</p>}
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </motion.div>
);

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  hackathon_id,
  analytics,
  judge_performance,
  isLoading = false,
  is_organizer,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'judges' | 'anomalies'>('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">⏳ Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <p className="text-slate-600">No analytics data available yet</p>
      </div>
    );
  }

  const getBiasColor = (biasType: string | null) => {
    if (!biasType) return 'bg-green-50 border-green-300';
    if (biasType === 'lenient') return 'bg-yellow-50 border-yellow-300';
    if (biasType === 'harsh') return 'bg-orange-50 border-orange-300';
    if (biasType === 'inconsistent') return 'bg-red-50 border-red-300';
    return 'bg-slate-50 border-slate-300';
  };

  const getBiasIcon = (biasType: string | null) => {
    if (!biasType) return '✅';
    if (biasType === 'lenient') return '😊';
    if (biasType === 'harsh') return '😠';
    if (biasType === 'inconsistent') return '🎲';
    return '❓';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">📊 Analytics & Insights</h2>
        <div className="flex gap-2">
          {(['overview', 'judges', 'anomalies'] as const).map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              whileHover={{ scale: 1.05 }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {tab === 'overview' && '📈 Overview'}
              {tab === 'judges' && '👨‍⚖️ Judges'}
              {tab === 'anomalies' && '🚨 Anomalies'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Evaluations"
              value={analytics.total_evaluations}
              icon="📋"
              color="blue"
            />
            <StatCard
              title="Average Score"
              value={analytics.average_score.toFixed(1)}
              icon="⭐"
              trend={`±${analytics.std_deviation.toFixed(1)}`}
              color="purple"
            />
            <StatCard
              title="Judges Active"
              value={analytics.judge_count}
              icon="👨‍⚖️"
              color="green"
            />
            <StatCard
              title="Teams Evaluated"
              value={analytics.teams_evaluated}
              icon="👥"
              color="orange"
            />
          </div>

          {/* Score Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6">Score Distribution</h3>
            <ScoreDistributionChart distribution={analytics.score_distribution} />

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Highest Score</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.max_score}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Lowest Score</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.min_score}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Judge Performance Tab */}
      {activeTab === 'judges' && (
        <div className="space-y-4">
          {judge_performance.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No judge data available</p>
            </div>
          ) : (
            judge_performance.map((judge, idx) => (
              <motion.div
                key={judge.judge_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-6 rounded-lg border-2 ${getBiasColor(judge.bias_type)}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {getBiasIcon(judge.bias_type)} {judge.judge_name}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {judge.score_count} evaluations completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {judge.average_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-600">Avg Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs text-slate-600">Deviation</p>
                    <p className="text-lg font-bold text-slate-900">
                      {judge.deviation_from_average > 0 ? '+' : ''}
                      {judge.deviation_from_average.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs text-slate-600">Bias Type</p>
                    <p className="text-lg font-bold text-slate-900">
                      {judge.bias_type || 'Normal'}
                    </p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs text-slate-600">Status</p>
                    <p
                      className={`text-lg font-bold ${
                        judge.flag_status === 'flagged' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {judge.flag_status === 'flagged' ? '🚩 Flagged' : '✅ Normal'}
                    </p>
                  </div>
                </div>

                {is_organizer && judge.flag_status === 'flagged' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="mt-4 w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold text-sm"
                  >
                    ⚠️ Review Judge Evaluations
                  </motion.button>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              🔍 <strong>Anomaly Detection:</strong> Monitors for unusual scoring patterns that might
              indicate bias or technical issues. Flagged items are reviewed automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-green-50 border-2 border-green-300 rounded-lg text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-slate-600">Normal Pattern</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {judge_performance.filter((j) => !j.bias_type).length}
              </p>
            </div>

            <div className="p-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-center">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="text-sm text-slate-600">Potential Bias</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {judge_performance.filter((j) => j.bias_type === 'lenient' || j.bias_type === 'harsh')
                  .length}
              </p>
            </div>

            <div className="p-6 bg-red-50 border-2 border-red-300 rounded-lg text-center">
              <div className="text-3xl mb-2">🚨</div>
              <p className="text-sm text-slate-600">Inconsistent Scoring</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {judge_performance.filter((j) => j.bias_type === 'inconsistent').length}
              </p>
            </div>
          </div>

          {is_organizer && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-900">Generate Full Anomaly Report</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Detailed analysis of all detected anomalies with recommendations
                  </p>
                </div>
                <div className="text-3xl">📋</div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
