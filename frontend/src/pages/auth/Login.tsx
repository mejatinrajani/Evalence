import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../../lib/api'
import { motion } from 'framer-motion'
import { ArrowRight, EyeOff, Eye, Zap, Shield, Trophy } from 'lucide-react'
import { toast } from 'sonner'

const features = [
  { icon: Zap, text: 'Z-Score bias elimination' },
  { icon: Shield, text: 'JWT-secured role portals' },
  { icon: Trophy, text: 'Animated live leaderboards' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)
      const res = await api.request('/auth/token', { method: 'POST', body: formData })
      api.setAuthToken(res.access_token, res.refresh_token)
      // Also store user info for later use
      localStorage.setItem('evalence_user_id', res.user_id)
      localStorage.setItem('evalence_user_role', res.role)
      toast.success(`Welcome back, ${res.full_name || 'there'}!`)
      setTimeout(() => {
        if (res.role === 'mentor' || res.role === 'super_admin') navigate('/dashboard/organizer')
        else if (res.role === 'judge') navigate('/dashboard/judge')
        else navigate('/dashboard/participant')
      }, 600)
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Form Pane */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-white relative overflow-hidden">
        {/* Subtle background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #6366f1 1.5px, transparent 0)', backgroundSize: '36px 36px' }} />

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md mx-auto"
        >
          {/* Brand */}
          <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">Evalence</span>
          </Link>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 font-medium mb-8 text-sm">Sign in to continue to your workspace.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-none hover:rounded-md border border-slate-200 text-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
                <Link to="/auth/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-none hover:rounded-md border border-slate-200 text-slate-900 text-sm font-medium bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md transition-all placeholder:text-slate-300"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-none hover:rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            New to Evalence?{' '}
            <Link to="/auth/register" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Create a free account →
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right — Visual Pane */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex flex-1 relative bg-slate-950 overflow-hidden items-center justify-center"
      >
        {/* Orbs */}
        <div className="auth-orb-1 absolute w-96 h-96 -top-24 -right-24 rounded-full blur-3xl opacity-60" />
        <div className="auth-orb-2 absolute w-80 h-80 bottom-0 left-0 rounded-full blur-3xl opacity-50" />
        <div className="auth-orb-3 absolute w-64 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 px-16 py-20 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-none hover:rounded-md text-white/60 text-xs font-bold uppercase tracking-widest mb-8 self-start border border-white/10 transition-all">
              <Zap className="w-3 h-3" /> Platform v2.0
            </div>
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-4">
              The Operating System<br />
              <span className="text-indigo-400">for Hackathons.</span>
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed max-w-sm mb-12">
              Thousands of organizers trust Evalence to run bias-free, beautifully orchestrated events at scale.
            </p>

            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-slate-300 font-semibold text-sm">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Glassmorphism card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card rounded-none hover:rounded-lg p-5 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">JD</div>
              <div>
                <p className="text-white text-sm font-semibold leading-snug">"The Z-Score normalization completely eliminated the bias we saw in previous years. This is a game changer."</p>
                <p className="text-slate-500 text-xs mt-2 font-semibold">Dr. James Doe — MLHACK 2025 Lead Organizer</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
