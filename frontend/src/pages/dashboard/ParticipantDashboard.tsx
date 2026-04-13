import { PageTransition } from '../../components/PageTransition'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { UploadCloud, GitBranch, Globe, Code2, Trophy, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { motion } from 'framer-motion'  

interface Team {
  id: number
  name: string
  members: any[]
}

interface Hackathon {
  id: number
  name: string
  start_date?: string
  end_date?: string
}

export default function ParticipantDashboard() {
  const [me, setMe] = useState<any>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [github, setGithub] = useState('')
  const [demo, setDemo] = useState('')
  const [techInput, setTechInput] = useState('')
  const [tech, setTech] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hackathonId, setHackathonId] = useState<number>(1)
  const [teamId, setTeamId] = useState<number>(1)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const user = await api.get('/auth/me')
        setMe(user)

        // Try to load hackathons and get the first one
        const hackathons = await api.get('/hackathons?limit=1')
        if (hackathons.length > 0) {
          const h = hackathons[0]
          setHackathon(h)
          setHackathonId(h.id)

          // Load teams for this hackathon and get the first one
          const teams = await api.get(`/hackathons/${h.id}/teams`)
          if (teams.length > 0) {
            setTeam(teams[0])
            setTeamId(teams[0].id)

            // Load projects for this hackathon
            const allProjects = await api.get(`/hackathons/${h.id}/projects`)
            const teamProjects = allProjects.filter((p: any) => p.team_id === teams[0].id)

            // Pre-fill the form if there's an existing project
            if (teamProjects.length > 0) {
              const latest = teamProjects[0]
              setTitle(latest.title)
              setDescription(latest.description || '')
              setGithub(latest.github_url || '')
              setDemo(latest.demo_url || '')
              setTech(latest.tech_stack || [])
            }
          }
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const addTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && techInput.trim()) {
      e.preventDefault()
      setTech(prev => [...new Set([...prev, techInput.trim()])])
      setTechInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hackathonId || !teamId) {
      setError('Team or hackathon not found')
      return
    }

    setSaving(true)
    try {
      await api.post('/projects', {
        title,
        description,
        github_url: github,
        demo_url: demo,
        tech_stack: tech,
        team_id: teamId,
        hackathon_id: hackathonId
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      console.error(err)
      setError('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <p className="text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!hackathon || !team) {
    return (
      <PageTransition>
        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Team Assignment</h2>
            <p className="text-slate-600 mb-6">You haven't been assigned to a team yet. Contact the event organizer to join a team.</p>
            <p className="text-sm text-slate-500">Once you're added to a team, your submission form will appear here.</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hacker Status</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Submit your project deliverables and track your team's progress.</p>
          </div>
          {me && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {me.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 leading-none">{me.full_name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 capitalize">{me.role}</div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </motion.div>
        )}

        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Project submission saved successfully!
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Project Submission</h2>
              <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-8 shadow-sm hover:shadow-md transition-all space-y-6">

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Project Title *</label>
                  <Input placeholder="What did you build?" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Short Description</label>
                  <textarea
                    rows={3}
                    placeholder="What problem does it solve? How did you build it?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><GitBranch className="w-3 h-3" /> GitHub Repository</label>
                    <Input type="url" placeholder="https://github.com/team/project" value={github} onChange={e => setGithub(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Globe className="w-3 h-3" /> Live Demo URL</label>
                    <Input type="url" placeholder="https://project.vercel.app" value={demo} onChange={e => setDemo(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Code2 className="w-3 h-3" /> Tech Stack <span className="text-slate-300 normal-case font-normal">(press Enter to add)</span></label>
                  <Input placeholder="e.g. React, FastAPI, PostgreSQL" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={addTech} />
                  {tech.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {tech.map(t => (
                        <span key={t} onClick={() => setTech(prev => prev.filter(x => x !== t))}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-none hover:rounded-md text-xs font-bold cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
                          {t} ×
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><UploadCloud className="w-3 h-3" /> Pitch Deck / Demo Video</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                    <UploadCloud className="w-8 h-8 text-slate-300 mb-3 group-hover:text-indigo-500 transition-colors" />
                    <p className="text-sm font-bold text-slate-700">Drag & Drop files here</p>
                    <p className="text-xs text-slate-400 mt-1">PDF or MP4 (Max 50 MB)</p>
                    <span className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">Browse Files</span>
                  </div>
                </div>

                <Button type="submit" fullWidth disabled={saving || !title} className="py-3">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Submit Final Project</>}
                </Button>
              </div>
            </div>
          </form>

          {/* Team Sidebar */}
          <div className="space-y-6">
            {/* Team Info */}
            {team && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Your Team</h2>
                <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 shadow-sm hover:shadow-md transition-all space-y-5">
                  <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                      <Code2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-900 tracking-tight">{team.name}</h3>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Team #{team.id}</span>
                    </div>
                  </div>
                  {team.members && team.members.length > 0 ? (
                    <>
                      {team.members.map((member, idx) => (
                        <TeamMember key={idx} name={member.name || member.email} role="Team Member" />
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No members listed</p>
                  )}
                </div>
              </div>
            )}

            {/* Event Deadlines */}
            {hackathon && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Event Schedule</h2>
                <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                  {hackathon.start_date && (
                    <Deadline label="Event Start" value={hackathon.start_date} />
                  )}
                  {hackathon.end_date && (
                    <Deadline label="Event End" value={hackathon.end_date} urgent />
                  )}
                </div>
              </div>
            )}

            {/* Quick Status */}
            <div className="bg-indigo-600 rounded-none hover:rounded-lg p-6 text-white shadow-md hover:shadow-lg transition-all">
              <Trophy className="w-6 h-6 mb-3 opacity-80" />
              <div className="font-black text-xl mb-1">Keep building!</div>
              <p className="text-indigo-200 text-sm font-medium">You're competing in <strong>{hackathon?.name || 'this hackathon'}</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function TeamMember({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 flex-shrink-0">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 leading-none">{name}</p>
        <p className="text-xs font-medium text-slate-400 mt-0.5">{role}</p>
      </div>
    </div>
  )
}

function Deadline({ label, value, urgent }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        {urgent ? <Clock className="w-3.5 h-3.5 text-rose-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />}
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className={`text-xs font-bold ${urgent ? 'text-rose-600' : 'text-slate-400'}`}>{value}</span>
    </div>
  )
}
