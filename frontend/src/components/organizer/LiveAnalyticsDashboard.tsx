import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface AnalyticsData {
  total_registered: number;
  teams_registered: number;
  projects_submitted: number;
  judges_assigned: number;
  eval_started: number;
  eval_completed: number;
  participants_count: number;
  average_score?: number;
}

interface LiveAnalyticsDashboardProps {
  hackathonId: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function LiveAnalyticsDashboard({ hackathonId }: LiveAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds

  useEffect(() => {
    fetchAnalytics();
  }, [hackathonId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, hackathonId]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.request(`/me/hackathons/${hackathonId}/analytics/live`);
      setAnalytics(response.snapshot);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  // Prepare chart data
  const progressData = [
    { name: 'Teams', value: analytics.teams_registered },
    { name: 'Projects', value: analytics.projects_submitted },
    { name: 'Assigned', value: analytics.judges_assigned },
    { name: 'Evaluating', value: analytics.eval_started },
    { name: 'Completed', value: analytics.eval_completed }
  ];

  const statusChartData = [
    { name: 'Pending', value: analytics.judges_assigned - analytics.eval_started - analytics.eval_completed },
    { name: 'Evaluating', value: analytics.eval_started },
    { name: 'Completed', value: analytics.eval_completed }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp size={20} />
          Live Analytics Dashboard
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh</span>
          </label>
          <Button
            onClick={fetchAnalytics}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Registered', value: analytics.total_registered, color: 'blue', icon: '👥' },
          { label: 'Teams', value: analytics.teams_registered, color: 'purple', icon: '🏆' },
          { label: 'Projects Submitted', value: analytics.projects_submitted, color: 'green', icon: '📝' },
          { label: 'Judges Assigned', value: analytics.judges_assigned, color: 'indigo', icon: '⭐' },
          { label: 'Evaluations Started', value: analytics.eval_started, color: 'yellow', icon: '▶️' },
          { label: 'Evaluations Completed', value: analytics.eval_completed, color: 'red', icon: '✅' }
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border border-${item.color}-200 dark:border-slate-600`}
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{item.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Progress Overview</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Evaluation Status</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700"
      >
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Submission Rate:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {analytics.teams_registered > 0
                ? ((analytics.projects_submitted / analytics.teams_registered) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Judging Progress:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {analytics.judges_assigned > 0
                ? ((analytics.eval_completed / analytics.judges_assigned) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Average Score:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {analytics.average_score?.toFixed(2) || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Active Evaluators:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {analytics.eval_started}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Refresh Status */}
      <div className="text-xs text-gray-500 text-center">
        {autoRefresh ? `Auto-refreshing every ${(refreshInterval / 1000).toFixed(0)}s` : 'Auto-refresh disabled'}
      </div>
    </div>
  );
}
