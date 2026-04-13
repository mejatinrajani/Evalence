import { PageTransition } from '../components/PageTransition'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { motion } from 'framer-motion'
import { Calendar, Users, Trophy, ArrowUpRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

interface Hackathon {
  id: number
  name: string
  description: string
  start_date: string
  end_date: string
  prize_pool: string
  status: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Coming Soon', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  registration_open: { label: 'Registration Open', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  evaluating: { label: 'Judging in Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
}

export default function EventsDiscovery() {
  const [events, setEvents] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get('/hackathons').then(setEvents).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = events.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold uppercase tracking-wider hover:rounded-md transition-all"> 
            <Trophy className="w-3 h-3" /> Discover Events
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Upcoming Hackathons</h1>
          <p className="text-slate-600 max-w-lg mx-auto text-base">Browse active and upcoming events. Register, build, and compete on Evalence.</p>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by event name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-none hover:rounded-md shadow-sm text-sm text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md transition-all"
          />
        </div>

        {/* Event Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse font-semibold">Loading events...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-semibold">No events found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((event, idx) => {
              const sc = statusConfig[event.status] || statusConfig.draft
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="bg-white border border-slate-200 rounded-none hover:rounded-lg hover:shadow-md hover:border-indigo-200 transition-all p-6 group cursor-default"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-none hover:rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-all ${sc.color}`}>
                      {sc.label}
                    </span>
                    {event.prize_pool && (
                      <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                        <Trophy className="w-3.5 h-3.5" /> {event.prize_pool}
                      </div>
                    )}
                  </div>

                  <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{event.name}</h2>
                  <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6">{event.description || 'No description provided.'}</p>

                  <div className="flex items-center gap-6 text-xs text-slate-400 mb-6">
                    {event.start_date && (
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="w-3.5 h-3.5" /> {event.start_date}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Users className="w-3.5 h-3.5" /> Open Registration
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="primary" className="flex-1 justify-center text-xs">
                      Register
                    </Button>
                    <Link to={`/leaderboard/${event.id}`}>
                      <Button variant="outline" className="px-3 text-xs">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
