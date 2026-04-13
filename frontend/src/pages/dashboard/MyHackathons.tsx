import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'
import { Button } from '../../components/ui/Button'
import { motion } from 'framer-motion'
import { Plus, ChevronRight, Calendar, Users, Zap, TrendingUp, Edit2, Trash2, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { CreateHackathonModal } from '../../components/modals/CreateHackathonModal'

interface Hackathon {
  id: number
  name: string
  description?: string
  status: string
  start_date?: string
  end_date?: string
  prize_pool?: string
  max_teams?: number
  created_at?: string
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: '📋 Draft' },
  registration_open: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🔓 Registration Open' },
  evaluating: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⏳ Evaluating' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Completed' },
}

export default function MyHackathons() {
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadHackathons = async () => {
    try {
      setLoading(true)
      const data = await api.get('/me/hackathons')
      setHackathons(data)
    } catch (err) {
      toast.error('Failed to load hackathons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHackathons()
  }, [])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return

    setDeleting(id)
    try {
      // TODO: Add delete endpoint to backend
      toast.success('Hackathon deleted')
      await loadHackathons()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete hackathon')
    } finally {
      setDeleting(null)
    }
  }

  const getStatusInfo = (status: string) => {
    return statusColors[status] || statusColors.draft
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Hackathons</h1>
                <p className="text-lg text-gray-600">
                  Create and manage your hackathons with comprehensive controls
                </p>
              </div>
              <Button size="lg" onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus size={20} />
                Create Hackathon
              </Button>
            </div>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading your hackathons...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && hackathons.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300"
            >
              <Zap size={48} className="mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Hackathons Yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start by creating your first hackathon. You'll be able to manage judges, coordinators, and much more.
              </p>
              <Button size="lg" onClick={() => setShowCreateModal(true)}>
                <Plus size={20} />
                Create Your First Hackathon
              </Button>
            </motion.div>
          )}

          {/* Hackathons Grid */}
          {!loading && hackathons.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {hackathons.map((hackathon, index) => {
                const statusInfo = getStatusInfo(hackathon.status)
                return (
                  <motion.div
                    key={hackathon.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/organizer/hackathons/${hackathon.id}`)}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer group overflow-hidden border border-gray-200 hover:border-blue-300"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="text-xl font-bold group-hover:translate-x-1 transition-transform">
                          {hackathon.name}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {hackathon.description && (
                        <p className="text-blue-100 text-sm line-clamp-2">{hackathon.description}</p>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {hackathon.start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-blue-600" />
                            <div>
                              <p className="text-xs text-gray-500">Start</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(hackathon.start_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {hackathon.max_teams && (
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-indigo-600" />
                            <div>
                              <p className="text-xs text-gray-500">Max Teams</p>
                              <p className="text-sm font-semibold text-gray-900">{hackathon.max_teams}</p>
                            </div>
                          </div>
                        )}
                        {hackathon.prize_pool && (
                          <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-600" />
                            <div>
                              <p className="text-xs text-gray-500">Prize</p>
                              <p className="text-sm font-semibold text-gray-900">{hackathon.prize_pool}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/organizer/hackathons/${hackathon.id}`)
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
                        >
                          <Edit2 size={16} />
                          Manage
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(hackathon.id, hackathon.name)
                          }}
                          disabled={deleting === hackathon.id}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {deleting === hackathon.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <CreateHackathonModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadHackathons}
      />
    </PageTransition>
  )
}
