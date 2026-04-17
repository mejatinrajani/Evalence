/**
 * Phase 1: Submission Countdown Timer
 * 
 * Displays:
 * - Real-time countdown to submission deadline
 * - Number of teams that have submitted
 * - Progress bar of submission rate
 * - Urgency indicators (warning when < 1 hour)
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface SubmissionCountdownProps {
  hackathonId: number
}

interface SubmissionStatus {
  hackathon_id: number
  status: string
  submission_end: string | null
  time_remaining_seconds: number | null
  submitted_count: number
  total_teams: number
  submission_rate: number
  submission_rate_fraction: string
}

export function SubmissionCountdown({ hackathonId }: SubmissionCountdownProps) {
  const [timeDisplay, setTimeDisplay] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal')

  const { data, isLoading, error } = useQuery(
    ['submission-status', hackathonId],
    () => api.get(`/hackathons/${hackathonId}/submission-status`) as Promise<SubmissionStatus>,
    {
      refetchInterval: 10000, // Refresh every 10 seconds
      enabled: !!hackathonId
    }
  )

  // Update countdown display every second
  useEffect(() => {
    if (!data?.time_remaining_seconds) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const endTime = new Date(data.submission_end).getTime()
      const remainingMs = endTime - now

      if (remainingMs <= 0) {
        setTimeDisplay('Submissions closed!')
        setUrgency('critical')
        return
      }

      const totalSeconds = Math.floor(remainingMs / 1000)
      const days = Math.floor(totalSeconds / (24 * 3600))
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (days > 0) {
        setTimeDisplay(`${days}d ${hours}h ${minutes}m`)
        setUrgency('normal')
      } else if (hours > 0) {
        setTimeDisplay(`${hours}h ${minutes}m ${seconds}s`)
        setUrgency(hours < 1 ? 'warning' : 'normal')
      } else {
        setTimeDisplay(`${minutes}m ${seconds}s`)
        setUrgency('critical')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [data?.submission_end])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!data) return null

  const isClosed = data.time_remaining_seconds <= 0
  const isUrgent = urgency !== 'normal'

  const urgencyColors = {
    normal: 'from-blue-500 to-cyan-500 border-blue-300',
    warning: 'from-yellow-500 to-orange-500 border-yellow-300',
    critical: 'from-red-500 to-rose-500 border-red-300'
  }

  const urgencyBg = {
    normal: 'bg-blue-50',
    warning: 'bg-yellow-50',
    critical: 'bg-red-50'
  }

  const urgencyText = {
    normal: 'text-blue-900',
    warning: 'text-yellow-900',
    critical: 'text-red-900'
  }

  return (
    <div className={`p-6 rounded-xl border-2 ${isClosed ? urgencyColors.critical : urgencyColors[urgency]} ${urgencyBg[urgency]} shadow-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {isClosed ? '🔒' : urgency === 'critical' ? '⏰' : '📝'}
          </span>
          <div>
            <h3 className={`text-lg font-bold ${urgencyText[urgency]}`}>
              {isClosed ? 'Submissions Closed' : 'Submission Deadline'}
            </h3>
            {data.submission_end && !isClosed && (
              <p className={`text-sm ${urgencyText[urgency]} opacity-75`}>
                {new Date(data.submission_end).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Urgency Badge */}
        {isUrgent && !isClosed && (
          <span className={`px-3 py-1 rounded-full font-semibold text-white ${
            urgency === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
          }`}>
            {urgency === 'critical' ? '🚨 URGENT' : '⚠️ WARNING'}
          </span>
        )}
      </div>

      {/* Countdown Timer */}
      <div className={`text-5xl font-bold ${urgencyText[urgency]} text-center mb-6 tabular-nums font-mono tracking-tight`}>
        {timeDisplay}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className={`text-sm font-semibold ${urgencyText[urgency]}`}>
            Submissions Progress
          </span>
          <span className={`text-lg font-bold ${urgencyText[urgency]}`}>
            {data.submission_rate}%
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-3 border border-gray-300 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${
              urgency === 'critical'
                ? 'from-red-400 to-rose-500'
                : urgency === 'warning'
                ? 'from-yellow-400 to-orange-500'
                : 'from-blue-400 to-cyan-500'
            } transition-all duration-300`}
            style={{ width: `${data.submission_rate}%` }}
          ></div>
        </div>
        <p className={`text-xs mt-2 ${urgencyText[urgency]} opacity-75`}>
          {data.submitted_count} of {data.total_teams} teams submitted
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-800">{data.submitted_count}</p>
          <p className="text-xs text-gray-600">Submitted</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-800">{data.total_teams - data.submitted_count}</p>
          <p className="text-xs text-gray-600">Pending</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-800">{data.total_teams}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
      </div>

      {/* Status Messages */}
      {isClosed && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-red-800">
            ❌ The submission deadline has passed. No new submissions are accepted.
          </p>
        </div>
      )}

      {urgency === 'critical' && !isClosed && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center animate-pulse">
          <p className="text-sm font-semibold text-red-800">
            🚨 HURRY! Less than 1 hour remaining to submit your project!
          </p>
        </div>
      )}

      {urgency === 'warning' && !isClosed && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-yellow-800">
            ⏳ One hour left! Make sure your project is submitted before the deadline.
          </p>
        </div>
      )}

      {urgency === 'normal' && !isClosed && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-blue-800">
            📋 Plenty of time left. Remember to submit before the deadline!
          </p>
        </div>
      )}
    </div>
  )
}
