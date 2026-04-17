import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 3: Team Messaging Component
 * Real-time team communication with pinning and media support
 */

interface TeamMessage {
  message_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  attachments?: {
    type: 'link' | 'file' | 'image';
    url: string;
    name?: string;
  }[];
  is_pinned: boolean;
  created_at: string;
  edited_at?: string;
}

interface TeamMessagingProps {
  team_id: number;
  current_user_id: number;
  current_user_name: string;
  messages: TeamMessage[];
  onSendMessage: (content: string, attachments?: any[]) => void;
  onPinMessage: (message_id: number) => void;
}

export const TeamMessaging: React.FC<TeamMessagingProps> = ({
  current_user_name,
  messages = [],
  onSendMessage,
  onPinMessage,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<TeamMessage[]>([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update pinned messages
  useEffect(() => {
    setPinnedMessages(messages.filter((m) => m.is_pinned));
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() && attachments.length === 0) return;

    onSendMessage(messageInput, attachments);
    setMessageInput('');
    setAttachments([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  const addAttachment = () => {
    // Simulate file picker
    const newAttachment = {
      type: 'file',
      url: 'https://example.com/file.pdf',
      name: 'presentation.pdf',
    };
    setAttachments([...attachments, newAttachment]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredMessages = messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const emojis = ['👍', '❤️', '😂', '🎉', '🚀', '💯', '🔥', '✨'];

  return (
    <div className="space-y-4 flex flex-col h-full p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
      <h2 className="text-3xl font-bold text-slate-900">💬 Team Chat</h2>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"
        >
          <p className="text-xs font-bold text-yellow-800 mb-2">📌 Pinned ({pinnedMessages.length})</p>
          <div className="flex gap-2 overflow-x-auto">
            {pinnedMessages.map((msg) => (
              <div
                key={msg.message_id}
                className="flex-shrink-0 p-2 bg-white rounded border border-yellow-200 text-xs max-w-xs"
              >
                <p className="font-semibold text-slate-900">{msg.sender_name}</p>
                <p className="text-slate-700 line-clamp-2">{msg.content}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-3 bg-white rounded-lg p-4 border-2 border-slate-200">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>No messages yet. Start the conversation! 🚀</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((msg, idx) => {
              const isCurrentUser = msg.sender_name === current_user_name;
              return (
                <motion.div
                  key={msg.message_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-900'
                    } hover:shadow-md transition-shadow`}
                  >
                    {!isCurrentUser && (
                      <p className="text-xs font-bold mb-1 opacity-75">{msg.sender_name}</p>
                    )}

                    <p className="text-sm break-words">{msg.content}</p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold hover:underline"
                          >
                            {att.type === 'file' && '📎'}
                            {att.type === 'link' && '🔗'}
                            {att.type === 'image' && '🖼️'}
                            {att.name || 'Attachment'}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs opacity-70">{formatTime(msg.created_at)}</p>
                      {msg.is_pinned && <span className="text-xs">📌</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => onPinMessage(msg.message_id)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                      msg.is_pinned
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-slate-200 text-slate-700 opacity-0 group-hover:opacity-100'
                    }`}
                    title={msg.is_pinned ? 'Unpin message' : 'Pin message'}
                  >
                    📌
                  </motion.button>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-slate-100 rounded-lg"
        >
          <p className="text-xs font-bold text-slate-700 mb-2">Attachments:</p>
          <div className="flex gap-2 flex-wrap">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-slate-300"
              >
                <span>{att.type === 'file' ? '📎' : '🔗'} {att.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="text-slate-600 hover:text-red-600 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Ctrl+Enter to send)"
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none h-16"
          />

          {/* Emoji Picker (Compact) */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowEmojis(!showEmojis)}
              className="px-2 py-1 hover:bg-slate-200 rounded text-lg"
              title="Add emoji"
            >
              😊
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={addAttachment}
              className="px-2 py-1 hover:bg-slate-200 rounded text-lg"
              title="Add attachment"
            >
              📎
            </motion.button>
          </div>
        </div>

        {/* Emoji Quick Select */}
        <AnimatePresence>
          {showEmojis && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-1 p-2 bg-slate-100 rounded-lg w-fit"
            >
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setMessageInput(messageInput + emoji);
                    setShowEmojis(false);
                  }}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSendMessage}
          disabled={!messageInput.trim() && attachments.length === 0}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          📤 Send Message
        </motion.button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-xs text-slate-500 text-center">
        💡 Ctrl+Enter = Send | @mention = Tag team members
      </div>
    </div>
  );
};

export default TeamMessaging;
