/**
 * Phase 1: Leaderboard View
 * 
 * Displays:
 * - Ranked teams with scores
 * - Statistical information (Z-scores, std dev)
 * - Anomaly flags
 * - Medal badges for top 3
 * - Detailed breakdown per team
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface LeaderboardEntry {
  rank: number
  team_id: number
  team_name: string
  score: number
  z_score: number
  evaluations: number
  anomaly_flagged: boolean
  anomaly_reason?: string
}

interface LeaderboardResponse {
  hackathon_id: number
  hackathon_name: string
  total_entries: number
  leaderboard: LeaderboardEntry[]
}

interface LeaderboardViewProps {
  hackathonId: number
  showAnomalies?: boolean
}

export function LeaderboardView({ hackathonId, showAnomalies = false }: LeaderboardViewProps) {
  const { data, isLoading, error, refetch } = useQuery(
    ['leaderboard', hackathonId],
    () => api.get(`/hackathons/${hackathonId}/leaderboard?include_anomalies=${showAnomalies}`) as Promise<LeaderboardResponse>,
    {
      enabled: !!hackathonId,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  )

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-semibold">⚠️ Leaderboard not available yet</p>
        <p className="text-red-700 text-sm mt-2">Results are being calculated...</p>
      </div>
    )
  }

  if (!data) return null

  const topThree = data.leaderboard.slice(0, 3)
  const medalEmoji: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  // Prepare chart data
  const chartData = data.leaderboard.slice(0, 10).map(entry => ({
    name: entry.team_name.substring(0, 15),
    score: entry.score,
    rank: entry.rank
  }))

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🏆 Final Rankings</h1>
        <p className="text-gray-600">{data.hackathon_name} - {data.total_entries} teams evaluated</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {topThree.length > 0 && (
          <>
            {/* 2nd Place - Left */}
            {topThree[1] && (
              <div className="md:order-1">
                <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg p-6 text-center transform md:translate-y-12 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-5xl mb-2">🥈</p>
                    <p className="text-2xl font-bold text-gray-800">{topThree[1].team_name}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-gray-700">{topThree[1].score}</p>
                    <p className="text-xs text-gray-600 mt-1">{topThree[1].evaluations} judges</p>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place - Center */}
            {topThree[0] && (
              <div className="md:order-2">
                <div className="bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 rounded-lg p-6 text-center shadow-xl transform h-full flex flex-col justify-between border-2 border-amber-500">
                  <div>
                    <p className="text-6xl mb-3">🥇</p>
                    <p className="text-3xl font-bold text-gray-900">{topThree[0].team_name}</p>
                  </div>
                  <div className="mt-6">
                    <p className="text-4xl font-bold text-gray-900">{topThree[0].score}</p>
                    <p className="text-sm text-gray-700 font-semibold mt-2">{topThree[0].evaluations} judges</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place - Right */}
            {topThree[2] && (
              <div className="md:order-3">
                <div className="bg-gradient-to-br from-orange-200 to-orange-300 rounded-lg p-6 text-center transform md:translate-y-12 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-5xl mb-2">🥉</p>
                    <p className="text-2xl font-bold text-gray-800">{topThree[2].team_name}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-gray-700">{topThree[2].score}</p>
                    <p className="text-xs text-gray-600 mt-1">{topThree[2].evaluations} judges</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Score Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Top 10 Teams</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => value.toFixed(2)}
                labelFormatter={(label) => `Rank #${label}`}
              />
              <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">📋 Complete Rankings</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Team</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Score</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Z-Score</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Judges</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.leaderboard.map((entry, idx) => (
                <tr key={entry.team_id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                  {/* Rank with Medal */}
                  <td className="px-6 py-4 text-center font-bold">
                    <span className="text-2xl">
                      {entry.rank <= 3 ? medalEmoji[entry.rank] : `#${entry.rank}`}
                    </span>
                  </td>

                  {/* Team Name */}
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {entry.team_name}
                  </td>

                  {/* Score */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {entry.score.toFixed(2)}
                    </span>
                  </td>

                  {/* Z-Score (statistical normalization) */}
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full font-mono text-sm ${
                      entry.z_score > 1.5 ? 'bg-green-100 text-green-800' :
                      entry.z_score < -1.5 ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.z_score.toFixed(2)}
                    </span>
                  </td>

                  {/* Number of Judges */}
                  <td className="px-6 py-4 text-center text-gray-600">
                    {entry.evaluations} ⭐
                  </td>

                  {/* Anomaly Flag */}
                  <td className="px-6 py-4">
                    {entry.anomaly_flagged ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        ⚠️ Anomaly
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        ✓ Valid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-gray-600 text-sm">Total Teams</p>
          <p className="text-3xl font-bold text-blue-600">{data.total_entries}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <p className="text-gray-600 text-sm">Winner</p>
          <p className="text-2xl font-bold text-green-600">{topThree[0]?.team_name || 'N/A'}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <p className="text-gray-600 text-sm">Highest Score</p>
          <p className="text-3xl font-bold text-purple-600">{topThree[0]?.score.toFixed(2) || 'N/A'}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <p className="text-gray-600 text-sm">Avg Score</p>
          <p className="text-3xl font-bold text-orange-600">
            {(data.leaderboard.reduce((sum, e) => sum + e.score, 0) / data.total_entries).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => refetch()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          🔄 Refresh Results
        </button>
      </div>
    </div>
  )
}
