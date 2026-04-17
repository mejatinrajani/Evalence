/**
 * Real-Time Leaderboard with Live Updates - Phase 2
 * Dynamic leaderboard with real-time score updates and ranking
 */

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, TrendingUp, Zap, Medal } from 'lucide-react'
import api from '@/lib/api'

interface LeaderboardEntry {
  rank: number
  team_id: number
  team_name: string
  avg_score: number
  total_score: number
  evaluations_received: number
  trend: 'up' | 'down' | 'stable'
  trend_amount: number
  last_updated: string
}

interface RealTimeLeaderboardProps {
  hackathonId: number
  roundId?: number
}

export function RealTimeLeaderboard({ hackathonId, roundId }: RealTimeLeaderboardProps) {
  const [animated, setAnimated] = useState<number[]>([])

  // Fetch leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', hackathonId, roundId],
    queryFn: () => {
      const url = roundId
        ? `/rounds/${roundId}/leaderboard`
        : `/hackathons/${hackathonId}/leaderboard`
      return api.get(url)
    },
    refetchInterval: 5000  // Update every 5 seconds
  })

  // Track entries that just updated
  useEffect(() => {
    if (leaderboardData?.entries) {
      const newAnimated = leaderboardData.entries
        .slice(0, 3)
        .map((e: any) => e.team_id)
      setAnimated(newAnimated)
      
      const timer = setTimeout(() => setAnimated([]), 1000)
      return () => clearTimeout(timer)
    }
  }, [leaderboardData])

  const entries: LeaderboardEntry[] = leaderboardData?.entries || []

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />
      default:
        return <span className="text-lg font-bold w-5 text-gray-500">{rank}</span>
    }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else if (trend === 'down') {
      return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
    }
    return <Zap className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Top 3 Podium */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Top Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length < 3 ? (
            <p className="text-gray-500 text-center py-8">Not enough teams evaluated yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {entries.slice(0, 3).map((entry, idx) => (
                <div
                  key={entry.team_id}
                  className={`p-4 rounded-lg border-2 transition ${
                    idx === 0
                      ? 'border-yellow-400 bg-yellow-50 scale-105'
                      : idx === 1
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-orange-400 bg-orange-50'
                  } ${animated.includes(entry.team_id) ? 'animate-pulse' : ''}`}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{entry.team_name}</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-1">
                      {entry.avg_score?.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {entry.evaluations_received} evaluations
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
          <CardDescription>Real-time leaderboard with live updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Team</th>
                  <th className="text-right p-3">Avg Score</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-center p-3">Evals</th>
                  <th className="text-center p-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.team_id}
                    className={`border-b transition ${
                      animated.includes(entry.team_id)
                        ? 'bg-yellow-100 animate-pulse'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-3 font-bold">
                      <div className="flex items-center gap-2">
                        {getMedalIcon(entry.rank)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-semibold">{entry.team_name}</p>
                        <p className="text-xs text-gray-500">Team {entry.team_id}</p>
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-lg">
                      {entry.avg_score?.toFixed(1)}
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      {entry.total_score?.toFixed(0)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">{entry.evaluations_received}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(entry.trend)}
                        <span
                          className={`text-xs font-semibold ${
                            entry.trend === 'up'
                              ? 'text-green-600'
                              : entry.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {entry.trend === 'stable' ? '-' : `${Math.abs(entry.trend_amount).toFixed(1)}`}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Teams</p>
            <p className="text-3xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Avg Score</p>
            <p className="text-3xl font-bold">
              {(entries.reduce((acc, e) => acc + e.avg_score, 0) / entries.length).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Evaluations</p>
            <p className="text-3xl font-bold">
              {entries.reduce((acc, e) => acc + e.evaluations_received, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      <p className="text-xs text-gray-500 text-center">
        Auto-updating every 5 seconds • Last update: {new Date().toLocaleTimeString()}
      </p>
    </div>
  )
}
