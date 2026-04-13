import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, BarChart3, ClipboardList, History, Home, LogOut, ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface JudgeSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  completedCount?: number
  pendingCount?: number
  onLogout?: () => void
}

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: number | string
  color?: string
}

export function JudgeSidebar({
  isOpen = true,
  onClose,
  completedCount = 0,
  pendingCount = 0,
  onLogout
}: JudgeSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>('assignments')
  const location = useLocation()

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: <Home size={18} />,
      href: '/judge',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'Assignments',
      icon: <ClipboardList size={18} />,
      href: '/judge/evaluations',
      badge: pendingCount,
      color: 'from-indigo-500 to-purple-600'
    },
    {
      label: 'My Ratings',
      icon: <BarChart3 size={18} />,
      href: '/judge/history',
      badge: completedCount,
      color: 'from-emerald-500 to-green-600'
    },
    {
      label: 'Progress',
      icon: <History size={18} />,
      href: '/judge/progress',
      color: 'from-amber-500 to-orange-600'
    }
  ]

  const isActive = (href: string) => location.pathname === href

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <span className="text-xl font-bold text-white">⭐</span>
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Judge Portal</h2>
            <p className="text-xs text-slate-500">Evaluation Hub</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 space-y-2">
        <motion.div
          className="p-3 bg-indigo-50 rounded-lg border border-indigo-200"
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-slate-600">Pending</p>
          <p className="text-2xl font-bold text-indigo-600">{pendingCount}</p>
        </motion.div>
        <motion.div
          className="p-3 bg-emerald-50 rounded-lg border border-emerald-200"
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-slate-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
            <Link
              to={item.href}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                isActive(item.href)
                  ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge ? (
                <motion.span
                  className="px-2 py-1 text-xs font-bold rounded-full bg-white/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  {item.badge}
                </motion.span>
              ) : null}
            </Link>
          </motion.div>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-3 py-2 border-t border-slate-200" />

      {/* Quick Actions */}
      <div className="px-3 py-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            onLogout?.()
            setMobileOpen(false)
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <LogOut size={18} />
          Logout
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed top-4 left-4 z-40 md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X size={24} className="text-slate-900" />
        ) : (
          <Menu size={24} className="text-slate-900" />
        )}
      </motion.button>

      {/* Desktop Sidebar */}
      <motion.div
        initial={{ x: isOpen ? 0 : -256 }}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ duration: 0.3 }}
        className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 shadow-lg z-30 overflow-hidden"
      >
        <SidebarContent />
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-20"
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-20 overflow-hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Spacer */}
      {isOpen && <div className="hidden md:block w-64" />}
    </>
  )
}
