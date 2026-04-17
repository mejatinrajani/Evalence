import { PageTransition } from '../../components/PageTransition'
import { Button } from '../../components/ui/Button'
import { CheckCircle2, Clock, FileText, ArrowUpRight, Star, ChevronRight, X, Keyboard } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { TableRowSkeleton, StatCardSkeleton } from '../../components/ui/Skeleton'
import { AnimatedCounter } from '../../components/ui/AnimatedCounter'

interface QueueItem {
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  criterion_id: number
  criterion_name: string
  max_points: number
  already_scored: boolean
  current_score: number | null
}

export default function JudgeDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusedCriterionIdx, setFocusedCriterionIdx] = useState(0)

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.get('/judge/queue')
      setQueue(data)
    } catch {
      toast.error('Failed to load your evaluation queue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadQueue() }, [loadQueue])

  // Keyboard navigation in scorecard
  useEffect(() => {
    if (!activeModal) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiveModal(null); return }
      const criteria = activeModal.criteria
      if (e.key === 'Tab') {
        e.preventDefault()
        setFocusedCriterionIdx(i => (i + 1) % criteria.length)
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        const c = criteria[focusedCriterionIdx]
        const scoreKey = `${c.criterion_id}-${c.round_id}`
        const safeMaxPoints = typeof c.max_points === 'number' && c.max_points > 0 ? c.max_points : 100
        const currentVal = scores[scoreKey as any] ?? Math.floor(safeMaxPoints / 2)
        const newVal = Math.min(currentVal + 1, safeMaxPoints)
        setScores(prev => ({ ...prev, [scoreKey]: newVal }))
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        const c = criteria[focusedCriterionIdx]
        const scoreKey = `${c.criterion_id}-${c.round_id}`
        const safeMaxPoints = typeof c.max_points === 'number' && c.max_points > 0 ? c.max_points : 100
        const currentVal = scores[scoreKey as any] ?? Math.floor(safeMaxPoints / 2)
        const newVal = Math.max(currentVal - 1, 0)
        setScores(prev => ({ ...prev, [scoreKey]: newVal }))
      }
      if (e.key === 'Enter' && !submitting) submitScores()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeModal, focusedCriterionIdx, scores, submitting])

  // Group by hackathon → team
  const grouped: Record<number, any> = {}
  queue.forEach(item => {
    if (!grouped[item.hackathon_id]) grouped[item.hackathon_id] = { hackathon_name: item.hackathon_name, hackathon_id: item.hackathon_id, teams: {} }
    const key = `${item.team_id}`
    if (!grouped[item.hackathon_id].teams[key]) {
      grouped[item.hackathon_id].teams[key] = { team_id: item.team_id, team_name: item.team_name, round_name: item.round_name, criteria: [], completed: 0, total: 0 }
    }
    grouped[item.hackathon_id].teams[key].criteria.push(item)
    grouped[item.hackathon_id].teams[key].total++
    if (item.already_scored) grouped[item.hackathon_id].teams[key].completed++
  })

  const totalAll = queue.length
  const completedAll = queue.filter(q => q.already_scored).length

  const openScorecard = (teamEntry: any) => {
    const init: Record<string, number> = {}
    teamEntry.criteria.forEach((c: QueueItem) => { 
      const safeMaxPoints = typeof c.max_points === 'number' && c.max_points > 0 ? c.max_points : 100
      // Use compound key: criterion_id + round_id to ensure uniqueness
      const key = `${c.criterion_id}-${c.round_id}`
      init[key] = c.current_score ?? Math.floor(safeMaxPoints / 2) 
    })
    console.log(`🟢 [OpenScorecard] Initialized scores:`, init)
    setScores(init as any)
    setFeedback('')
    setFocusedCriterionIdx(0)
    setActiveModal({ teamId: teamEntry.team_id, teamName: teamEntry.team_name, hackathonId: teamEntry.criteria[0]?.hackathon_id, criteria: teamEntry.criteria })
  }

  const submitScores = async () => {
    if (!activeModal || !activeModal.criteria || activeModal.criteria.length === 0) {
      console.error(`❌ [Submit] No modal or criteria`)
      return
    }
    setSubmitting(true)
    try {
      // Get round_id from first criterion (all criteria in a scorecard are from same round)
      const roundId = activeModal.criteria[0].round_id
      
      // Transform compound keys back to criterion_id for submission
      const scoresPayload: Record<number, number> = {}
      for (const [scoreKey, score] of Object.entries(scores)) {
        const criterionId = parseInt(scoreKey.split('-')[0])
        const validScore = typeof score === 'number' && !isNaN(score) ? score : 0
        scoresPayload[criterionId] = validScore
        console.log(`📊 [Submit] Criterion ${criterionId}: ${validScore}`)
      }
      
      // Build payload - feedback is optional and should be omitted if empty
      const payload: any = {
        team_id: activeModal.teamId,
        round_id: roundId,
        scores: scoresPayload
      }
      
      // Only add feedback if provided
      if (feedback && feedback.trim()) {
        // For now, apply same feedback to all criteria
        const feedbackDict: Record<number, string> = {}
        for (const key of Object.keys(scoresPayload)) {
          feedbackDict[parseInt(key)] = feedback
        }
        payload.feedback = feedbackDict
      }
      
      console.log(`📤 [Submit] Sending payload:`, JSON.stringify(payload, null, 2))
      const response = await api.post('/judge/evaluations/submit', payload)
      console.log(`✅ [Submit] Response:`, response)
      
      toast.success(`✅ Scores saved for "${activeModal.teamName}"!`)
      setActiveModal(null)
      setScores({})
      setFeedback('')
      // Refresh the queue
      await loadQueue()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`❌ [Submit] Full error:`, err)
      toast.error(`Failed to submit scores: ${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageTransition>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Evaluation Space</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">Score teams by assigned criteria. Use keyboard shortcuts in the scorecard for maximum speed.</p>
          </div>
          {completedAll > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-none hover:rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold transition-all">
              <CheckCircle2 className="w-4 h-4" />
              <span><AnimatedCounter target={completedAll} /> / {totalAll} submitted</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {loading ? [1,2,3].map(i => <StatCardSkeleton key={i} />) : (
            <>
              <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3"><FileText className="w-4 h-4 text-blue-600" /></div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Assigned</div>
                <div className="text-2xl font-black text-slate-900"><AnimatedCounter target={totalAll} /></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Scored</div>
                <div className="text-2xl font-black text-slate-900"><AnimatedCounter target={completedAll} /></div>
              </div>
              <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3"><Clock className="w-4 h-4 text-amber-600" /></div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pending</div>
                <div className="text-2xl font-black text-amber-700"><AnimatedCounter target={totalAll - completedAll} /></div>
              </div>
            </>
          )}
        </div>

        {/* Progress bar */}
        {!loading && totalAll > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Overall Progress</span>
              <span>{Math.round((completedAll / totalAll) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedAll / totalAll) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Queue */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all\">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {[1,2,3].map(i => <TableRowSkeleton key={i} cols={5} />)}
              </tbody>
            </table>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm font-bold text-slate-700">No teams assigned yet</p>
            <p className="text-xs text-slate-400 mt-1">Grab a coffee. The organizer will assign teams shortly.</p>
          </div>
        ) : (
          Object.values(grouped).map((hack: any) => (
            <div key={hack.hackathon_id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{hack.hackathon_name}</h2>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">Team</th>
                      <th className="px-6 py-3">Round</th>
                      <th className="px-6 py-3">Criteria</th>
                      <th className="px-6 py-3">Progress</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.values(hack.teams).map((team: any, teamIdx: number) => {
                      const pct = Math.round((team.completed / team.total) * 100)
                      const done = team.completed === team.total
                      return (
                        <tr key={`team-${team.team_id}-${teamIdx}`} className="hover:bg-indigo-50/30 group transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{team.team_name}</td>
                          <td className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">{team.round_name}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{team.total} criteria</td>
                          <td className="px-6 py-4 w-32">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 w-8">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant={done ? 'ghost' : 'primary'}
                              className="text-xs px-3 py-1.5 h-auto min-h-0"
                              onClick={() => openScorecard(team)}
                            >
                              {done ? 'Revise' : 'Score'} <ChevronRight className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* ====== SCORECARD MODAL (Focus Mode) ====== */}
        <AnimatePresence>
          {activeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={e => e.target === e.currentTarget && setActiveModal(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white rounded-3xl shadow-2xl shadow-slate-900/30 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal header */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                      <Star className="w-3 h-3 fill-indigo-600" /> Evaluation Scorecard
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{activeModal.teamName}</h3>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-slate-300 hover:text-slate-900 transition-colors mt-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Keyboard hint */}
                <div className="px-6 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                  <Keyboard className="w-3 h-3" />
                  <span><kbd className="kbd">Tab</kbd> next criterion</span>
                  <span><kbd className="kbd">←/→</kbd> adjust score</span>
                  <span><kbd className="kbd">Enter</kbd> submit</span>
                  <span><kbd className="kbd">Esc</kbd> close</span>
                </div>

                {/* Criteria sliders */}
                <div className="p-6 overflow-y-auto flex-1 space-y-7">
                  {activeModal.criteria.map((criterion: QueueItem, idx: number) => {
                    // Use compound key: criterion_id + round_id for true uniqueness
                    const scoreKey = `${criterion.criterion_id}-${criterion.round_id}`
                    const val = scores[scoreKey as any]
                    // Safe number handling - default to mid-point if undefined
                    const safeVal = typeof val === 'number' && !isNaN(val) ? val : Math.floor((criterion.max_points || 100) / 2)
                    const safeMaxPoints = typeof criterion.max_points === 'number' && criterion.max_points > 0 ? criterion.max_points : 100
                    const pct = Math.round((safeVal / safeMaxPoints) * 100)
                    const isFocused = idx === focusedCriterionIdx
                    return (
                      <div
                        key={`criterion-${scoreKey}`}
                        onClick={() => setFocusedCriterionIdx(idx)}
                        className={`p-4 rounded-none hover:rounded-lg border transition-all cursor-pointer ${isFocused ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-bold text-slate-800">{criterion.criterion_name}</label>
                          <div className="flex items-center gap-1">
                            <span className={`text-2xl font-black tabular-nums ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>{safeVal}</span>
                            <span className="text-slate-400 text-sm font-semibold">/{safeMaxPoints}</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={safeMaxPoints}
                          value={safeVal}
                          onChange={e => {
                            const newScore = parseInt(e.target.value)
                            console.log(`🎯 [JudgeDashboard] Criterion ${criterion.criterion_id} (Round ${criterion.round_id}, ${criterion.criterion_name}): ${newScore}/${safeMaxPoints}`)
                            setFocusedCriterionIdx(idx)
                            setScores(prev => {
                              const updated = { ...prev, [scoreKey]: newScore }
                              console.log(`📊 [JudgeDashboard] Updated scores:`, updated)
                              return updated as any
                            })
                          }}
                          className="w-full accent-indigo-600"
                          style={{ '--val': `${pct}%` } as any}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-semibold">
                          <span>0 — Below expectations</span>
                          <span>{safeMaxPoints} — Exceptional ⭐</span>
                        </div>
                      </div>
                    )
                  })}


                  {/* Qualitative feedback */}
                  <div className="pt-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Feedback for Team (Optional)</label>
                    <textarea
                      rows={3}
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="What impressed you? What could be improved?"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                  <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1">Cancel</Button>
                  <Button onClick={submitScores} disabled={submitting} className="flex-2 flex-grow-[2]">
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Submit Scores <ArrowUpRight className="w-4 h-4" /></span>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
