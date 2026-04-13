import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, ArrowLeft, Zap, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import confetti from 'canvas-confetti'

interface TeamRank {
  team_id: number
  team_name: string
  raw_score_sum: number
  z_score_total: number
  eval_count: number
}

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>()
  const [teams, setTeams] = useState<TeamRank[]>([])
  const [loading, setLoading] = useState(true)
  const [hackathonName, setHackathonName] = useState('')
  const [presentationMode, setPresentationMode] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const confettiFired = useRef(false)

  const load = useCallback(async () => {
    try {
      const [lb, hack] = await Promise.all([
        api.get(`/hackathons/${id}/leaderboard`),
        api.get(`/hackathons/${id}`)
      ])
      setTeams(lb)
      setHackathonName(hack.name)
      // Fire confetti once if there are winners
      if (lb.length >= 3 && !confettiFired.current) {
        confettiFired.current = true
        setTimeout(() => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#fbbf24', '#fff'] })
        }, 800)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const medals = [
    { icon: Trophy, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5 border-amber-400/30', label: '1st Place', size: 'scale-110' },
    { icon: Medal, color: 'text-slate-400', bg: 'from-slate-500/20 to-slate-500/5 border-slate-400/30', label: '2nd Place', size: '' },
    { icon: Medal, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-500/5 border-orange-400/30', label: '3rd Place', size: '' },
  ]

  return (
    <div className={`${presentationMode ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white`}>
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-16">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-10">
          {!presentationMode ? (
            <Link to="/dashboard/mentor" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button onClick={handleRefresh} className={`text-slate-400 hover:text-white transition-colors ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPresentationMode(!presentationMode)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
            >
              {presentationMode ? <><Minimize2 className="w-3.5 h-3.5" /> Exit Presentation</> : <><Maximize2 className="w-3.5 h-3.5" /> Presentation Mode</>}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none hover:rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4 transition-all">
            <Zap className="w-3 h-3" /> Z-Score Normalized Rankings
          </div>
          <h1 className={`font-black tracking-tight text-white ${presentationMode ? 'text-6xl' : 'text-4xl md:text-5xl'}`}>
            {hackathonName || 'Leaderboard'}
          </h1>
          <p className="text-slate-400 mt-3 text-sm font-medium">
            Mathematically normalized to eliminate judging bias.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-24 space-y-4">
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-slate-400 text-sm font-semibold animate-pulse">Computing Z-Score standings...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-slate-400 font-semibold">No evaluations submitted yet.</p>
            <p className="text-slate-600 text-sm mt-1">Check back after judges have scored the teams.</p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {teams.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[teams[1], teams[0], teams[2]].map((team, visIdx) => {
                  const rank = visIdx === 0 ? 1 : visIdx === 1 ? 0 : 2
                  const medal = medals[rank]
                  const MedalIcon = medal.icon
                  const isCentre = visIdx === 1
                  return (
                    <motion.div
                      key={team.team_id}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{ opacity: 1, y: isCentre ? -16 : 0, scale: isCentre ? 1.04 : 1 }}
                      transition={{ delay: rank * 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className={`relative rounded-none hover:rounded-lg border bg-slate-950 p-5 text-center transition-all ${isCentre ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-600/30' : ''}`}
                    >
                      {isCentre && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest text-white">Winner</div>
                      )}
                      <MedalIcon className={`w-7 h-7 mx-auto mb-2 ${medal.color}`} />
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{medal.label}</div>
                      <div className={`font-black text-white ${isCentre ? 'text-xl' : 'text-lg'} leading-tight`}>{team.team_name}</div>
                      <div className={`mt-3 font-black ${team.z_score_total > 0 ? 'text-indigo-400' : 'text-rose-400'} ${isCentre ? 'text-3xl' : 'text-2xl'}`}>
                        {team.z_score_total > 0 ? '+' : ''}{team.z_score_total.toFixed(3)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Z-Score</div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Rankings table */}
            <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Full Rankings</span>
                <span className="text-[11px] text-slate-500 font-semibold">{teams.length} teams</span>
              </div>
              <div className="divide-y divide-white/5">
                <AnimatePresence>
                  {teams.map((team, index) => (
                    <motion.div
                      key={team.team_id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="rank-entry flex items-center px-6 py-4 hover:bg-white/5 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black mr-4 flex-shrink-0
                        ${index === 0 ? 'bg-amber-500/20 text-amber-400' : index === 1 ? 'bg-slate-500/20 text-slate-400' : index === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-slate-500'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{team.team_name}</div>
                        <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{team.eval_count} evaluation{team.eval_count !== 1 ? 's' : ''}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-lg font-black ${team.z_score_total > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {team.z_score_total > 0 ? '+' : ''}{team.z_score_total.toFixed(3)}
                        </div>
                        <div className="text-[11px] text-slate-600">Raw: {team.raw_score_sum}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
