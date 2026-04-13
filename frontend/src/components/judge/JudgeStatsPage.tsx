import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Award, AlertCircle, Loader2, Activity } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { JudgeSidebar } from './JudgeSidebar'

interface JudgeProgress {
  total_evaluations: number
  completed_evaluations: number
  pending_evaluations: number
  average_score: number
  score_distribution: Record<string, number>
  top_performing_criteria: Array<{
    criterion_id: number
    name: string
    average_score: number
    percentage: number
    count: number
  }>
  lowest_performing_criteria: Array<{
    criterion_id: number
    name: string
    average_score: number
    percentage: number
    count: number
  }>
  completion_trend: Array<{
    date: string
    completed: number
  }>
}

const COLORS = ['#10B981', '#3B82F6', '#FBBF24', '#F97316', '#EF4444']
const GRADE_COLORS: Record<string, string> = {
  A: '#10B981',
  B: '#3B82F6',
  C: '#FBBF24',
  D: '#F97316',
  F: '#EF4444'
}

export function JudgeStatsPage() {
  const [progress, setProgress] = useState<JudgeProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await api.get('/judge/progress')
      if (response.ok) {
        setProgress(response.data)
        setError('')
      } else {
        setError('Failed to load progress data')
        toast.error('Failed to load progress data')
      }
    } catch (err) {
      console.error(err)
      setError('Error loading progress data')
      toast.error('Error loading progress data')
    } finally {
      setLoading(false)
    }
  }

  if (!progress) {
    return (
      <div className="flex">
        <JudgeSidebar isOpen />
        <div className="flex-1 md:ml-64 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <Loader2 className="mx-auto text-indigo-600 mb-3 animate-spin" size={32} />
              <p className="text-slate-600">Loading progress data...</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const completionPercentage = progress.total_evaluations > 0
    ? Math.round((progress.completed_evaluations / progress.total_evaluations) * 100)
    : 0

  const distributionData = Object.entries(progress.score_distribution).map(([grade, count]) => ({
    name: grade,
    value: count,
    fill: GRADE_COLORS[grade] || '#6B7280'
  }))

  const trendData = [...progress.completion_trend].reverse()

  return (
    <div className="flex">
      <JudgeSidebar isOpen completedCount={progress.completed_evaluations} pendingCount={progress.pending_evaluations} />

      <div className="flex-1 md:ml-64 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Activity className="text-indigo-600" size={32} />
              Performance Analytics
            </h1>
            <p className="text-slate-600">Your evaluation progress and statistics</p>
          </motion.div>

          {/* KPI Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Total Evaluations', value: progress.total_evaluations, color: 'from-blue-500 to-cyan-600', icon: '📊' },
              { label: 'Completed', value: progress.completed_evaluations, color: 'from-emerald-500 to-green-600', icon: '✓' },
              { label: 'Pending', value: progress.pending_evaluations, color: 'from-amber-500 to-orange-600', icon: '⏱' },
              { label: 'Average Score', value: progress.average_score.toFixed(2), color: 'from-purple-500 to-pink-600', icon: '⭐' }
            ].map((kpi, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className={`bg-gradient-to-br ${kpi.color} rounded-lg p-6 text-white shadow-lg`}
              >
                <p className="text-lg mb-2">{kpi.icon}</p>
                <p className="text-sm opacity-90 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold">{kpi.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          >
            {/* Completion Progress */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Overall Completion</h3>
              <div className="text-center">
                <motion.div
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full border-8 border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <div className="text-3xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {completionPercentage}%
                  </div>
                </motion.div>
                <p className="text-slate-600 mt-4 text-sm">
                  {progress.completed_evaluations} of {progress.total_evaluations}
                </p>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Grade Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 text-center text-xs text-slate-600">
                {distributionData.map(d => (
                  <div key={d.name}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: d.fill }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>

            {/* Trend */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} />
                7-Day Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ fill: '#6366F1', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Detailed Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Top Criteria */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award size={18} className="text-emerald-600" />
                Top Performing Criteria
              </h3>
              <div className="space-y-3">
                {progress.top_performing_criteria.length === 0 ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  progress.top_performing_criteria.map((criterion, idx) => (
                    <motion.div
                      key={criterion.criterion_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 bg-emerald-50 rounded-lg border border-emerald-200"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-slate-900">{criterion.name}</h4>
                        <span className="text-xs font-bold text-emerald-600">{criterion.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${criterion.percentage}%` }}
                          transition={{ delay: idx * 0.1 + 0.4, duration: 0.5 }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{criterion.count} evaluations</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Lowest Criteria */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-600" />
                Focus Areas
              </h3>
              <div className="space-y-3">
                {progress.lowest_performing_criteria.length === 0 ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  progress.lowest_performing_criteria.map((criterion, idx) => (
                    <motion.div
                      key={criterion.criterion_id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-slate-900">{criterion.name}</h4>
                        <span className="text-xs font-bold text-red-600">{criterion.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-red-500 to-red-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${criterion.percentage}%` }}
                          transition={{ delay: idx * 0.1 + 0.4, duration: 0.5 }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{criterion.count} evaluations</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
