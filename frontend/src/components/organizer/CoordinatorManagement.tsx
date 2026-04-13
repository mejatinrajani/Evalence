import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CredentialCard } from '../credentials/CredentialCard'
import { api } from '../../lib/api'
import { toast } from 'sonner'

interface Coordinator {
  id: number
  username: string
  person_name: string
  role: string
  created_at: string
}

interface CoordinatorManagementProps {
  hackathonId: number
  coordinators: Coordinator[]
  onRefresh: () => void
}

export function CoordinatorManagement({ hackathonId, coordinators, onRefresh }: CoordinatorManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ person_name: '' })
  const [loading, setLoading] = useState(false)
  const [newCredential, setNewCredential] = useState<any>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.person_name.trim()) {
      toast.error('Please enter coordinator name')
      return
    }

    setLoading(true)
    try {
      const response = await api.post(`/me/hackathons/${hackathonId}/coordinators`, {
        person_name: formData.person_name,
        role: 'coordinator',
      })
      setNewCredential(response)
      setFormData({ person_name: '' })
      setShowForm(false)
      onRefresh()
      toast.success('Coordinator credential created!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create coordinator')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this coordinator credential?')) return

    setDeleting(id)
    try {
      await api.delete(`/me/hackathons/${hackathonId}/coordinators/${id}`)
      toast.success('Coordinator deleted')
      onRefresh()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete coordinator')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Student Coordinators</h3>
          <p className="text-sm text-gray-600">Manage student coordinator credentials for this hackathon</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={18} />
          Add Coordinator
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coordinator Name
                </label>
                <Input
                  placeholder="Enter coordinator full name"
                  value={formData.person_name}
                  onChange={(e) => setFormData({ person_name: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Credential
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Credential Display */}
      {newCredential && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={20} className="text-green-600" />
            <h4 className="font-semibold text-green-900">New Coordinator Credential Created!</h4>
          </div>
          <CredentialCard
            id={newCredential.id}
            username={newCredential.username}
            password={newCredential.password}
            personName={newCredential.person_name}
            role={newCredential.role}
            showPassword={true}
          />
        </motion.div>
      )}

      {/* Coordinators List */}
      <div className="space-y-3">
        {coordinators.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No coordinators added yet. Create credentials to get started.</p>
          </div>
        ) : (
          coordinators.map((coordinator) => (
            <CredentialCard
              key={coordinator.id}
              id={coordinator.id}
              username={coordinator.username}
              personName={coordinator.person_name}
              role="coordinator"
              createdAt={coordinator.created_at}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
