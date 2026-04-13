import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, CalendarDays, Settings, LogOut, Search, Bell, TerminalSquare, Globe, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '../lib/api'
import { useEffect, useState } from 'react'

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.get('/auth/me')
        setUser(userData)
      } catch (err) {
        console.error(err)
        navigate('/auth/login')
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [navigate])

  // Role-based nav items
  const getNavItems = () => {
    if (!user) return []
    
    const baseItems = [
      { name: 'Profile', path: '/dashboard/profile', icon: Settings, roles: ['participant', 'judge', 'mentor', 'super_admin'] },
      { name: 'Events', path: '/events', icon: Globe, roles: ['participant', 'judge', 'mentor', 'super_admin'] },
    ]

    const roleItems: Record<string, any[]> = {
      mentor: [
        { name: 'My Hackathons', path: '/organizer', icon: LayoutDashboard },
        { name: 'Portal', path: '/dashboard/organizer', icon: LayoutDashboard },
        { name: 'New Event', path: '/dashboard/mentor/create', icon: TerminalSquare },
      ],
      judge: [
        { name: 'Scoreboard', path: '/dashboard/judge', icon: CalendarDays },
      ],
      participant: [
        { name: 'My Project', path: '/dashboard/participant', icon: Users },
      ],
      super_admin: [
        { name: 'My Hackathons', path: '/organizer', icon: LayoutDashboard },
        { name: 'Portal', path: '/dashboard/organizer', icon: LayoutDashboard },
        { name: 'New Event', path: '/dashboard/mentor/create', icon: TerminalSquare },
        { name: 'Scoreboard', path: '/dashboard/judge', icon: CalendarDays },
      ]
    }

    return (roleItems[user.role] || []).concat(baseItems.filter(item => item.roles.includes(user.role)))
  }

  const getRoleLabel = () => {
    if (!user) return ''
    const labels: Record<string, string> = {
      mentor: 'Event Organizer',
      judge: 'Judge',
      participant: 'Participant',
      super_admin: 'Super Admin'
    }
    return labels[user.role] || user.role
  }

  const handleLogout = () => {
    api.setAuthToken('')
    navigate('/auth/login')
  }

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const navItems = getNavItems()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-indigo-500/30 selection:text-indigo-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Link to="/" className="text-xl font-bold tracking-tight text-indigo-600 flex items-center gap-2">
               <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                 <TerminalSquare className="w-4 h-4 text-white" />
               </div>
               Evalence
            </Link>
          </div>
          
          <div className="p-4 mt-2 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-3">{getRoleLabel()}</div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all group relative overflow-hidden",
                    isActive 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />}
                  <Icon className={clsx("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center w-full max-w-md bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search hackathons, teams, or participants..." 
              className="bg-transparent border-none outline-none text-sm w-full font-medium placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            {user && (
              <div className="flex items-center gap-3 border-l border-slate-200 pl-6 cursor-pointer group">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold text-slate-900 leading-none">{user.full_name}</div>
                  <div className="text-[11px] font-medium text-slate-400 mt-1 capitalize">{getRoleLabel()}</div>
                </div>
                <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-transparent group-hover:ring-indigo-100 transition-all shadow-sm">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto w-full">
          <AnimatePresence mode="wait">
             <Outlet key={location.pathname} />
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
