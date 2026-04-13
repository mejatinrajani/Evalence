import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Calendar, Trophy, Search, Filter, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { JudgeSidebar } from './JudgeSidebar'

interface EvaluationRecord {
  id: number
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  criteria_count: number
  total_score: number
  average_score: number
  created_at?: string
  updated_at?: string
}

export function MyRatingsPage() {
  const [ratings, setRatings] = useState<EvaluationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterHackathon, setFilterHackathon] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hackathons, setHackathons] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    fetchRatings()
  }, [page, filterHackathon])

  const fetchRatings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        skip: String((page - 1) * 10),
        limit: '10',
        ...(filterHackathon && { hackathon_id: filterHackathon })
      })

      const response = await api.get(`/judge/evaluations/history?${params}`)
      if (response.ok) {
        const data = response.data
        setRatings(data)
        
        // Extract unique hackathons
        const uniqueHackathons = [...new Set(data.map((r: EvaluationRecord) => r.hackathon_id))].map(id => {
          const record = data.find((r: EvaluationRecord) => r.hackathon_id === id)
          return { id: record.hackathon_id, name: record.hackathon_name }
        })
        setHackathons(uniqueHackathons)
        setError('')
      } else {
        setError('Failed to load ratings')
        toast.error('Failed to load ratings')
      }
    } catch (err) {
      console.error(err)
      setError('Error loading ratings')
      toast.error('Error loading ratings')
    } finally {
      setLoading(false)
    }
  }

  const filteredRatings = ratings.filter(rating =>
    rating.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (date?: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'from-emerald-500 to-green-600'
    if (percentage >= 80) return 'from-blue-500 to-cyan-600'
    if (percentage >= 70) return 'from-yellow-500 to-amber-600'
    if (percentage >= 60) return 'from-orange-500 to-red-600'
    return 'from-red-500 to-red-600'
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  const stats = {
    total: ratings.reduce((sum, r) => sum + r.criteria_count, 0),
    averageScore: ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.total_score, 0) / ratings.length).toFixed(2) : '0.00'
  }

  return (
    <div className="flex">
      <JudgeSidebar isOpen completedCount={ratings.length} />

      <div className="flex-1 md:ml-64 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <BarChart3 className="text-indigo-600" size={32} />
              My Ratings
            </h1>
            <p className="text-slate-600">View your past evaluations and scores</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm"
            >
              <p className="text-slate-600 text-sm mb-1">Total Evaluations</p>
              <p className="text-3xl font-bold text-indigo-600">{ratings.length}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm"
            >
              <p className="text-slate-600 text-sm mb-1">Average Score</p>
              <p className="text-3xl font-bold text-purple-600">{stats.averageScore}</p>
            </motion.div>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 flex flex-col md:flex-row gap-4"
          >
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filterHackathon || ''}
              onChange={(e) => {
                setFilterHackathon(e.target.value || null)
                setPage(1)
              }}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Hackathons</option>
              {hackathons.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto text-indigo-600 mb-3 animate-spin" size={32} />
                <p className="text-slate-600">Loading ratings...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-700">{error}</p>
              </div>
            ) : filteredRatings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
                <Trophy className="mx-auto text-slate-400 mb-3" size={32} />
                <p className="text-slate-600">No evaluations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRatings.map((rating, idx) => {
                  const percentage = (rating.average_score / (rating.criteria_count > 0 ? rating.criteria_count : 1)) * 100
                  const grade = getGrade(percentage)
                  
                  return (
                    <motion.div
                      key={rating.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 text-lg">{rating.team_name}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {rating.hackathon_name} • {rating.round_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            <Calendar size={12} className="inline mr-1" />
                            {formatDate(rating.updated_at)}
                          </p>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-600 mb-1">Score</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {rating.total_score.toFixed(1)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {rating.criteria_count} criteria
                            </p>
                          </div>

                          {/* Grade Badge */}
                          <motion.div
                            className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-${grade === 'A' ? 'emerald' : grade === 'B' ? 'blue' : grade === 'C' ? 'yellow' : grade === 'D' ? 'orange' : 'red'}-200 bg-${grade === 'A' ? 'emerald' : grade === 'B' ? 'blue' : grade === 'C' ? 'yellow' : grade === 'D' ? 'orange' : 'red'}-50`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.05 + 0.1 }}
                          >
                            <div className={`text-2xl font-bold bg-gradient-to-br ${getGradeColor(percentage)} bg-clip-text text-transparent`}>
                              {grade}
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Pagination */}
          {!loading && filteredRatings.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex justify-center gap-2"
            >
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-600">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={filteredRatings.length < 10}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Next
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
