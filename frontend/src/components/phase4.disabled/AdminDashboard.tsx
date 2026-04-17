import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { 
  AlertCircle, 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings, 
  FileText, 
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * Phase 4: Admin Dashboard
 * Comprehensive platform management and monitoring
 */
export const AdminDashboard: React.FC = () => {
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/v4/dashboard/metrics')
      return response.json()
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const { data: history } = useQuery({
    queryKey: ['admin-metrics-history'],
    queryFn: async () => {
      const response = await fetch('/api/v4/dashboard/metrics/history?days=30')
      return response.json()
    }
  })

  const { data: notifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const response = await fetch('/api/v4/notifications?unread_only=true')
      return response.json()
    },
    refetchInterval: 30000
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await fetch('/api/v4/audit-log?limit=10')
      return response.json()
    }
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header with Critical Alerts */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Badge className="bg-red-100 text-red-800">
            {notifications?.filter((n: any) => n.priority === 'critical').length || 0} Critical Alerts
          </Badge>
        </div>
      </div>

      {/* Tabs for Different Sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Platform Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics?.system?.uptime_percentage || 100}%
                    </div>
                    <p className="text-xs text-gray-500">Uptime</p>
                  </div>
                  {(metrics?.system?.uptime_percentage || 100) >= 99.5 ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics?.system?.avg_response_time_ms || 0}ms
                    </div>
                    <p className="text-xs text-gray-500">P95</p>
                  </div>
                  {(metrics?.system?.avg_response_time_ms || 0) < 500 ? (
                    <TrendingDown className="w-8 h-8 text-green-500" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Error Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {metrics?.system?.error_rate_percentage || 0}%
                    </div>
                    <p className="text-xs text-gray-500">Last hour</p>
                  </div>
                  {(metrics?.system?.error_rate_percentage || 0) < 0.1 ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics?.users?.total || 0}
                    </div>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Judge Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Judge Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Judges</span>
                  <span className="font-bold">{metrics?.judges?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Judges</span>
                  <span className="font-bold text-green-600">{metrics?.judges?.active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Evaluations</span>
                  <span className="font-bold">{metrics?.judges?.evaluations || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Hackathon Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Events</span>
                  <span className="font-bold">{metrics?.hackathons?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Events</span>
                  <span className="font-bold text-blue-600">{metrics?.hackathons?.active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-bold text-green-600">
                    {((metrics?.hackathons?.active || 0) / Math.max(metrics?.hackathons?.total || 1, 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Fairness</span>
                  <span className="font-bold text-blue-600">{metrics?.quality?.average_judge_fairness || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Judge Completion</span>
                  <span className="font-bold">{metrics?.judges?.completion_rate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bias Detection Rate</span>
                  <span className="font-bold text-orange-600">{metrics?.quality?.bias_detection_rate || 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          {history && history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>System Performance (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="uptime" stroke="#10b981" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="error_rate" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== USERS TAB ==================== */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User & Role Management</CardTitle>
              <CardDescription>Manage admin users and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded p-4 space-y-3">
                <h3 className="font-semibold">Super Admin</h3>
                <p className="text-sm text-gray-600">Full platform access and control</p>
                <Button variant="outline">Promote User</Button>
              </div>
              <div className="border rounded p-4 space-y-3">
                <h3 className="font-semibold">Platform Admin</h3>
                <p className="text-sm text-gray-600">Event and user management</p>
                <Button variant="outline">Promote User</Button>
              </div>
              <div className="border rounded p-4 space-y-3">
                <h3 className="font-semibold">Compliance Officer</h3>
                <p className="text-sm text-gray-600">Audit and compliance reporting</p>
                <Button variant="outline">Promote User</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== EVENTS TAB ==================== */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Management</CardTitle>
              <CardDescription>Manage hackathon events and phases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Event management interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== AUDIT TAB ==================== */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Recent system and admin actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs?.logs?.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="border-l-4 border-l-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{log.action}</p>
                        <p className="text-sm text-gray-600">
                          {log.admin_name} • {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={log.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {log.severity}
                      </Badge>
                    </div>
                    {log.description && (
                      <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SETTINGS TAB ==================== */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="font-medium">Max Teams Per Hackathon</label>
                <input type="number" defaultValue="100" className="w-full border rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="font-medium">Judging Time Limit (minutes)</label>
                <input type="number" defaultValue="15" className="w-full border rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="font-medium">Minimum Judge Score Variance</label>
                <input type="number" defaultValue="0.2" step="0.1" className="w-full border rounded p-2" />
              </div>
              <Button className="w-full">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Critical Alerts Section */}
      {notifications && notifications.some((n: any) => n.priority === 'critical') && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications
              .filter((n: any) => n.priority === 'critical')
              .map((alert: any) => (
                <div key={alert.id} className="p-2 bg-white rounded border border-red-300">
                  <p className="font-medium text-red-900">{alert.title}</p>
                  <p className="text-sm text-red-700">{alert.message}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminDashboard
