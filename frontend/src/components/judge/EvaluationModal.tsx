import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, AlertCircle, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { CriterionSlider } from './CriterionSlider'
import { TeamDetailsCard } from './TeamDetailsCard'
import { ScoreSummary } from './ScoreSummary'
import { api } from '../../lib/api'
import { toast } from 'sonner'

interface Criterion {
  criterion_id: number
  criterion_name: string
  max_points: number
  current_score?: number
  feedback?: string
  description?: string
}

interface EvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  assignment_id?: number
  team_id?: number
  team_name?: string
  hackathon_id?: number
  hackathon_name?: string
  round_id?: number
  round_name?: string
  project_title?: string
  project_description?: string
  demo_url?: string
  github_url?: string
  tech_stack?: string[]
  members?: Array<{ name: string; email?: string; role?: string }>
  criteria: Criterion[]
}

export function EvaluationModal({
  isOpen,
  onClose,
  onSuccess,
  assignment_id,
  team_id,
  team_name = 'Team',
  hackathon_name = 'Hackathon',
  round_id,
  round_name = 'Round',
  project_title,
  project_description,
  demo_url,
  github_url,
  tech_stack = [],
  members = [],
  criteria
}: EvaluationModalProps) {
  const [scores, setScores] = useState<Record<number, number>>({})
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'evaluation' | 'summary'>('details')
  const [allScored, setAllScored] = useState(false)
  const [progress, setProgress] = useState(0)

  // Initialize scores from criteria
  useEffect(() => {
    const initialScores: Record<number, number> = {}
    const initialFeedbacks: Record<number, string> = {}
    criteria.forEach(c => {
      initialScores[c.criterion_id] = c.current_score || 0
      initialFeedbacks[c.criterion_id] = c.feedback || ''
    })
    setScores(initialScores)
    setFeedbacks(initialFeedbacks)
  }, [criteria, isOpen])

  // Update progress
  useEffect(() => {
    if (criteria.length === 0) {
      setAllScored(false)
      setProgress(0)
      return
    }
    const scored = criteria.filter(c => scores[c.criterion_id] > 0).length
    const percent = Math.round((scored / criteria.length) * 100)
    setProgress(percent)
    setAllScored(scored === criteria.length)
  }, [scores, criteria])

  const handleScoreChange = (criterionId: number, score: number) => {
    setScores(prev => ({ ...prev, [criterionId]: score }))
  }

  const handleFeedbackChange = (criterionId: number, feedback: string) => {
    setFeedbacks(prev => ({ ...prev, [criterionId]: feedback }))
  }

  const handleSubmit = async () => {
    if (!team_id || !round_id || !assignment_id) {
      toast.error('Missing required information')
      return
    }

    if (!allScored) {
      toast.error('Please score all criteria before submitting')
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/judge/evaluations/submit', {
        team_id,
        round_id,
        scores,
        feedback: feedbacks
      })

      if (response.ok || response.status === 201) {
        toast.success('Evaluation submitted successfully!')
        setTimeout(() => {
          onClose()
          onSuccess?.()
        }, 500)
      } else {
        toast.error(response.data?.detail || 'Failed to submit evaluation')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error submitting evaluation')
    } finally {
      setLoading(false)
    }
  }

  const criteriaData = criteria.map(c => ({
    ...c,
    score: scores[c.criterion_id] || 0
  }))

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{team_name}</h2>
                <p className="text-indigo-100 text-sm">{hackathon_name} • {round_name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Progress</span>
                <span className="text-sm font-bold text-indigo-600">{progress}%</span>
              </div>
              <motion.div
                className="h-2 bg-slate-200 rounded-full overflow-hidden"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 flex gap-2 border-b border-slate-200">
              {(['details', 'evaluation', 'summary'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'details' && '👥 Team'}
                  {tab === 'evaluation' && '⭐ Scoring'}
                  {tab === 'summary' && '📊 Summary'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="wait">
                {activeTab === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <TeamDetailsCard
                      team_id={team_id || 0}
                      team_name={team_name}
                      members={members}
                      project_title={project_title}
                      project_description={project_description}
                      github_url={github_url}
                      demo_url={demo_url}
                      tech_stack={tech_stack}
                    />
                  </motion.div>
                )}

                {activeTab === 'evaluation' && (
                  <motion.div
                    key="evaluation"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {criteria.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600">No criteria to evaluate</p>
                      </div>
                    ) : (
                      criteria.map((criterion, idx) => (
                        <motion.div
                          key={criterion.criterion_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <CriterionSlider
                            criterion_id={criterion.criterion_id}
                            criterion_name={criterion.criterion_name}
                            max_points={criterion.max_points}
                            current_score={scores[criterion.criterion_id]}
                            feedback={feedbacks[criterion.criterion_id]}
                            onChange={(score) => handleScoreChange(criterion.criterion_id, score)}
                            onFeedbackChange={(feedback) => handleFeedbackChange(criterion.criterion_id, feedback)}
                          />
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === 'summary' && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ScoreSummary criteria_scores={criteriaData} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {allScored ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 text-emerald-600"
                  >
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Ready to submit</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{criteria.length - (criteria.filter(c => scores[c.criterion_id] > 0).length)} criteria remaining</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={!allScored || loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Evaluation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
