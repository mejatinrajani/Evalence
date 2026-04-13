import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Code2, Users, LayoutDashboard, Target, Zap, Star, Shield, Trophy } from 'lucide-react'

const stats = [
  { value: '10K+', label: 'Hackers Organized' },
  { value: '500+', label: 'Events Hosted' },
  { value: '98%', label: 'Organizer Satisfaction' },
]

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-16 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '48px 48px', opacity: 0.7 }} />
        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-100 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="max-w-5xl mx-auto w-full z-10 pt-28 pb-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-8 hover:rounded-md transition-all">
              <Zap className="w-3 h-3" /> Advanced Z-Score Normalization
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-slate-900 mb-6">
              Hackathons,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Automated.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-xl mb-10 font-medium leading-relaxed">
              The definitive platform to host, manage, evaluate, and scale hackathons with absolute precision and zero bias.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link to="/auth/register">
                <button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-none hover:rounded-md transition-all hover:shadow-lg flex items-center gap-2 text-sm">
                  Start for Free <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/events">
                <button className="h-14 px-8 border border-slate-300 text-slate-700 font-bold rounded-none hover:rounded-md hover:bg-slate-50 transition-all text-sm">
                  Browse Events
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8">
              {stats.map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-black text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-400 font-semibold mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social proof / mockup section */}
      <section className="py-24 px-6 md:px-16 bg-slate-900 overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-slate-400 font-semibold uppercase tracking-widest text-xs mb-12">Trusted by organizers at top institutions</p>
          <div className="flex justify-center gap-16 flex-wrap">
            {['MIT HackFest', 'AI Summit', 'BuildWeek', 'HackNTU', 'CodeSprint'].map(name => (
              <span key={name} className="text-slate-600 font-black text-lg tracking-tight">{name}</span>
            ))}
          </div>
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { quote: '"Z-Score removed all the favoritism drama. Every team got a fair shot."', name: 'Priya S.', role: 'Organizer, HackNTU 2025' },
              { quote: '"The judge scorecard UI is so clean. We scored 120 teams in under 3 hours."', name: 'Alex R.', role: 'Lead Judge, BuildWeek' },
              { quote: '"The live leaderboard on the big screen drove insane energy in the final hour."', name: 'Tom W.', role: 'Participant, MIT HackFest' },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/5 border border-white/10 rounded-none hover:rounded-lg p-6 text-left transition-all"
              >
                <div className="flex mb-3">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-slate-300 text-sm font-medium leading-relaxed mb-4">{t.quote}</p>
                <div className="text-xs text-slate-500 font-bold">{t.name} · {t.role}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 px-6 md:px-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
              Everything you need.<br />
              <span className="text-indigo-600">Nothing you don't.</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">Evalence handles the complexity so you can focus on running an unforgettable event.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={<Target className="w-5 h-5" />} iconBg="bg-rose-50 text-rose-600" title="Z-Score Normalization" description="Our mathematical algorithm eliminates judge bias. A 6 from a strict judge equals an 8 from a lenient one." />
            <FeatureCard icon={<Users className="w-5 h-5" />} iconBg="bg-blue-50 text-blue-600" title="Team Management" description="Import teams via CSV/XLSX or let participants self-organize. Full roster visibility for organizers." />
            <FeatureCard icon={<Trophy className="w-5 h-5" />} iconBg="bg-amber-50 text-amber-600" title="Live Leaderboards" description="Animated, real-time rankings with a stunning Presentation Mode built for closing ceremonies." />
            <FeatureCard icon={<LayoutDashboard className="w-5 h-5" />} iconBg="bg-emerald-50 text-emerald-600" title="Role Dashboards" description="Dedicated, distraction-free workspaces for Organizers, Judges, and Participants." />
            <FeatureCard icon={<Shield className="w-5 h-5" />} iconBg="bg-purple-50 text-purple-600" title="JWT-Secured RBAC" description="Enterprise-grade security with role-based access control. Judges can't touch organizer endpoints." />
            <FeatureCard icon={<Code2 className="w-5 h-5" />} iconBg="bg-indigo-50 text-indigo-600" title="Project Submissions" description="Tech stack tagging, GitHub integration, demo URLs, and file uploads — all in one place." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 md:px-16 bg-indigo-600 text-white text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-5">Ready to run your best hackathon ever?</h2>
          <p className="text-indigo-200 font-medium text-lg mb-10">Join thousands of organizers already on Evalence.</p>
          <Link to="/auth/register">
            <button className="h-14 px-10 bg-white text-indigo-700 font-bold rounded-none hover:rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 mx-auto">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 md:px-16 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-slate-900">Evalence</span>
          <span className="text-slate-400 text-sm ml-2">© 2026 All rights reserved.</span>
        </div>
        <div className="flex gap-6 text-sm font-semibold text-slate-400">
          <Link to="/privacy-policy" className="hover:text-slate-700 transition-colors">Privacy</Link>
          <Link to="/events" className="hover:text-slate-700 transition-colors">Events</Link>
          <Link to="/auth/login" className="hover:text-slate-700 transition-colors">Sign In</Link>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, iconBg, title, description }: { icon: ReactNode, iconBg: string, title: string, description: string }) {
  return (
    <motion.div
      whileHover={{ boxShadow: '0 8px 24px -6px rgba(99,102,241,0.15)' }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-slate-200 rounded-none hover:rounded-lg p-6 cursor-default transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>{icon}</div>
      <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>
    </motion.div>
  )
}
