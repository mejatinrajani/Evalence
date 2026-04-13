import { motion } from 'framer-motion'
import { TrendingUp, Award, AlertCircle } from 'lucide-react'

interface ScoreSummaryProps {
  criteria_scores: Array<{
    criterion_id: number
    criterion_name: string
    score: number
    max_points: number
    feedback?: string
  }>
}

export function ScoreSummary({ criteria_scores }: ScoreSummaryProps) {
  const calculateStats = () => {
    if (criteria_scores.length === 0) return { total: 0, max: 0, percentage: 0, grade: 'N/A' }

    const total = criteria_scores.reduce((sum, c) => sum + c.score, 0)
    const max = criteria_scores.reduce((sum, c) => sum + c.max_points, 0)
    const percentage = max > 0 ? (total / max) * 100 : 0

    let grade = 'F'
    if (percentage >= 90) grade = 'A'
    else if (percentage >= 80) grade = 'B'
    else if (percentage >= 70) grade = 'C'
    else if (percentage >= 60) grade = 'D'

    return { total, max, percentage, grade }
  }

  const stats = calculateStats()

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'from-emerald-500 to-green-600'
      case 'B': return 'from-blue-500 to-cyan-600'
      case 'C': return 'from-yellow-500 to-amber-600'
      case 'D': return 'from-orange-500 to-red-600'
      default: return 'from-red-500 to-red-600'
    }
  }

  const getBackgroundColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-50 border-emerald-200'
      case 'B': return 'bg-blue-50 border-blue-200'
      case 'C': return 'bg-yellow-50 border-yellow-200'
      case 'D': return 'bg-orange-50 border-orange-200'
      default: return 'bg-red-50 border-red-200'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp size={18} />
          Score Summary
        </h3>
      </div>

      <div className="p-6">
        {/* Grade Badge */}
        <div className="mb-6 text-center">
          <motion.div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-4 ${getBackgroundColor(stats.grade)}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <div className={`text-3xl font-bold bg-gradient-to-br ${getGradeColor(stats.grade)} bg-clip-text text-transparent`}>
              {stats.grade}
            </div>
          </motion.div>
          <p className="text-sm text-slate-600 mt-3">{stats.percentage.toFixed(1)}%</p>
        </div>

        {/* Total Score */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Total Score</p>
            <p className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {stats.total}
              </span>
              <span className="text-slate-400 text-lg ml-1">/ {stats.max}</span>
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Breakdown</h4>
          {criteria_scores.map((criterion, idx) => {
            const percentage = criterion.max_points > 0 ? (criterion.score / criterion.max_points) * 100 : 0
            return (
              <motion.div
                key={criterion.criterion_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-700">{criterion.criterion_name}</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {criterion.score}/{criterion.max_points}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: idx * 0.1 + 0.3, duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Feedback Note */}
        {criteria_scores.some(c => c.feedback) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2"
          >
            <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">Feedback provided for {criteria_scores.filter(c => c.feedback).length} criterion/criteria</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
