import { PageTransition } from '../../components/PageTransition'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useEffect, useState, useRef } from 'react'
import { api } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Menu, ChevronRight, Users, BarChart3, FileText, Upload, Calendar, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { AnimatedCounter } from '../../components/ui/AnimatedCounter'

interface Hackathon {
  id: number
  name: string
  description?: string
  status: string
  start_date?: string
  end_date?: string
  prize_pool?: string
  max_teams?: number
}

interface Team {
  id: number
  name: string
  members: any[]
  hackathon_id: number
}

interface HackathonStats {
  hackathon_id: number
  hackathon_name: string
  total_teams: number
  total_projects: number
  projects_submitted: number
  submission_rate: number
  total_evaluations: number
  expected_evaluations: number
  evaluation_progress: number
  status: string
  criteria_stats: Record<string, any>
}

type TabType = 'events' | 'teams' | 'stats' | 'submissions'

export default function OrganizerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('events')
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [stats, setStats] = useState<HackathonStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [eventForm, setEventForm] = useState({ name: '', description: '', start_date: '', end_date: '', prize_pool: '', max_teams: '' })
  const [teamForm, setTeamForm] = useState({ name: '', members: '' })
  const [importStatus, setImportStatus] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  // Load hackathons
  const loadHackathons = async () => {
    try {
      setLoading(true)
      const data = await api.get('/hackathons?limit=100')
      setHackathons(data)
      if (!selectedHackathon && data.length > 0) {
        setSelectedHackathon(data[0])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  // Load teams for selected hackathon
  const loadTeams = async (hackathonId: number) => {
    try {
      const data = await api.get(`/hackathons/${hackathonId}/teams`)
      setTeams(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load teams')
    }
  }

  // Load stats for selected hackathon
  const loadStats = async (hackathonId: number) => {
    try {
      const data = await api.get(`/hackathons/${hackathonId}/stats`)
      setStats(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadHackathons()
  }, [])

  useEffect(() => {
    if (selectedHackathon) {
      loadTeams(selectedHackathon.id)
      loadStats(selectedHackathon.id)
    }
  }, [selectedHackathon])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/hackathons', {
        ...eventForm,
        teams: [],
        rounds: [
          { name: 'Final Round', criteria: [{ name: 'Innovation', max_points: 10 }] }
        ]
      })
      toast.success('Event created!')
      setEventForm({ name: '', description: '', start_date: '', end_date: '', prize_pool: '', max_teams: '' })
      setShowCreateEvent(false)
      loadHackathons()
    } catch (err) {
      toast.error('Failed to create event')
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHackathon) return
    try {
      const members = teamForm.members ? teamForm.members.split('\n').map(line => {
        const [name, email] = line.split(',').map(s => s.trim())
        return { name: name || '', email: email || '' }
      }).filter(m => m.email) : []

      await api.post(`/teams?hackathon_id=${selectedHackathon.id}`, {
        name: teamForm.name,
        members
      })
      toast.success('Team created!')
      setTeamForm({ name: '', members: '' })
      setShowCreateTeam(false)
      loadTeams(selectedHackathon.id)
    } catch (err) {
      toast.error('Failed to create team')
    }
  }

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Delete this team?')) return
    try {
      await api.request(`/teams/${teamId}`, { method: 'DELETE' })
      toast.success('Team deleted!')
      if (selectedHackathon) {
        loadTeams(selectedHackathon.id)
      }
    } catch (err) {
      toast.error('Failed to delete team')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedHackathon) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/hackathons/${selectedHackathon.id}/teams/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')
      const result = await response.json()
      setImportStatus(result)
      toast.success(`Imported ${result.imported} teams!`)
      loadTeams(selectedHackathon.id)
    } catch (err) {
      toast.error('Failed to import teams')
    } finally {
      setUploading(false)
    }
  }

  const statCard = (label: string, value: number, icon: React.ReactNode, color: string) => (
    <div className={`bg-white border border-slate-200 rounded-none hover:rounded-lg p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-900"><AnimatedCounter target={value} /></div>
    </div>
  )

  return (
    <PageTransition>
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organizer Portal</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage events, teams, and track progress</p>
          </div>
          <Button onClick={() => setShowCreateEvent(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Event
          </Button>
        </div>

        {/* Hackathon Selector */}
        {hackathons.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {hackathons.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedHackathon(h)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedHackathon?.id === h.id
                    ? 'bg-indigo-600 text-white border border-indigo-600'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        {selectedHackathon && (
          <>
            <div className="flex gap-1 border-b border-slate-200">
              {(['events', 'teams', 'stats'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-semibold text-sm transition-all ${
                    activeTab === tab
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'events' ? 'Events' : tab === 'teams' ? 'Teams' : 'Analytics'}
                </button>
              ))}
            </div>

            {/* Events Tab */}
            {activeTab === 'events' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">{selectedHackathon.name}</h3>
                  <div className="space-y-3 text-sm">
                    {selectedHackathon.description && (
                      <p className="text-slate-700">{selectedHackathon.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {selectedHackathon.start_date && (
                        <div>
                          <span className="font-semibold text-slate-600">Start:</span>
                          <p>{selectedHackathon.start_date}</p>
                        </div>
                      )}
                      {selectedHackathon.end_date && (
                        <div>
                          <span className="font-semibold text-slate-600">End:</span>
                          <p>{selectedHackathon.end_date}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreateTeam(true)} variant="secondary" className="gap-2 flex-1 md:flex-none">
                    <Plus className="w-4 h-4" /> Add Team
                  </Button>
                  <Button onClick={() => setShowImportModal(true)} variant="secondary" className="gap-2 flex-1 md:flex-none">
                    <Upload className="w-4 h-4" /> Import CSV/XLSX
                  </Button>
                </div>

                {teams.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-lg">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-semibold">No teams yet</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {teams.map(team => (
                      <div key={team.id} className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">{team.name}</h4>
                          <p className="text-sm text-slate-500">{team.members?.length || 0} members</p>
                        </div>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-all text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {statCard('Total Teams', stats.total_teams, <Users className="w-5 h-5 text-blue-600" />, 'bg-blue-50')}
                  {statCard('Projects Submitted', stats.projects_submitted, <FileText className="w-5 h-5 text-green-600" />, 'bg-green-50')}
                  {statCard('Submission Rate', Math.round(stats.submission_rate), <BarChart3 className="w-5 h-5 text-purple-600" />, 'bg-purple-50')}
                  {statCard('Evaluations', stats.total_evaluations, <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'bg-emerald-50')}
                </div>

                <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">Evaluation Progress</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold">{stats.total_evaluations} / {stats.expected_evaluations}</span>
                      <span className="text-slate-500">{Math.round(stats.evaluation_progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${stats.evaluation_progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Create Event Modal */}
        <AnimatePresence>
          {showCreateEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowCreateEvent(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Create New Event</h2>
                  <button onClick={() => setShowCreateEvent(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateEvent} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">Event Name</label>
                    <Input
                      placeholder="HackathonXYZ"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">Description</label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      rows={3}
                      placeholder="Event description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">Start Date</label>
                      <Input type="date" value={eventForm.start_date} onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">End Date</label>
                      <Input type="date" value={eventForm.end_date} onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" fullWidth>Create Event</Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Team Modal */}
        <AnimatePresence>
          {showCreateTeam && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowCreateTeam(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Create Team</h2>
                  <button onClick={() => setShowCreateTeam(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">Team Name</label>
                    <Input
                      placeholder="Team Alpha"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">Members (Name, Email)</label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      rows={4}
                      placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com"
                      value={teamForm.members}
                      onChange={(e) => setTeamForm({ ...teamForm, members: e.target.value })}
                    />
                  </div>
                  <Button type="submit" fullWidth>Create Team</Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import Modal */}
        <AnimatePresence>
          {showImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowImportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Import Teams</h2>
                  <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Upload a CSV or XLSX file with columns: <code className="bg-slate-100 px-2 py-1 rounded text-xs">team_name</code> and <code className="bg-slate-100 px-2 py-1 rounded text-xs">members</code> (JSON array)
                  </p>

                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">Click to upload</p>
                    <p className="text-xs text-slate-500 mt-1">CSV or XLSX</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {uploading && (
                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  )}

                  {importStatus && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>{importStatus.imported} imported</span>
                      </div>
                      {importStatus.failed > 0 && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>{importStatus.failed} failed</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button fullWidth onClick={() => setShowImportModal(false)}>Close</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
