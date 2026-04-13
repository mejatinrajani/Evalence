import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Eye, EyeOff, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CredentialCardProps {
  id: number
  username: string
  password?: string
  personName: string
  role: 'judge' | 'coordinator'
  createdAt?: string
  onDelete?: (id: number) => void
  showPassword?: boolean
}

export function CredentialCard({
  id,
  username,
  password,
  personName,
  role,
  createdAt,
  onDelete,
  showPassword: initialShowPassword = false,
}: CredentialCardProps) {
  const [showPassword, setShowPassword] = useState(initialShowPassword || !!password)
  const [copied, setCopied] = useState<'username' | 'password' | null>(null)

  const copyToClipboard = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    toast.success(`${type === 'username' ? 'Username' : 'Password'} copied!`)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100 hover:border-blue-300 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{personName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              role === 'judge'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {role === 'judge' ? '👨‍⚖️ Judge' : '👥 Coordinator'}
            </span>
            {password && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle2 size={12} /> New
              </span>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Credentials */}
      <div className="space-y-3">
        {/* Username */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Username</p>
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono text-gray-900 font-semibold">{username}</code>
            <button
              onClick={() => copyToClipboard(username, 'username')}
              className={`p-1.5 rounded transition-colors ${
                copied === 'username'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* Password */}
        {password && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Password (Save securely)</p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-900 font-semibold">
                {showPassword ? password : '••••••••••••'}
              </code>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(password, 'password')}
                  className={`p-1.5 rounded transition-colors ${
                    copied === 'password'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning */}
      {password && (
        <div className="mt-3 flex items-start gap-2 p-2 bg-orange-50 rounded border border-orange-100">
          <AlertCircle size={14} className="text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            Save these credentials securely. You won't see the password again.
          </p>
        </div>
      )}

      {/* Created At */}
      {createdAt && (
        <p className="text-xs text-gray-500 mt-3">
          Created: {new Date(createdAt).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  )
}
