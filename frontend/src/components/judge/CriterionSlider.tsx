import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface CriterionSliderProps {
  criterion_id: number
  criterion_name: string
  max_points: number
  current_score?: number
  feedback?: string
  onChange: (score: number) => void
  onFeedbackChange?: (feedback: string) => void
  disabled?: boolean
}

export function CriterionSlider({
  criterion_id,
  criterion_name,
  max_points,
  current_score = 0,
  feedback = '',
  onChange,
  onFeedbackChange,
  disabled = false
}: CriterionSliderProps) {
  const [score, setScore] = useState(current_score)
  const [showFeedback, setShowFeedback] = useState(false)
  const [localFeedback, setLocalFeedback] = useState(feedback)

  const percentage = (score / max_points) * 100

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScore = parseInt(e.target.value)
    setScore(newScore)
    onChange(newScore)
  }

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalFeedback(e.target.value)
    onFeedbackChange?.(e.target.value)
  }

  const getColor = (percent: number) => {
    if (percent >= 80) return 'from-green-500 to-emerald-600'
    if (percent >= 60) return 'from-blue-500 to-cyan-600'
    if (percent >= 40) return 'from-yellow-500 to-amber-600'
    if (percent >= 20) return 'from-orange-500 to-red-600'
    return 'from-red-500 to-red-600'
  }

  const getLabel = (percent: number) => {
    if (percent >= 90) return 'Excellent'
    if (percent >= 75) return 'Very Good'
    if (percent >= 60) return 'Good'
    if (percent >= 45) return 'Satisfactory'
    if (percent >= 30) return 'Needs Work'
    return 'Poor'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{criterion_name}</h3>
          <p className="text-xs text-slate-500">Max Points: {max_points}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold bg-gradient-to-r ${getColor(percentage)} bg-clip-text text-transparent`}>
            {score}
          </div>
          <p className="text-xs text-slate-500">{getLabel(percentage)}</p>
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min="0"
        max={max_points}
        value={score}
        onChange={handleScoreChange}
        disabled={disabled}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Progress Bar */}
      <motion.div
        className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor(percentage)}`}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      {/* Points Display */}
      <div className="mt-2 flex justify-between text-xs text-slate-600">
        <span>0</span>
        <span className="font-semibold">{score}/{max_points}</span>
        <span>{max_points}</span>
      </div>

      {/* Feedback Section */}
      <button
        onClick={() => setShowFeedback(!showFeedback)}
        className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        {showFeedback ? '▼ Hide Feedback' : '▶ Add Feedback'}
      </button>

      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 pt-3 border-t border-slate-200"
        >
          <textarea
            value={localFeedback}
            onChange={handleFeedbackChange}
            placeholder="Add feedback for this criterion (optional)"
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-50"
            rows={2}
          />
          <p className="text-xs text-slate-500 mt-1">{localFeedback.length}/500</p>
        </motion.div>
      )}
    </motion.div>
  )
}
