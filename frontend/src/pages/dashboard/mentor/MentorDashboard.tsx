import { PageTransition } from '../../../components/PageTransition'
import { Button } from '../../../components/ui/Button'
import { Link } from 'react-router-dom'
import { Plus, Users, Calendar, BarChart3, Clock, ArrowUpRight, Activity, Megaphone, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter'
import { StatCardSkeleton, TableRowSkeleton, AnnouncementSkeleton } from '../../../components/ui/Skeleton'
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'

// Mock chart data — replace with real API data as needed
const registrationData = [
  { day: 'Mon', teams: 4 }, { day: 'Tue', teams: 9 }, { day: 'Wed', teams: 7 },
  { day: 'Thu', teams: 15 }, { day: 'Fri', teams: 22 }, { day: 'Sat', teams: 18 }, { day: 'Sun', teams: 28 },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  registration_open: { label: 'Registration Open', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  evaluating: { label: 'Judging Active', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
}

export default function MentorDashboard() {
  const [hackathons, setHackathons] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [annLoading, setAnnLoading] = useState(false)
  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [postingAnn, setPostingAnn] = useState(false)
  const [selectedHack, setSelectedHack] = useState<number | null>(null)

  const refresh = async () => {
    try {
      const [hacks, s] = await Promise.all([api.get('/hackathons'), api.get('/stats')])
      setHackathons(hacks)
      setStats(s)
      if (hacks.length > 0 && !selectedHack) setSelectedHack(hacks[0].id)
    } catch {
      toast.error('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!selectedHack) return
    setAnnLoading(true)
    api.get(`/hackathons/${selectedHack}/announcements`)
      .then(setAnnouncements)
      .catch(() => toast.error('Could not load announcements.'))
      .finally(() => setAnnLoading(false))
  }, [selectedHack])

  const postAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim() || !selectedHack) return
    setPostingAnn(true)
    try {
      await api.post(`/hackathons/${selectedHack}/announcements`, { title: annTitle, body: annBody })
      toast.success('Announcement posted to all participants!')
      setAnnTitle('')
      setAnnBody('')
      const updated = await api.get(`/hackathons/${selectedHack}/announcements`)
      setAnnouncements(updated)
    } catch {
      toast.error('Failed to broadcast announcement.')
    } finally {
      setPostingAnn(false)
    }
  }

  const evalDone = stats?.total_evaluations ?? 0
  const evalPending = stats?.pending_evaluations ?? 0
  const evalTotal = evalDone + evalPending
  const pieData = [
    { name: 'Completed', value: evalDone },
    { name: 'Pending', value: Math.max(evalPending, 0) },
  ]

  return (
    <PageTransition>
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Command Center</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">Monitor your hackathons, broadcast announcements, and track live evaluations.</p>
          </div>
          <Link to="/dashboard/mentor/create">
            <Button className="shadow-md shadow-indigo-100">
              <Plus className="w-4 h-4" /> Initialize Hackathon
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Active Events" value={stats?.total_hackathons ?? 0} icon={Calendar} iconBg="bg-blue-50 text-blue-600" />
              <StatCard title="Total Teams" value={stats?.total_teams ?? 0} icon={Users} iconBg="bg-emerald-50 text-emerald-600" />
              <StatCard title="Pending Evals" value={stats?.pending_evaluations ?? 0} icon={Clock} iconBg="bg-amber-50 text-amber-600" highlight />
              <StatCard title="Scores Logged" value={stats?.total_evaluations ?? 0} icon={BarChart3} iconBg="bg-purple-50 text-purple-600" />
            </>
          )}
        </div>

        {/* Charts Row */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Team Registrations</p>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Last 7 Days</h3>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">↑ Trending</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={registrationData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 600 }}
                    labelStyle={{ color: '#64748b' }}
                  />
                  <Area type="monotone" dataKey="teams" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad)" dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Chart */}
            <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Evaluation Progress</p>
              <h3 className="text-xl font-black text-slate-900 mb-6">{evalTotal > 0 ? `${Math.round((evalDone / evalTotal) * 100)}%` : '—'} Done</h3>
              <PieChart width={130} height={130}>
                <Pie data={pieData} cx={60} cy={60} innerRadius={42} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  <Cell fill="#6366f1" />
                  <Cell fill="#e2e8f0" />
                </Pie>
              </PieChart>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Completed
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Pending
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Table */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Hackathons</h2>
            <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-3 text-left">Event Name</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    [1, 2, 3].map(i => <TableRowSkeleton key={i} cols={3} />)
                  ) : hackathons.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="py-16 text-center">
                          <p className="text-sm font-bold text-slate-700">No hackathons yet</p>
                          <p className="text-xs text-slate-400 mt-1 mb-4">Initialize your first event to get started</p>
                          <Link to="/dashboard/mentor/create">
                            <Button className="text-xs px-4 py-2">Create Event</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : hackathons.map(h => {
                    const sc = statusConfig[h.status] || statusConfig.draft
                    return (
                      <motion.tr
                        key={h.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/80 group cursor-pointer transition-colors"
                        onClick={() => setSelectedHack(h.id)}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">{h.name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/leaderboard/${h.id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            Leaderboard <Trophy className="w-3 h-3" />
                          </Link>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Live Broadcast</h2>
              {selectedHack && <span className="text-[10px] font-bold text-slate-300">Event #{selectedHack}</span>}
            </div>
            <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg shadow-sm hover:shadow-md overflow-hidden transition-all">
              <div className="p-4 space-y-3 border-b border-slate-100">
                <input
                  className="w-full text-sm font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300"
                  placeholder="Announcement title..."
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                />
                <textarea
                  rows={2}
                  className="w-full text-sm text-slate-700 outline-none resize-none placeholder:text-slate-300 font-medium"
                  placeholder="Write your message to all participants..."
                  value={annBody}
                  onChange={e => setAnnBody(e.target.value)}
                />
                <button
                  onClick={postAnnouncement}
                  disabled={postingAnn || !annTitle.trim() || !selectedHack}
                  className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-none hover:rounded-md flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  {postingAnn ? 'Broadcasting...' : 'Broadcast Update'}
                </button>
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {annLoading ? (
                  [1, 2].map(i => <AnnouncementSkeleton key={i} />)
                ) : announcements.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs text-slate-400 font-semibold">No announcements yet. Broadcast an update.</p>
                  </div>
                ) : announcements.map(ann => (
                  <motion.div key={ann.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="p-4">
                    <p className="text-sm font-bold text-slate-900 mb-1">{ann.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{ann.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function StatCard({ title, value, icon: Icon, iconBg, highlight }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-none hover:rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}><Icon className="w-5 h-5" /></div>
        <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
      </div>
      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{title}</p>
        <h3 className={`text-3xl font-black tracking-tight ${highlight && value > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
          <AnimatedCounter target={typeof value === 'number' ? value : 0} />
        </h3>
      </div>
    </motion.div>
  )
}
