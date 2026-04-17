import React, { useState, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 3: Mentorship Matching System Component
 * Find mentors, request mentorship, and track sessions
 */

interface MentorProfile {
  mentor_id: number;
  mentor_name: string;
  expertise: string[];
  bio: string;
  rating: number;
  sessions_completed: number;
  availability: string;
  profile_image?: string;
}

interface MentorshipRequest {
  request_id: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  mentor_name?: string;
  requested_date: string;
  accepted_date?: string;
}

interface MentorshipSession {
  session_id: number;
  mentor_name: string;
  topic: string;
  date: string;
  duration_minutes: number;
  notes: string;
  rating?: number;
}

interface MentorshipMatchingProps {
  hackathon_id: number;
  current_user_id: number;
  available_mentors: MentorProfile[];
  my_requests: MentorshipRequest[];
  my_sessions: MentorshipSession[];
}

type MentorshipState = {
  selectedMentor: MentorProfile | null;
  filter: 'all' | 'available' | 'highly-rated';
  searchTerm: string;
  activeTab: 'browse' | 'requests' | 'sessions';
  requestMessage: string;
};

const initialState: MentorshipState = {
  selectedMentor: null,
  filter: 'all',
  searchTerm: '',
  activeTab: 'browse',
  requestMessage: '',
};

type MentorshipAction =
  | { type: 'SELECT_MENTOR'; mentor: MentorProfile }
  | { type: 'CLEAR_MENTOR' }
  | { type: 'SET_FILTER'; filter: MentorshipState['filter'] }
  | { type: 'SET_SEARCH'; term: string }
  | { type: 'SET_TAB'; tab: MentorshipState['activeTab'] }
  | { type: 'SET_MESSAGE'; message: string };

const reducer = (state: MentorshipState, action: MentorshipAction): MentorshipState => {
  switch (action.type) {
    case 'SELECT_MENTOR':
      return { ...state, selectedMentor: action.mentor };
    case 'CLEAR_MENTOR':
      return { ...state, selectedMentor: null };
    case 'SET_FILTER':
      return { ...state, filter: action.filter };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_MESSAGE':
      return { ...state, requestMessage: action.message };
    default:
      return state;
  }
};

export const MentorshipMatching: React.FC<MentorshipMatchingProps> = ({
  available_mentors,
  my_requests,
  my_sessions,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);

  // Filter mentors
  const filteredMentors = available_mentors.filter((mentor) => {
    const matchesSearch =
      mentor.mentor_name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      mentor.expertise.some((skill) =>
        skill.toLowerCase().includes(state.searchTerm.toLowerCase())
      );

    const matchesFilter =
      state.filter === 'all' ||
      (state.filter === 'available' && mentor.availability === 'available') ||
      (state.filter === 'highly-rated' && mentor.rating >= 4.5);

    return matchesSearch && matchesFilter;
  });

  const getRatingDisplay = (rating: number) => {
    const stars = Math.floor(rating);
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < stars ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
        <span className="text-xs text-slate-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: '⏳ Pending' },
      accepted: { color: 'bg-green-100 text-green-800', label: '✅ Accepted' },
      completed: { color: 'bg-blue-100 text-blue-800', label: '🎉 Completed' },
      declined: { color: 'bg-red-100 text-red-800', label: '❌ Declined' },
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
      <h2 className="text-3xl font-bold text-slate-900">👥 Mentorship Matching</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['browse', 'requests', 'sessions'] as const).map((tab) => (
          <motion.button
            key={tab}
            onClick={() => dispatch({ type: 'SET_TAB', tab })}
            whileHover={{ scale: 1.05 }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              state.activeTab === tab
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-slate-700 border-2 border-slate-200'
            }`}
          >
            {tab === 'browse' && '🔍 Browse Mentors'}
            {tab === 'requests' && '📬 My Requests'}
            {tab === 'sessions' && '📅 Sessions'}
          </motion.button>
        ))}
      </div>

      {/* Browse Mentors Tab */}
      {state.activeTab === 'browse' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Search & Filter */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search mentors by name or skill..."
              value={state.searchTerm}
              onChange={(e) => dispatch({ type: 'SET_SEARCH', term: e.target.value })}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
            <div className="flex gap-2">
              {(['all', 'available', 'highly-rated'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => dispatch({ type: 'SET_FILTER', filter })}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                    state.filter === filter
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {filter === 'all' && '✨ All'}
                  {filter === 'available' && '🟢 Available'}
                  {filter === 'highly-rated' && '⭐ Highly Rated'}
                </button>
              ))}
            </div>
          </div>

          {/* Mentors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMentors.map((mentor, idx) => (
              <motion.div
                key={mentor.mentor_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-white rounded-lg border-2 border-slate-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-slate-900">{mentor.mentor_name}</h3>
                  {mentor.availability === 'available' && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                      Available
                    </span>
                  )}
                </div>

                {getRatingDisplay(mentor.rating)}

                <p className="text-sm text-slate-600 mt-2 h-10 line-clamp-2">{mentor.bio}</p>

                <div className="mt-3 mb-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Expertise:</p>
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 mb-4 pb-4 border-b border-slate-100">
                  <span>📊 {mentor.sessions_completed} sessions</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => dispatch({ type: 'SELECT_MENTOR', mentor })}
                  className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
                >
                  Request Mentorship
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Requests Tab */}
      {state.activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {my_requests.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-lg border-2 border-slate-200">
              <p className="text-slate-600">No mentorship requests yet. Browse mentors to get started!</p>
            </div>
          ) : (
            my_requests.map((request, idx) => {
              const badge = getStatusBadge(request.status);
              return (
                <motion.div
                  key={request.request_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-white rounded-lg border-2 border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {request.mentor_name || 'Awaiting Mentor'}
                      </h4>
                      <p className="text-sm text-slate-600">
                        Requested: {new Date(request.requested_date).toLocaleDateString()}
                      </p>
                      {request.accepted_date && (
                        <p className="text-sm text-slate-600">
                          Accepted: {new Date(request.accepted_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${badge.color}`}>
                      {badge.label}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* Sessions Tab */}
      {state.activeTab === 'sessions' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {my_sessions.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-lg border-2 border-slate-200">
              <p className="text-slate-600">No mentorship sessions yet.</p>
            </div>
          ) : (
            my_sessions.map((session, idx) => (
              <motion.div
                key={session.session_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-white rounded-lg border-2 border-slate-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{session.mentor_name}</h4>
                    <p className="text-sm text-slate-600 mt-1">Topic: {session.topic}</p>
                  </div>
                  {session.rating && (
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < session.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">📅 Date</p>
                    <p className="font-semibold text-slate-900">{new Date(session.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">⏱️ Duration</p>
                    <p className="font-semibold text-slate-900">{session.duration_minutes} minutes</p>
                  </div>
                </div>

                {session.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                    <p className="text-xs text-slate-600 font-semibold mb-1">Notes:</p>
                    <p className="text-sm text-slate-700">{session.notes}</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {state.selectedMentor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="p-6 bg-white rounded-lg max-w-md mx-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Request Mentorship from {state.selectedMentor.mentor_name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    What skills do you want to learn?
                  </label>
                  <textarea
                    placeholder="Tell the mentor something about your goals..."
                    value={state.requestMessage}
                    onChange={(e) => dispatch({ type: 'SET_MESSAGE', message: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none h-20 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_MENTOR' })}
                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MentorshipMatching;
