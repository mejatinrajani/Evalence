import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from 'recharts'
import { Star, MessageSquare, ThumbsUp, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

/**
 * Phase 3: Judge Feedback Component
 * Judges provide detailed feedback on teams
 */
export const JudgeFeedbackForm: React.FC<{ 
  hackathonId: number
  teamId: number
  onSubmit?: () => void 
}> = ({ hackathonId, teamId, onSubmit }) => {
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackType, setFeedbackType] = useState('neutral')
  const [ratings, setRatings] = useState({
    innovation: 7,
    execution: 7,
    presentation: 7,
    marketPotential: 7
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const createFeedback = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v3/feedback/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          team_id: teamId,
          feedback_text: feedbackText,
          feedback_type: feedbackType,
          innovation_rating: ratings.innovation,
          execution_rating: ratings.execution,
          presentation_rating: ratings.presentation,
          market_potential_rating: ratings.marketPotential,
          tags: tags
        })
      })
      return response.json()
    },
    onSuccess: () => {
      setFeedbackText('')
      setTags([])
      onSubmit?.()
    }
  })

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Provide Feedback</CardTitle>
        <CardDescription>Share detailed feedback with this team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feedback Type Selection */}
        <div className="grid grid-cols-2 gap-2">
          {['positive', 'constructive', 'critical', 'neutral'].map((type) => (
            <button
              key={type}
              onClick={() => setFeedbackType(type)}
              className={`p-3 rounded text-center capitalize transition ${
                feedbackType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Ratings */}
        <div className="space-y-4">
          {Object.entries(ratings).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium capitalize">{key}</label>
                <span className="text-lg font-bold text-blue-600">{value}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={value}
                onChange={(e) => setRatings({ ...ratings, [key]: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* Feedback Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Feedback Details</label>
          <Textarea
            placeholder="Provide detailed, constructive feedback..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[150px]"
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag and press button"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="cursor-pointer">
                {tag}
                <button
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="ml-1"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={() => createFeedback.mutate()}
          disabled={!feedbackText || createFeedback.isPending}
          className="w-full"
        >
          {createFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Team Feedback View - See detailed feedback from judges
 */
export const TeamFeedbackView: React.FC<{
  hackathonId: number
  teamId: number
}> = ({ hackathonId, teamId }) => {
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['team-feedback', teamId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v3/feedback/team/${teamId}?hackathon_id=${hackathonId}`
      )
      return response.json()
    }
  })

  const { data: responseRate } = useQuery({
    queryKey: ['feedback-response-rate', hackathonId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v3/feedback/response-rate?hackathon_id=${hackathonId}`
      )
      return response.json()
    }
  })

  if (isLoading) return <div>Loading feedback...</div>

  return (
    <div className="space-y-4">
      {/* Response Statistics */}
      {responseRate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Feedback Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {responseRate.total_feedback}
                </div>
                <p className="text-sm text-gray-600">Total Feedback</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(responseRate.response_rate || 0).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">Response Rate</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {responseRate.pending}
                </div>
                <p className="text-sm text-gray-600">Pending Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Feedback Cards */}
      {feedbacks.map((feedback: any) => (
        <Card key={feedback.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{feedback.judge_name}</CardTitle>
                <CardDescription>
                  {new Date(feedback.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge
                className={
                  feedback.feedback_type === 'positive'
                    ? 'bg-green-100 text-green-800'
                    : feedback.feedback_type === 'constructive'
                    ? 'bg-blue-100 text-blue-800'
                    : feedback.feedback_type === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {feedback.feedback_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ratings Summary */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(feedback.ratings).map(([key, value]: [string, any]) => (
                value && (
                  <div key={key} className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600 capitalize">{key}</p>
                    <p className="text-lg font-bold text-blue-600">{value.toFixed(1)}</p>
                  </div>
                )
              ))}
            </div>

            {/* Feedback Text */}
            <p className="text-base text-gray-800">{feedback.text}</p>

            {/* Tags */}
            {feedback.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {feedback.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Team Response */}
            {feedback.team_response && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm font-medium text-green-900">Team Response:</p>
                <p className="text-sm text-green-800 mt-1">{feedback.team_response}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {feedbacks.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No public feedback yet
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Judge Quality Rating - Teams rate judges
 */
export const JudgeQualityRating: React.FC<{
  hackathonId: number
  judgeId: number
}> = ({ hackathonId, judgeId }) => {
  const [ratings, setRatings] = useState({
    fairness: 5,
    clarity: 5,
    helpfulness: 5,
    professionalism: 5
  })
  const [comments, setComments] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState(true)

  const submitRating = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v3/judge-rating/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          judge_id: judgeId,
          fairness: ratings.fairness,
          clarity: ratings.clarity,
          helpfulness: ratings.helpfulness,
          professionalism: ratings.professionalism,
          comments: comments || undefined,
          would_recommend: wouldRecommend
        })
      })
      return response.json()
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Judge</CardTitle>
        <CardDescription>Help us improve the judging experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(ratings).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between">
              <label className="font-medium capitalize">{key}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 cursor-pointer transition ${
                      star <= value
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setRatings({ ...ratings, [key]: star })}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <label className="font-medium">Additional Comments</label>
          <Textarea
            placeholder="Optional: Share specific feedback..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={wouldRecommend}
            onChange={(e) => setWouldRecommend(e.target.checked)}
          />
          <span>I would recommend this judge for future hackathons</span>
        </label>

        <Button
          onClick={() => submitRating.mutate()}
          disabled={submitRating.isPending}
          className="w-full"
        >
          Submit Rating
        </Button>
      </CardContent>
    </Card>
  )
}
