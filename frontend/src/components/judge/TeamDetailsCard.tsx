import { motion } from 'framer-motion'
import { Users, GitBranch, Globe } from 'lucide-react'

interface TeamDetailsCardProps {
  team_id: number
  team_name: string
  members: Array<{ name: string; email?: string; role?: string }>
  project_title?: string
  project_description?: string
  github_url?: string
  demo_url?: string
  tech_stack?: string[]
}

export function TeamDetailsCard({
  team_name,
  members,
  project_title,
  project_description,
  github_url,
  demo_url,
  tech_stack = []
}: TeamDetailsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <h2 className="text-xl font-bold text-white">{team_name}</h2>
        <p className="text-indigo-100 text-sm mt-1">Team Profile</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Project Info */}
        {(project_title || project_description) && (
          <div className="pb-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Project</h3>
            {project_title && (
              <p className="font-medium text-slate-800">{project_title}</p>
            )}
            {project_description && (
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                {project_description}
              </p>
            )}
          </div>
        )}

        {/* Tech Stack */}
        {tech_stack.length > 0 && (
          <div className="pb-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {tech_stack.map((tech, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200"
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {(github_url || demo_url) && (
          <div className="pb-4 border-b border-slate-200 flex gap-3">
            {github_url && (
              <a
                href={github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
              >
                <GitBranch size={16} />
                Repository
              </a>
            )}
            {demo_url && (
              <a
                href={demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
              >
                <Globe size={16} />
                Demo
              </a>
            )}
          </div>
        )}

        {/* Team Members */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-slate-600" />
            <h3 className="font-semibold text-slate-900">Team Members ({members.length})</h3>
          </div>
          <div className="space-y-2">
            {members.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start justify-between p-2 bg-slate-50 rounded border border-slate-100"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{member.name}</p>
                  {member.email && (
                    <p className="text-xs text-slate-500">{member.email}</p>
                  )}
                </div>
                {member.role && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                    {member.role}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
