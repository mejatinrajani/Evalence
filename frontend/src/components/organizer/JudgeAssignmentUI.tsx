import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function JudgeAssignmentUI({ hackathonId }: { hackathonId: number }) {
  const [strategy, setStrategy] = useState('balanced')
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6 p-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-bold text-lg mb-4">Judge Assignment</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { value: 'balanced', label: 'Balanced' },
            { value: 'skill', label: 'Skill-Based' }
          ].map((opt) => (
            <label key={opt.value} className="flex items-center space-x-2">
              <input
                type="radio"
                value={opt.value}
                checked={strategy === opt.value}
                onChange={(e) => setStrategy(e.target.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <Button className="w-full bg-blue-600 text-white">Assign Judges</Button>
      </div>
    </div>
  )
}