import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';

interface AnnouncementCreatorProps {
  hackathonId: number;
  onSuccess?: () => void;
}

export default function AnnouncementCreator({ hackathonId, onSuccess }: AnnouncementCreatorProps) {
  const [activeTab, setActiveTab] = useState<'announcement' | 'email'>('announcement');
  const [announcement, setAnnouncement] = useState({
    title: '',
    body: '',
    audience: 'all'
  });
  const [email, setEmail] = useState({
    subject: '',
    body: '',
    audience: 'all'
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handlePostAnnouncement = async () => {
    if (!announcement.title.trim() || !announcement.body.trim()) {
      alert('Please fill in both title and body');
      return;
    }

    try {
      setLoading(true);
      await api.request(`/hackathons/${hackathonId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: announcement.title,
          body: announcement.body
        })
      });
      setSuccessMessage('Announcement posted successfully!');
      setAnnouncement({ title: '', body: '', audience: 'all' });
      setTimeout(() => setSuccessMessage(''), 3000);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to post announcement:', error);
      alert('Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email.subject.trim() || !email.body.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    try {
      setLoading(true);
      const response = await api.request(
        `/me/hackathons/${hackathonId}/send-email`,
        {
          method: 'POST',
          body: JSON.stringify({
            subject: email.subject,
            body: email.body,
            audience: email.audience
          })
        }
      );
      setSuccessMessage(`Email sent to ${response.count} recipients!`);
      setEmail({ subject: '', body: '', audience: 'all' });
      setTimeout(() => setSuccessMessage(''), 3000);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('announcement')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'announcement'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell size={18} />
            Announcement
          </div>
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'email'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail size={18} />
            Send Email
          </div>
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg"
        >
          {successMessage}
        </motion.div>
      )}

      {/* Announcement Form */}
      {activeTab === 'announcement' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Announcement Title
            </label>
            <Input
              placeholder="e.g., Registration Extended"
              value={announcement.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncement({ ...announcement, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={announcement.body}
              onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })}
              placeholder="Your announcement message..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <Button
            onClick={handlePostAnnouncement}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            <Bell size={18} />
            {loading ? 'Posting...' : 'Post Announcement'}
          </Button>
        </motion.div>
      )}

      {/* Email Form */}
      {activeTab === 'email' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send To
            </label>
            <select
              value={email.audience}
              onChange={(e) => setEmail({ ...email, audience: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="all">All (Judges, Coordinators, Participants)</option>
              <option value="judges">Judges Only</option>
              <option value="coordinators">Coordinators Only</option>
              <option value="participants">Participants Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Subject
            </label>
            <Input
              placeholder="e.g., Important: Judging Guidelines"
              value={email.subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail({ ...email, subject: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Body
            </label>
            <textarea
              value={email.body}
              onChange={(e) => setEmail({ ...email, body: e.target.value })}
              placeholder="Your email message..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <Button
            onClick={handleSendEmail}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
