import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Clock, CheckCircle2, AlertCircle, Zap } from 'lucide-react'

interface TeamQueueItemProps {
  id: number
  team_id: number
  team_name: string
  hackathon_name: string
  round_name: string
  status: 'pending' | 'evaluating' | 'completed'
  assigned_at?: string
  started_at?: string
  completed_at?: string
  criteria_count: number
  total_possible_points: number
  project_title?: string
  onClick: () => void
}

export function TeamQueueItem({
  id,
  team_name,
  hackathon_name,
  round_name,
  status,
  assigned_at,
  started_at,
  completed_at,
  criteria_count,
  total_possible_points,
  project_title,
  onClick
}: TeamQueueItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (date?: string) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-emerald-600" />
      case 'evaluating':
        return <Zap size={18} className="text-amber-600" />
      default:
        return <Clock size={18} className="text-slate-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 border-emerald-200'
      case 'evaluating':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  const getStatusBgDot = () => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500'
      case 'evaluating':
        return 'bg-amber-500'
      default:
        return 'bg-slate-300'
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cursor-pointer border-2 transition-all rounded-lg overflow-hidden ${getStatusColor()}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusBgDot()}`} />
              <h3 className="font-bold text-slate-900">{team_name}</h3>
            </div>
            {project_title && (
              <p className="text-xs text-slate-600 ml-5 line-clamp-1">{project_title}</p>
            )}
          </div>
          <motion.div
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={18} className="text-slate-400" />
          </motion.div>
        </div>

        {/* Meta Info */}
        <div className="mb-3 space-y-1 ml-5">
          <p className="text-xs text-slate-600">
            <span className="font-medium">{hackathon_name}</span> • {round_name}
          </p>
          <p className="text-xs text-slate-500">
            {criteria_count} criteria • {total_possible_points} points
          </p>
        </div>

        {/* Status Row */}
        <div className="ml-5 flex items-center justify-between pt-2 border-t border-slate-200/50">
          <div className="flex items-center gap-1.5">
            {getStatusIcon()}
            <span className="text-xs font-medium text-slate-600 capitalize">
              {status === 'completed' ? 'Completed' : status === 'evaluating' ? 'In Progress' : 'Pending'}
            </span>
          </div>
          {assigned_at && (
            <p className="text-xs text-slate-500">
              {formatDate(completed_at || started_at || assigned_at)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
