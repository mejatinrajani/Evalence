/**
 * Bias Detection & Correction Dashboard
 * Real-time bias monitoring, detection, and correction recommendations
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Gauge, AlertTriangle, TrendingDown, TrendingUp, Zap, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

interface JudgeBias {
  judge_id: number
  judge_name: string
  scoring_bias: number
  bias_type: string
  confidence_level: number
  tech_bias: number
  team_size_bias: number
  region_bias: number
  correction_factor: number
  should_recalibrate: boolean
}

interface CorrectionAction {
  id: number
  judge_id: number
  action: string
  status: string
  applied_at?: string
}

interface BiasDetectionDashboardProps {
  hackathonId: number
}

export function BiasDetectionDashboard({ hackathonId }: BiasDetectionDashboardProps) {
  const queryClient = useQueryClient()
  const [selectedJudge, setSelectedJudge] = useState<JudgeBias | null>(null)
  const [showRecalibrationModal, setShowRecalibrationModal] = useState(false)

  // Fetch bias analysis
  const { data: biasData } = useQuery({
    queryKey: ['bias-detection', hackathonId],
    queryFn: () => api.get(`/hackathons/${hackathonId}/bias-analysis`),
    refetchInterval: 60000
  })

  // Apply correction
  const correctMutation = useMutation({
    mutationFn: ({ judgeId, action }: any) =>
      api.post(`/judges/${judgeId}/apply-correction`, { action }),
    onSuccess: () => {
      toast.success('Correction applied!')
      queryClient.invalidateQueries({ queryKey: ['bias-detection'] })
    }
  })

  // Recalibrate judge
  const recalibrateMutation = useMutation({
    mutationFn: (judgeId: number) =>
      api.post(`/judges/${judgeId}/recalibrate`, {}),
    onSuccess: () => {
      toast.success('Recalibration started!')
      setShowRecalibrationModal(false)
      queryClient.invalidateQueries({ queryKey: ['bias-detection'] })
    }
  })

  const biases: JudgeBias[] = biasData?.metrics || []
  const flaggedJudges = biases.filter(j => j.should_recalibrate || Math.abs(j.scoring_bias) > 0.15)

  const getBiasColor = (bias: number) => {
    const abs = Math.abs(bias)
    if (abs > 0.25) return 'text-red-600'
    if (abs > 0.15) return 'text-orange-600'
    if (abs > 0.05) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getBiasBgColor = (bias: number) => {
    const abs = Math.abs(bias)
    if (abs > 0.25) return 'bg-red-50 border-red-200'
    if (abs > 0.15) return 'bg-orange-50 border-orange-200'
    if (abs > 0.05) return 'bg-yellow-50 border-yellow-200'
    return 'bg-green-50 border-green-200'
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Critical Alerts */}
      {flaggedJudges.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle>Bias Detected in {flaggedJudges.length} Judge(s)</AlertTitle>
          <AlertDescription>
            Immediate action recommended to ensure fair evaluation. These judges show significant deviation or systemic bias patterns.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Bias Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Gauge className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Judges</p>
              <p className="text-2xl font-bold">{biases.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total analyzed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {biases.filter(j => Math.abs(j.scoring_bias) > 0.25).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">High deviation</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Lenient</p>
              <p className="text-2xl font-bold text-orange-600">
                {biases.filter(j => j.scoring_bias > 0.15).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Over-scoring</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingDown className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Harsh</p>
              <p className="text-2xl font-bold text-blue-600">
                {biases.filter(j => j.scoring_bias < -0.15).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Under-scoring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Bias Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Judge Bias Analysis</CardTitle>
          <CardDescription>Detailed scoring patterns and detected biases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {biases.map((judge) => (
              <div
                key={judge.judge_id}
                onClick={() => setSelectedJudge(judge)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedJudge?.judge_id === judge.judge_id
                    ? 'bg-blue-50 border-blue-300'
                    : `border-gray-200 hover:bg-gray-50`
                } ${flaggedJudges.some(j => j.judge_id === judge.judge_id) ? getBiasBgColor(judge.scoring_bias) : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{judge.judge_name}</h4>
                    <p className="text-sm text-gray-600">Judge ID: {judge.judge_id}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getBiasColor(judge.scoring_bias)} bg-white border-2`}>
                      {judge.bias_type.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence: {(judge.confidence_level * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 text-center text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Scoring Bias</p>
                    <p className={`font-bold text-lg ${getBiasColor(judge.scoring_bias)}`}>
                      {(judge.scoring_bias * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Tech Bias</p>
                    <p className={`font-bold ${getBiasColor(judge.tech_bias)}`}>
                      {(judge.tech_bias * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Size Bias</p>
                    <p className={`font-bold ${getBiasColor(judge.team_size_bias)}`}>
                      {(judge.team_size_bias * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Region Bias</p>
                    <p className={`font-bold ${getBiasColor(judge.region_bias)}`}>
                      {(judge.region_bias * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Correction</p>
                    <p className="font-bold">{judge.correction_factor.toFixed(2)}x</p>
                  </div>
                  <div>
                    {judge.should_recalibrate && (
                      <Badge variant="destructive">⚠ Recalibrate</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed View of Selected Judge */}
      {selectedJudge && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle>{selectedJudge.judge_name} - Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bias Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded border">
                <p className="text-sm font-semibold mb-2">Scoring Pattern</p>
                {selectedJudge.scoring_bias > 0 ? (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <span>Lenient grader (+{(selectedJudge.scoring_bias * 100).toFixed(1)}%)</span>
                  </div>
                ) : selectedJudge.scoring_bias < 0 ? (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-blue-500" />
                    <span>Harsh grader ({(selectedJudge.scoring_bias * 100).toFixed(1)}%)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    <span>Fair grader</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded border">
                <p className="text-sm font-semibold mb-2">Detection Confidence</p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${selectedJudge.confidence_level * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(selectedJudge.confidence_level * 100).toFixed(0)}% confidence
                </p>
              </div>
            </div>

            {/* Specific Bias Breakdown */}
            <div className="p-3 bg-white rounded border space-y-2">
              <p className="text-sm font-semibold">Specific Biases Detected</p>
              {Math.abs(selectedJudge.tech_bias) > 0.1 && (
                <div className="text-sm">
                  <span className="font-medium">Tech Bias:</span> Favors certain tech stacks
                  ({(selectedJudge.tech_bias * 100).toFixed(1)}%)
                </div>
              )}
              {Math.abs(selectedJudge.team_size_bias) > 0.1 && (
                <div className="text-sm">
                  <span className="font-medium">Size Bias:</span> Biased by team size
                  ({(selectedJudge.team_size_bias * 100).toFixed(1)}%)
                </div>
              )}
              {Math.abs(selectedJudge.region_bias) > 0.1 && (
                <div className="text-sm">
                  <span className="font-medium">Region Bias:</span> Biased by geography
                  ({(selectedJudge.region_bias * 100).toFixed(1)}%)
                </div>
              )}
            </div>

            {/* Recommendations */}
            <Alert className={selectedJudge.should_recalibrate ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
              <AlertTitle className={selectedJudge.should_recalibrate ? 'text-orange-900' : 'text-green-900'}>
                {selectedJudge.should_recalibrate ? 'Recalibration Recommended' : 'Monitoring Status'}
              </AlertTitle>
              <AlertDescription>
                {selectedJudge.should_recalibrate
                  ? 'This judge shows significant bias patterns. We recommend a recalibration session to align scoring with peer standards.'
                  : 'This judge is scoring within acceptable ranges. Continue monitoring.'}
              </AlertDescription>
            </Alert>

            {/* Actions */}
            {selectedJudge.should_recalibrate && (
              <div className="flex gap-2">
                <Button
                  onClick={() => recalibrateMutation.mutate(selectedJudge.judge_id)}
                  disabled={recalibrateMutation.isPending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Start Recalibration
                </Button>
                <Button
                  onClick={() => correctMutation.mutate({
                    judgeId: selectedJudge.judge_id,
                    action: 'apply_correction_factor'
                  })}
                  disabled={correctMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  Apply Correction Factor ({selectedJudge.correction_factor.toFixed(2)}x)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Correction History */}
      <Card>
        <CardHeader>
          <CardTitle>Correction Actions Applied</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">No corrections applied yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
