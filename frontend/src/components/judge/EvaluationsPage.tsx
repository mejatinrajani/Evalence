import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { TeamQueueItem } from './TeamQueueItem'
import { EvaluationModal } from './EvaluationModal'
import { JudgeSidebar } from './JudgeSidebar'

interface QueueItem {
  id: number
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  status: 'pending' | 'evaluating' | 'completed'
  assigned_at?: string
  started_at?: string
  completed_at?: string
  members?: any[]
  project_title?: string
  project_description?: string
  criteria_count: number
  total_possible_points: number
}

interface EvaluationDetail {
  assignment_id: number
  team_id: number
  team_name: string
  hackathon_id: number
  hackathon_name: string
  round_id: number
  round_name: string
  project_title?: string
  project_description?: string
  demo_url?: string
  github_url?: string
  tech_stack?: string[]
  members?: Array<{ name: string; email?: string; role?: string }>
  criteria: any[]
  status: string
  assigned_at?: string
  started_at?: string
  completed_at?: string
}

export function EvaluationsPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'evaluating'>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluationDetail | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [page, setPage] = useState(1)
  const [completedCount, setCompletedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchQueue()
  }, [statusFilter, page])

  const fetchQueue = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        skip: String((page - 1) * 10),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await api.get(`/judge/evaluations/assigned?${params}`)
      if (response.ok) {
        const data = response.data
        setQueue(data)
        setCompletedCount(data.filter((item: QueueItem) => item.status === 'completed').length)
        setPendingCount(data.filter((item: QueueItem) => item.status === 'pending').length)
        setError('')
      } else {
        setError('Failed to load assignments')
        toast.error('Failed to load assignments')
      }
    } catch (err) {
      console.error(err)
      setError('Error loading assignments')
      toast.error('Error loading assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleTeamClick = async (assignment: QueueItem) => {
    try {
      setLoadingDetail(true)
      const response = await api.get(`/judge/evaluations/assigned/${assignment.id}`)
      if (response.ok) {
        setSelectedAssignment(response.data)
        setModalOpen(true)
      } else {
        toast.error('Failed to load team details')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error loading team details')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleModalSuccess = () => {
    fetchQueue()
    setSelectedAssignment(null)
  }

  const filteredQueue = queue.filter(item =>
    item.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.project_title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex">
      <JudgeSidebar isOpen completedCount={completedCount} pendingCount={pendingCount} />

      <div className="flex-1 md:ml-64 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Team Evaluations
            </h1>
            <p className="text-slate-600">
              {statusFilter === 'all' ? 'All assignments' : statusFilter} • {filteredQueue.length} teams
            </p>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex flex-col md:flex-row gap-4"
          >
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search teams or projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'pending', 'evaluating', 'completed'] as const).map(filter => (
                <motion.button
                  key={filter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setStatusFilter(filter)
                    setPage(1)
                  }}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-all capitalize ${
                    statusFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {filter}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto text-indigo-600 mb-3 animate-spin" size={32} />
                <p className="text-slate-600">Loading assignments...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-700">{error}</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
                <AlertCircle className="mx-auto text-slate-400 mb-3" size={32} />
                <p className="text-slate-600">No teams found matching your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQueue.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <TeamQueueItem
                      {...item}
                      onClick={() => handleTeamClick(item)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Pagination */}
          {!loading && filteredQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
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
                disabled={filteredQueue.length < 10}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Next
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Evaluation Modal */}
      {selectedAssignment && (
        <EvaluationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
          {...selectedAssignment}
        />
      )}
    </div>
  )
}
