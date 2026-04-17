import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Shield, FileText, Download, CheckCircle, Clock, XCircle } from 'lucide-react'

/**
 * Compliance & Audit Components for Phase 4
 */

/**
 * Audit Log Viewer - Track all system changes
 */
export const AuditLogViewer: React.FC<{ 
  days?: number 
}> = ({ days = 30 }) => {
  const [filters, setFilters] = useState({
    entityType: '',
    severity: '',
    searchTerm: ''
  })

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.entityType) params.append('entity_type', filters.entityType)
      if (filters.severity) params.append('severity', filters.severity)
      const response = await fetch(`/api/v4/audit-log?limit=100&${params}`)
      return response.json()
    }
  })

  const severityColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Track all system changes and admin actions (last {days} days)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input
            type="text"
            placeholder="Search..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="border rounded p-2 text-sm"
          />
          <select
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            className="border rounded p-2 text-sm"
          >
            <option value="">All Entity Types</option>
            <option value="user">User</option>
            <option value="hackathon">Hackathon</option>
            <option value="judge_assignment">Judge Assignment</option>
            <option value="setting">Setting</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="border rounded p-2 text-sm"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading logs...</div>
          ) : logs?.logs?.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No logs found</div>
          ) : (
            logs?.logs?.map((log: any) => (
              <div
                key={log.id}
                className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">{log.action}</p>
                    <p className="text-xs text-gray-600">
                      {log.admin_name} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={severityColors[log.severity] || 'bg-gray-100'}>
                    {log.severity}
                  </Badge>
                </div>
                {log.description && (
                  <p className="text-xs text-gray-700 mb-1">{log.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  Entity: {log.entity_type} #{log.entity_id}
                  {log.ip_address && ` | IP: ${log.ip_address}`}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <span>Total: {logs?.total || 0} entries</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compliance Report Dashboard
 */
export const ComplianceDashboard: React.FC = () => {
  const [reportType, setReportType] = useState<string | null>(null)

  const { data: reports } = useQuery({
    queryKey: ['compliance-reports'],
    queryFn: async () => {
      const response = await fetch('/api/v4/compliance-reports')
      return response.json()
    }
  })

  const reportTypeColors: Record<string, string> = {
    gdpr: 'bg-purple-100 text-purple-800',
    data_retention: 'bg-blue-100 text-blue-800',
    judge_fairness: 'bg-green-100 text-green-800',
    bias_analysis: 'bg-orange-100 text-orange-800',
    security_audit: 'bg-red-100 text-red-800'
  }

  const statusIcons: Record<string, any> = {
    draft: <Clock className="w-4 h-4" />,
    review: <AlertCircle className="w-4 h-4" />,
    approved: <CheckCircle className="w-4 h-4" />,
    archived: <XCircle className="w-4 h-4" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Compliance Reports
        </CardTitle>
        <CardDescription>
          Reviews and audit findings for governance and compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
          </TabsList>

          {['all', 'draft', 'review', 'approved', 'critical'].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {reports
                ?.filter((r: any) => {
                  if (tab === 'all') return true
                  if (tab === 'critical') return r.severity === 'critical'
                  return r.status === tab
                })
                .map((report: any) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-4 bg-white hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                        <p className="text-xs text-gray-600">{report.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={reportTypeColors[report.type] || 'bg-gray-100'}>
                          {report.type}
                        </Badge>
                        <Badge
                          variant={
                            report.severity === 'critical'
                              ? 'destructive'
                              : report.severity === 'warning'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {report.severity}
                        </Badge>
                        <Badge
                          className={
                            report.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : report.status === 'review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {report.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{report.title}</p>

                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>
                        Generated: {new Date(report.generated_at).toLocaleDateString()}
                        {report.reviewed_at &&
                          ` • Reviewed: ${new Date(report.reviewed_at).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      {report.status === 'review' && (
                        <Button size="sm" className="text-xs">
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

              {reports?.filter((r: any) => {
                if (tab === 'all') return true
                if (tab === 'critical') return r.severity === 'critical'
                return r.status === tab
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No {tab !== 'all' ? tab + ' ' : ''}reports yet</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

/**
 * User Management Panel
 */
export const UserManagementPanel: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const promoteUser = useMutation({
    mutationFn: async (data: { userId: number; role: string; permissions: string[] }) => {
      const response = await fetch('/api/v4/admin/user/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.userId,
          role: data.role,
          permissions: data.permissions
        })
      })
      return response.json()
    }
  })

  const roles = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full platform access and control',
      permissions: [
        'user_management',
        'event_management',
        'judge_management',
        'analytics',
        'compliance',
        'settings',
        'reporting',
        'audit_log'
      ]
    },
    {
      id: 'platform_admin',
      name: 'Platform Admin',
      description: 'Event and user management',
      permissions: ['event_management', 'judge_management', 'analytics', 'reporting']
    },
    {
      id: 'compliance_officer',
      name: 'Compliance Officer',
      description: 'Audit and compliance reporting',
      permissions: ['compliance', 'audit_log', 'analytics', 'reporting']
    },
    {
      id: 'support_admin',
      name: 'Support Admin',
      description: 'User and event support',
      permissions: ['user_management', 'event_management']
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          User & Role Management
        </CardTitle>
        <CardDescription>Manage admin users and their permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition"
              onClick={() => setSelectedRole(role.id)}
            >
              <h3 className="font-semibold text-sm mb-1">{role.name}</h3>
              <p className="text-xs text-gray-600 mb-3">{role.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {role.permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-xs">
                    {perm.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs">
                Promote User to {role.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Current Admins List */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="font-semibold mb-3">Current Administrators</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>John Admin (Super Admin)</span>
              <Badge>super_admin</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>Sarah Manager (Platform Admin)</span>
              <Badge>platform_admin</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>Compliance Officer (Compliance Officer)</span>
              <Badge>compliance_officer</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
