/**
 * MultiRoundTournament Component - Phase 2
 * Manages multi-round tournament structure with bracket progression
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronRight, Trophy, Users, Clock, GitBranch, Zap } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

interface Round {
  id: number
  name: string
  order: number
  status: string
  bracket_type: string
  min_teams_advance: number
  max_teams_advance: number
  is_blind_evaluation: boolean
  evaluated_teams: number
  total_teams: number
  start_date: string
  end_date: string
}

interface Tournament {
  hackathonId: number
  rounds: Round[]
}

interface MultiRoundTournamentProps {
  hackathonId: number
  isOrganizer: boolean
}

export function MultiRoundTournament({ hackathonId, isOrganizer }: MultiRoundTournamentProps) {
  const queryClient = useQueryClient()
  const [selectedRound, setSelectedRound] = useState<Round | null>(null)

  // Fetch rounds
  const { data: rounds } = useQuery({
    queryKey: ['tournament-rounds', hackathonId],
    queryFn: () => api.get(`/hackathons/${hackathonId}/rounds`),
    refetchInterval: 30000
  })

  // Fetch bracket data
  const { data: bracketData } = useQuery({
    queryKey: ['bracket', selectedRound?.id],
    queryFn: () => selectedRound ? api.get(`/rounds/${selectedRound.id}/bracket`) : null,
    enabled: !!selectedRound,
    refetchInterval: 30000
  })

  // Advance teams mutation
  const advanceMutation = useMutation({
    mutationFn: (teams: number[]) =>
      api.post(`/rounds/${selectedRound?.id}/advance-teams`, { team_ids: teams }),
    onSuccess: () => {
      toast.success('Teams advanced to next round!')
      queryClient.invalidateQueries({ queryKey: ['bracket'] })
      queryClient.invalidateQueries({ queryKey: ['tournament-rounds'] })
    },
    onError: () => toast.error('Failed to advance teams')
  })

  // Update round status
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      api.put(`/rounds/${selectedRound?.id}/status`, { status }),
    onSuccess: () => {
      toast.success('Round status updated!')
      queryClient.invalidateQueries({ queryKey: ['tournament-rounds'] })
    }
  })

  const roundsList = rounds || []
  const activeRound = selectedRound || roundsList[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'evaluation': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Tournament Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Progression</CardTitle>
          <CardDescription>Multi-round bracket system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roundsList.map((round: Round, idx: number) => (
              <div key={round.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(round.status)}>
                      {round.status.toUpperCase()}
                    </Badge>
                    <span className="font-semibold">{round.name}</span>
                    <span className="text-sm text-gray-500">
                      Round {round.order}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {round.bracket_type} • {round.evaluated_teams}/{round.total_teams} evaluated
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">
                    <div className="text-gray-600">Advance</div>
                    <div className="font-semibold">{round.min_teams_advance}-{round.max_teams_advance}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRound(round)}
                    className={selectedRound?.id === round.id ? 'bg-blue-50' : ''}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Round Details */}
      {activeRound && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{activeRound.name}</CardTitle>
                <CardDescription>Bracket: {activeRound.bracket_type}</CardDescription>
              </div>
              {isOrganizer && (
                <Button
                  onClick={() => updateStatusMutation.mutate(activeRound.status === 'active' ? 'evaluation' : 'active')}
                  disabled={updateStatusMutation.isPending}
                >
                  {activeRound.status === 'active' ? 'Start Evaluation' : 'Revert to Active'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Evaluation Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Blind Evaluation</p>
                <Badge variant={activeRound.is_blind_evaluation ? 'default' : 'outline'}>
                  {activeRound.is_blind_evaluation ? '✓ Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Teams Advancing</p>
                <p className="font-semibold">{activeRound.min_teams_advance}-{activeRound.max_teams_advance}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Evaluation Progress</p>
                <p className="font-semibold">{activeRound.evaluated_teams}/{activeRound.total_teams}</p>
              </div>
            </div>

            {/* Bracket Visualization */}
            {bracketData && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-semibold mb-3">Bracket Structure</p>
                <div className="overflow-x-auto">
                  <div className="flex gap-8 min-w-max">
                    {bracketData.bracket_stages?.map((stage: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-600 text-center w-24">
                          {stage.name}
                        </p>
                        {stage.matchups?.map((matchup: any) => (
                          <div key={matchup.id} className="border bg-white rounded p-2 w-24">
                            <div className="text-xs font-semibold truncate">
                              {matchup.team1_name}
                            </div>
                            <div className="text-xs text-center text-gray-500 py-1">vs</div>
                            <div className="text-xs font-semibold truncate">
                              {matchup.team2_name}
                            </div>
                            <Badge className="mt-1 w-full justify-center text-xs">
                              {matchup.winner_name || 'Pending'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Team Advancement */}
            {isOrganizer && (
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <p className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Advance Teams to Next Round
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Select top {activeRound.max_teams_advance} teams to advance
                </p>
                <Button
                  disabled={advanceMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Select & Advance Teams
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Round Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Round Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Round</th>
                  <th className="p-2">Teams</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Progress</th>
                  <th className="p-2">Bracket</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {roundsList.map((round: Round) => (
                  <tr key={round.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-semibold">{round.name}</td>
                    <td className="p-2">{round.total_teams}</td>
                    <td className="p-2">
                      <Badge className={getStatusColor(round.status)}>
                        {round.status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(round.evaluated_teams / round.total_teams) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-2 text-xs text-gray-600">{round.bracket_type}</td>
                    <td className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRound(round)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
