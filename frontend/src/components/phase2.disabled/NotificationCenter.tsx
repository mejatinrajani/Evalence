import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 2: Real-Time Notification Center
 * Displays WebSocket-powered live notifications
 */

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  hackathon_id?: number;
  related_id?: number;
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notification_id: number) => void;
  onMarkAllRead: () => void;
}

const getNotificationColor = (type: string) => {
  const colors: { [key: string]: string } = {
    EVALUATION_SUBMITTED: 'bg-blue-100 border-blue-400 text-blue-900',
    TEAM_ADVANCED: 'bg-green-100 border-green-400 text-green-900',
    LEADERBOARD_UPDATED: 'bg-purple-100 border-purple-400 text-purple-900',
    JUDGE_ASSIGNED: 'bg-orange-100 border-orange-400 text-orange-900',
    APPEAL_STATUS_CHANGED: 'bg-amber-100 border-amber-400 text-amber-900',
    ROUND_STARTED: 'bg-red-100 border-red-400 text-red-900',
    ROUND_ENDING_SOON: 'bg-yellow-100 border-yellow-400 text-yellow-900',
    PERMISSION_GRANTED: 'bg-indigo-100 border-indigo-400 text-indigo-900',
    MESSAGE_RECEIVED: 'bg-pink-100 border-pink-400 text-pink-900',
  };
  return colors[type] || colors.EVALUATION_SUBMITTED;
};

const getNotificationIcon = (type: string) => {
  const icons: { [key: string]: string } = {
    EVALUATION_SUBMITTED: '🎯',
    TEAM_ADVANCED: '🎉',
    LEADERBOARD_UPDATED: '📊',
    JUDGE_ASSIGNED: '👨‍⚖️',
    APPEAL_STATUS_CHANGED: '📋',
    ROUND_STARTED: '🏁',
    ROUND_ENDING_SOON: '⏰',
    PERMISSION_GRANTED: '🔑',
    MESSAGE_RECEIVED: '💬',
  };
  return icons[type] || '📢';
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
      >
        <svg
          className="w-6 h-6 text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg">
              <h3 className="font-bold text-slate-900 text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={onMarkAllRead}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-semibold"
                >
                  Mark all read
                </motion.button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-slate-600">No notifications yet</p>
                  <p className="text-xs text-slate-500 mt-2">
                    You'll see updates here as events happen
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onMarkAsRead(notif.id)}
                      className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                        !notif.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notif.notification_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-slate-900 text-sm leading-tight">
                              {notif.title}
                            </h4>
                            {!notif.is_read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            {formatTime(notif.created_at)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-lg">
                <button className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
