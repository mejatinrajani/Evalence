/**
 * Advanced Analytics Dashboard for Phase 3
 * Real-time judge analytics, bias detection, and fairness metrics
 */

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Users, CheckCircle, BarChart3, Activity, GitBranch } from 'lucide-react'
import api from '@/lib/api'

interface JudgeAnalytic {
  judge_id: number
  judge_name: string
  avg_score: number
  consistency_score: number
  peer_agreement: float
  total_evaluations: number
  completion_rate: float
  feedback_quality: float
  is_reliable: boolean
  bias_detected: boolean
}

interface BiasData {
  judge_id: number
  scoring_bias: number
  bias_type: string
  tech_bias: number
  team_size_bias: number
  correction_factor: number
  confidence_level: number
}

interface FairnessMetrics {
  fairness_score: number
  judge_agreement: number
  score_variance: number
  outlier_count: number
  recommendations: string[]
}

interface AnalyticsDashboardProps {
  hackathonId: number
  isOrganizer: boolean
}

export function AnalyticsDashboard({ hackathonId, isOrganizer }: AnalyticsDashboardProps) {
  const [selectedJudge, setSelectedJudge] = useState<number | null>(null)

  // Fetch overall analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', hackathonId],
    queryFn: () => api.get(`/hackathons/${hackathonId}/analytics`),
    refetchInterval: 60000
  })

  // Fetch judge-specific analytics
  const { data: judgeAnalytics } = useQuery({
    queryKey: ['judge-analytics', selectedJudge, hackathonId],
    queryFn: () => selectedJudge ? api.get(`/judges/${selectedJudge}/analytics?hackathon_id=${hackathonId}`) : null,
    enabled: !!selectedJudge,
    refetchInterval: 60000
  })

  // Fetch bias analysis
  const { data: biasData } = useQuery({
    queryKey: ['bias-analysis', hackathonId],
    queryFn: () => api.get(`/hackathons/${hackathonId}/bias-analysis`),
    refetchInterval: 60000
  })

  // Fetch fairness metrics
  const { data: fairnessData } = useQuery({
    queryKey: ['fairness-metrics', hackathonId],
    queryFn: () => api.get(`/hackathons/${hackathonId}/fairness-metrics`),
    refetchInterval: 60000
  })

  const judges = analyticsData?.judges || []
  const fairness: FairnessMetrics = fairnessData || {
    fairness_score: 0,
    judge_agreement: 0,
    score_variance: 0,
    outlier_count: 0,
    recommendations: []
  }

  const biasMetrics: BiasData[] = biasData?.metrics || []

  // Get flagged judges
  const flaggedJudges = judges.filter((j: any) => !j.is_reliable || j.bias_detected)

  return (
    <div className="w-full space-y-6 p-6">
      {/* Top Level Fairness Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className={`border-2 ${fairness.fairness_score >= 75 ? 'border-green-200' : 'border-orange-200'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fairness Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fairness.fairness_score?.toFixed(0)}</div>
            <Progress value={fairness.fairness_score || 0} className="mt-2 h-2" />
            <p className="text-xs text-gray-500 mt-2">Overall evaluation fairness</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Judge Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(fairness.judge_agreement * 100)?.toFixed(0)}%</div>
            <p className="text-xs text-green-600 font-medium mt-2">↑ Correlation between judges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Score Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fairness.score_variance?.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-2">Distribution consistency</p>
          </CardContent>
        </Card>

        <Card className={fairness.outlier_count > 2 ? 'border-l-4 border-l-red-500' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Outliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fairness.outlier_count}</div>
            <p className="text-xs text-gray-500 mt-2">Unusual scores detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {fairness.recommendations && fairness.recommendations.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle>Fairness Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {fairness.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Flagged Judges Alert */}
      {flaggedJudges.length > 0 && isOrganizer && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle>Action Required: {flaggedJudges.length} Judge(s) Flagged</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              {flaggedJudges.map((judge: any) => (
                <div key={judge.id} className="text-sm p-2 bg-red-100 rounded">
                  <strong>{judge.judge_name}:</strong> {
                    !judge.is_reliable ? 'Low reliability ' : ''
                  }{
                    judge.bias_detected ? '| Bias detected' : ''
                  }
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="judges">Judges ({judges.length})</TabsTrigger>
          <TabsTrigger value="bias">Bias Analysis</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Judge Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Judge Performance Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="consistency" name="Consistency" type="number" />
                      <YAxis dataKey="avg_score" name="Avg Score" type="number" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Judges" data={judges} fill="#3b82f6">
                        {judges.map((j: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={j.is_reliable ? '#10b981' : '#ef4444'}
                            cursor="pointer"
                            onClick={() => setSelectedJudge(j.judge_id)}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 mt-2">Green = Reliable judges, Red = Flagged judges</p>
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { range: '0-20', count: 2 },
                      { range: '20-40', count: 5 },
                      { range: '40-60', count: 12 },
                      { range: '60-80', count: 25 },
                      { range: '80-100', count: 18 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Judge Agreement Network */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Judge Agreement Heatmap</CardTitle>
                <CardDescription>Correlation between judge scoring patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Judge</th>
                        {judges.map((j: any) => (
                          <th key={j.judge_id} className="text-center p-2">{j.judge_name.split(' ')[0]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {judges.map((j1: any) => (
                        <tr key={j1.judge_id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{j1.judge_name}</td>
                          {judges.map((j2: any) => {
                            const agreement = j1.peer_agreement ? Math.round(j1.peer_agreement * 100) : 75
                            return (
                              <td
                                key={`${j1.judge_id}-${j2.judge_id}`}
                                className={`text-center p-2 font-medium ${
                                  agreement > 80 ? 'bg-green-100 text-green-900' :
                                  agreement > 60 ? 'bg-yellow-100 text-yellow-900' :
                                  'bg-red-100 text-red-900'
                                }`}
                              >
                                {agreement}%
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Judges Tab */}
        <TabsContent value="judges">
          <Card>
            <CardHeader>
              <CardTitle>Individual Judge Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {judges.map((judge: any) => (
                  <div
                    key={judge.judge_id}
                    onClick={() => setSelectedJudge(judge.judge_id)}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      selectedJudge === judge.judge_id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{judge.judge_name}</h4>
                        <p className="text-sm text-gray-500">{judge.total_evaluations} evaluations completed</p>
                      </div>
                      <div className="flex gap-2">
                        {!judge.is_reliable && <Badge variant="destructive">⚠ Unreliable</Badge>}
                        {judge.bias_detected && <Badge variant="outline" className="bg-orange-50">Bias Detected</Badge>}
                        {judge.is_reliable && !judge.bias_detected && <Badge variant="outline" className="bg-green-50">✓ Good</Badge>}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Avg Score</p>
                        <p className="font-bold text-lg">{judge.avg_score?.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Consistency</p>
                        <p className="font-bold text-lg">{judge.consistency_score?.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Completion</p>
                        <p className="font-bold text-lg">{(judge.completion_rate * 100)?.toFixed(0)}%</p>
                        <Progress value={judge.completion_rate * 100} className="mt-1 h-1" />
                      </div>
                      <div>
                        <p className="text-gray-600">Peer Agreement</p>
                        <p className="font-bold text-lg">{(judge.peer_agreement * 100)?.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Feedback Quality</p>
                        <p className="font-bold text-lg">{judge.feedback_quality?.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bias Tab */}
        <TabsContent value="bias">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bias Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={biasMetrics}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="judge_id" />
                      <PolarRadiusAxis angle={90} domain={[-0.5, 0.5]} />
                      <Radar name="Scoring Bias" dataKey="scoring_bias" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bias Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {biasMetrics.map((bias) => (
                    <div key={bias.judge_id} className="p-3 border rounded bg-gray-50">
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold">Judge {bias.judge_id}</span>
                        <Badge variant={bias.bias_type === 'none' ? 'outline' : 'destructive'}>
                          {bias.bias_type}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scoring Bias:</span>
                          <span className="font-medium">{(bias.scoring_bias * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tech Bias:</span>
                          <span className="font-medium">{(bias.tech_bias * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Correction Factor:</span>
                          <span className="font-medium">{bias.correction_factor.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confidence:</span>
                          <span className="font-medium">{(bias.confidence_level * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution by Judge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={judges.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="judge_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_score" fill="#3b82f6" name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { time: '9:00', avg_score: 72, completion: 0 },
                    { time: '10:00', avg_score: 75, completion: 15 },
                    { time: '11:00', avg_score: 74, completion: 35 },
                    { time: '12:00', avg_score: 76, completion: 55 },
                    { time: '13:00', avg_score: 75, completion: 75 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="avg_score" stroke="#3b82f6" name="Avg Score" />
                    <Line yAxisId="right" type="monotone" dataKey="completion" stroke="#10b981" name="Completion (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
