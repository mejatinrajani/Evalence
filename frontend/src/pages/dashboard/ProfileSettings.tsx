import { PageTransition } from '../../components/PageTransition'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { User, GitBranch, BookOpen, Tag, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfileSettings() {
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/auth/me').then(data => {
      setProfile(data)
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setGithubUrl(data.github_url || '')
      setSkills(data.skills || [])
    }).catch(console.error)
  }, [])

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      setSkills(prev => [...new Set([...prev, skillInput.trim()])])
      setSkillInput('')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api.request('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ full_name: fullName, bio, github_url: githubUrl, skills })
      })
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <PageTransition>
      <div className="p-8 max-w-3xl mx-auto w-full space-y-8 pb-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Update your public hacker profile and preferences.</p>
        </div>

        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-none hover:rounded-md text-emerald-700 font-semibold text-sm flex items-center gap-2 transition-all">
            <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
          </motion.div>
        )}

        {/* Avatar */}
        <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-8 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
            <div className="w-20 h-20 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-md">
              {fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{fullName || 'Your Name'}</h2>
              <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold rounded-none hover:rounded-md uppercase tracking-wider mt-1 capitalize transition-all">
                {profile.role}
              </span>
              <div className="text-sm text-slate-400 mt-1">{profile.email}</div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><User className="w-3 h-3" /> Display Name</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><GitBranch className="w-3 h-3" /> GitHub URL</label>
                <Input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell others about yourself — your background, interests, and what you love to build."
                className="w-full px-4 py-3 border border-slate-200 rounded-none hover:rounded-md text-sm text-slate-900 resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md font-medium placeholder:font-normal placeholder:text-slate-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Tag className="w-3 h-3" /> Skills <span className="text-slate-300 normal-case font-normal">(press Enter to add)</span></label>
              <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={addSkill} placeholder="e.g. Python, Machine Learning, Figma..." />
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {skills.map(s => (
                    <span key={s} onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-none hover:rounded-md text-xs font-bold cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
                      {s} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
              </Button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-8 shadow-sm hover:shadow-md transition-all space-y-4">
          <h3 className="font-bold text-slate-900">Security</h3>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900">Email Address</p>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Verified</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Password</p>
              <p className="text-xs text-slate-400">Last updated recently</p>
            </div>
            <Button variant="outline" className="text-xs px-3 py-1.5 h-auto min-h-0">Change Password</Button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
