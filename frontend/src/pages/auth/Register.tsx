import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../../lib/api'
import { motion } from 'framer-motion'
import { ArrowRight, EyeOff, Eye, Zap, Check } from 'lucide-react'
import { toast } from 'sonner'

function PasswordStrength({ pw }: { pw: string }) {
  const checks = [
    { label: '8+ characters', ok: pw.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pw) },
    { label: 'Number', ok: /\d/.test(pw) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400']
  const labels = ['Weak', 'Fair', 'Strong']

  if (!pw) return null
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="flex justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
              {c.ok && <Check className="w-3 h-3" />}{c.label}
            </span>
          ))}
        </div>
        <span className={`text-[11px] font-bold ${colors[score - 1]?.replace('bg-', 'text-') || 'text-slate-400'}`}>{score > 0 ? labels[score - 1] : ''}</span>
      </div>
    </div>
  )
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('participant')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const roles = [
    { value: 'participant', label: 'Participant', icon: 'Code', desc: 'Build & compete' },
    { value: 'mentor', label: 'Organizer', icon: 'Zap', desc: 'Host & manage' },
    { value: 'judge', label: 'Judge', icon: 'Check', desc: 'Evaluate teams' },
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!email || !password || !name) {
      toast.error('Please fill in all fields')
      return
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    console.log('[Register] Form submitted:', { email, name, role })
    setLoading(true)
    try {
      console.log('[Register] Calling api.post("/auth/register")...')
      const res = await api.post('/auth/register', { email, password, full_name: name, role })
      console.log('[Register] Success:', res)
      toast.success('Account created! Redirecting to login...')
      setTimeout(() => navigate('/auth/login'), 900)
    } catch (err: any) {
      console.error('[Register] Error:', err.message)
      toast.error(err.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left pane */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #6366f1 1.5px, transparent 0)', backgroundSize: '36px 36px' }} />

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md mx-auto"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">Evalence</span>
          </Link>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">Create your account</h1>
          <p className="text-slate-500 font-medium mb-8 text-sm">Join the standard for hackathon management.</p>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-3 rounded-none border text-center transition-all duration-200 cursor-pointer hover:rounded-md ${role === r.value ? 'border-indigo-700 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <div className={`text-xs font-bold mb-2 ${role === r.value ? 'text-indigo-700' : 'text-slate-700'}`}>{r.label}</div>
                    <div className="text-[10px] text-slate-400">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Johnson"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-none hover:rounded-md border border-slate-200 text-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-none hover:rounded-md border border-slate-200 text-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-none hover:rounded-md border border-slate-200 text-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md transition-all placeholder:text-slate-300"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength pw={password} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-none hover:rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Sign in →</Link>
          </p>
        </motion.div>
      </div>

      {/* Right pane — visual */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex w-[45%] relative bg-slate-950 overflow-hidden items-center justify-center"
      >
        <div className="auth-orb-1 absolute w-96 h-96 -top-24 -right-24 rounded-full blur-3xl opacity-60" />
        <div className="auth-orb-2 absolute w-80 h-80 bottom-0 left-0 rounded-full blur-3xl opacity-50" />
        <div className="relative z-10 px-16 py-20 text-center">
          <h2 className="text-3xl font-black text-white mb-4 leading-tight">
            Join the future of<br />
            <span className="text-indigo-400">hackathon management.</span>
          </h2>
          <p className="text-slate-400 font-medium max-w-xs mx-auto">
            From solo organisers to institutions running 50+ events — Evalence scales with you.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[['10K+', 'Hackers'], ['500+', 'Events'], ['100%', 'Fair Judging']].map(([n, l]) => (
              <div key={l} className="glass-card rounded-xl p-4 text-center">
                <div className="text-xl font-black text-white">{n}</div>
                <div className="text-xs text-slate-400 font-semibold mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
