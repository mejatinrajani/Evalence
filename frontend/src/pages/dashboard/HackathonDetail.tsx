import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Edit2,
  Save,
  X,
  Users,
  Award,
  Calendar,
  Briefcase,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { JudgeManagement } from '../../components/organizer/JudgeManagement'
import { CoordinatorManagement } from '../../components/organizer/CoordinatorManagement'
import RoundsList from '../../components/organizer/RoundsList'
import CriteriaManager from '../../components/organizer/CriteriaManager'
import { JudgeAssignmentUI } from '../../components/organizer/JudgeAssignmentUI'
import AnnouncementCreator from '../../components/organizer/AnnouncementCreator'
import ParticipantsTable from '../../components/organizer/ParticipantsTable'
import LiveAnalyticsDashboard from '../../components/organizer/LiveAnalyticsDashboard'

type TabType = 'overview' | 'analytics' | 'judges' | 'coordinators' | 'rounds' | 'assignments' | 'communication' | 'participants'

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
  teams?: any[]
  rounds?: any[]
  judges?: any[]
  coordinators?: any[]
  credentials?: any[]
}

export default function HackathonDetail() {
  const { hackathonId } = useParams<{ hackathonId: string }>()
  const navigate = useNavigate()

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [selectedRound, setSelectedRound] = useState<any>(null)

  const loadHackathon = async () => {
    try {
      setLoading(true)
      const data = await api.get(`/me/hackathons/${hackathonId}`)
      setHackathon(data)
      setEditForm(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load hackathon')
      setTimeout(() => navigate('/organizer'), 2000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHackathon()
  }, [hackathonId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/me/hackathons/${hackathonId}`, {
        name: editForm.name,
        description: editForm.description,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        prize_pool: editForm.prize_pool,
        max_teams: editForm.max_teams ? parseInt(editForm.max_teams) : null,
        teams: [],
        rounds: [],
      })
      toast.success('Hackathon updated!')
      setIsEditing(false)
      await loadHackathon()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save hackathon')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 size={48} className="animate-spin text-blue-600" />
        </div>
      </PageTransition>
    )
  }

  if (!hackathon) {
    return (
      <PageTransition>
        <div className="text-center py-20">
          <p className="text-gray-600">Hackathon not found</p>
        </div>
      </PageTransition>
    )
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    registration_open: 'bg-blue-100 text-blue-700',
    evaluating: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'analytics', label: 'Analytics', icon: Award },
    { id: 'rounds', label: 'Rounds', icon: Settings },
    { id: 'assignments', label: 'Assignments', icon: Users },
    { id: 'judges', label: 'Judges', icon: Award },
    { id: 'coordinators', label: 'Coordinators', icon: Users },
    { id: 'communication', label: 'Communication', icon: Users },
    { id: 'participants', label: 'Participants', icon: Users },
  ]

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate('/organizer')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium"
            >
              <ChevronLeft size={20} />
              Back to My Hackathons
            </button>

            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{hackathon.name}</h1>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      statusColors[hackathon.status] || statusColors.draft
                    }`}
                  >
                    {hackathon.status.replace('_', ' ').charAt(0).toUpperCase() +
                      hackathon.status.replace('_', ' ').slice(1)}
                  </span>
                  <p className="text-gray-600">Created {new Date(hackathon.created_at!).toLocaleDateString()}</p>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (isEditing) {
                    handleSave()
                  } else {
                    setIsEditing(true)
                  }
                }}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit2 size={18} />
                    Edit
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </motion.div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {isEditing ? (
                  <>
                    {/* Editing Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <Input
                          type="date"
                          value={editForm.start_date || ''}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <Input
                          type="date"
                          value={editForm.end_date || ''}
                          onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prize Pool</label>
                        <Input
                          value={editForm.prize_pool || ''}
                          onChange={(e) => setEditForm({ ...editForm, prize_pool: e.target.value })}
                          placeholder="e.g., $10,000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Teams</label>
                        <Input
                          type="number"
                          value={editForm.max_teams || ''}
                          onChange={(e) => setEditForm({ ...editForm, max_teams: e.target.value })}
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button variant="secondary" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        Save All Changes
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Description</p>
                        <p className="text-lg text-gray-900">{hackathon.description || 'No description provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <p className="text-lg text-gray-900 capitalize">{hackathon.status.replace('_', ' ')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {hackathon.start_date && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                            <Calendar size={16} />
                            Start Date
                          </p>
                          <p className="text-lg text-gray-900">{new Date(hackathon.start_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {hackathon.end_date && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">End Date</p>
                          <p className="text-lg text-gray-900">{new Date(hackathon.end_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {hackathon.prize_pool && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Prize Pool</p>
                          <p className="text-lg font-semibold text-green-600">{hackathon.prize_pool}</p>
                        </div>
                      )}
                      {hackathon.max_teams && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Max Teams</p>
                          <p className="text-lg text-gray-900">{hackathon.max_teams}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Teams</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{hackathon.teams?.length || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Judges</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">{hackathon.judges?.length || 0}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Coordinators</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">{hackathon.coordinators?.length || 0}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Judges Tab */}
            {activeTab === 'judges' && (
              <JudgeManagement
                hackathonId={parseInt(hackathonId!)}
                judges={hackathon.credentials?.filter((c: any) => c.role === 'judge') || []}
                onRefresh={loadHackathon}
              />
            )}

            {/* Coordinators Tab */}
            {activeTab === 'coordinators' && (
              <CoordinatorManagement
                hackathonId={parseInt(hackathonId!)}
                coordinators={hackathon.credentials?.filter((c: any) => c.role === 'coordinator') || []}
                onRefresh={loadHackathon}
              />
            )}

            {/* Rounds Tab */}
            {activeTab === 'rounds' && (
              <div className="space-y-6">
                <RoundsList
                  hackathonId={parseInt(hackathonId!)}
                  onRoundSelect={(round) => setSelectedRound(round)}
                />
                <div className="border-t border-gray-200 pt-6">
                  <CriteriaManager
                    hackathonId={parseInt(hackathonId!)}
                    roundId={selectedRound?.id}
                  />
                </div>
              </div>
            )}

            {/* Judge Assignments Tab */}
            {activeTab === 'assignments' && (
              <JudgeAssignmentUI hackathonId={parseInt(hackathonId!)} />
            )}

            {/* Communication Tab */}
            {activeTab === 'communication' && (
              <AnnouncementCreator
                hackathonId={parseInt(hackathonId!)}
                onSuccess={loadHackathon}
              />
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <LiveAnalyticsDashboard hackathonId={parseInt(hackathonId!)} />
            )}

            {/* Participants Tab */}
            {activeTab === 'participants' && (
              <ParticipantsTable hackathonId={parseInt(hackathonId!)} />
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
