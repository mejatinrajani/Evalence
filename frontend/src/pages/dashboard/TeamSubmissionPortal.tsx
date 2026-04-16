import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Send, Check, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Project {
  id: number;
  team_id: number;
  hackathon_id: number;
  project_name?: string;
  description?: string;
  demo_url?: string;
  github_url?: string;
  presentation_slide_url?: string;
  tech_stack?: string[];
  project_video_url?: string;
  submission_status: 'draft' | 'submitted' | 'withdrawn';
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface SubmissionLog {
  id: number;
  project_id: number;
  action: string;
  timestamp: string;
  submitted_by_id: number;
  notes?: string;
}

export const TeamSubmissionPortal: React.FC = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('project-info');
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionLog[]>([]);

  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    demo_url: '',
    github_url: '',
    presentation_slide_url: '',
    tech_stack: [] as string[],
    project_video_url: '',
  });

  useEffect(() => {
    fetchSubmission();
  }, [hackathonId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/projects/my-submission?hackathon_id=${hackathonId}`);
      const proj = response.data;
      setProject(proj);
      setSubmitted(proj.submission_status === 'submitted');
      setFormData({
        project_name: proj.project_name || '',
        description: proj.description || '',
        demo_url: proj.demo_url || '',
        github_url: proj.github_url || '',
        presentation_slide_url: proj.presentation_slide_url || '',
        tech_stack: proj.tech_stack || [],
        project_video_url: proj.project_video_url || '',
      });

      // Fetch history if project exists
      if (proj.id) {
        const historyResponse = await api.get(`/api/projects/${proj.id}/submission-history`);
        setSubmissionHistory(historyResponse.data);
      }
    } catch (err) {
      setError('Failed to load submission');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTechStackAdd = (tech: string) => {
    if (tech && !formData.tech_stack.includes(tech)) {
      setFormData(prev => ({
        ...prev,
        tech_stack: [...prev.tech_stack, tech]
      }));
    }
  };

  const handleTechStackRemove = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      tech_stack: prev.tech_stack.filter(t => t !== tech)
    }));
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await api.post('/api/projects/submit', {
        ...formData,
        hackathon_id: parseInt(hackathonId!),
      });

      setProject(response.data);
      setSuccess('Draft saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const submitProject = async () => {
    if (!formData.project_name) {
      setError('Project name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await api.post('/api/projects/submit', {
        ...formData,
        hackathon_id: parseInt(hackathonId!),
      });

      setProject(response.data);
      setSubmitted(true);
      setSuccess('Project submitted successfully!');
      fetchSubmission();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Project Submission</h1>
          <p className="text-slate-600">Submit your hackathon project for evaluation</p>
          <div className="mt-4 flex items-center gap-4">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              submitted 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {submitted ? '✓ Submitted' : '○ Draft'}
            </span>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="project-info">Project Info</TabsTrigger>
            <TabsTrigger value="urls">Links</TabsTrigger>
            <TabsTrigger value="tech-stack">Tech Stack</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Project Info Tab */}
          <TabsContent value="project-info">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Project Name *
                  </label>
                  <Input
                    placeholder="Enter your project name"
                    value={formData.project_name}
                    onChange={(e) => handleInputChange('project_name', e.target.value)}
                    disabled={submitted}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your project in detail..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={submitted}
                    className="w-full h-32 px-4 py-2 border border-slate-300 rounded-lg resize-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* URLs Tab */}
          <TabsContent value="urls">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Demo URL
                  </label>
                  <Input
                    placeholder="https://yourproject.com"
                    value={formData.demo_url}
                    onChange={(e) => handleInputChange('demo_url', e.target.value)}
                    disabled={submitted}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    GitHub Repository
                  </label>
                  <Input
                    placeholder="https://github.com/yourrepo"
                    value={formData.github_url}
                    onChange={(e) => handleInputChange('github_url', e.target.value)}
                    disabled={submitted}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Presentation Slides
                  </label>
                  <Input
                    placeholder="https://slides.com/yourslides"
                    value={formData.presentation_slide_url}
                    onChange={(e) => handleInputChange('presentation_slide_url', e.target.value)}
                    disabled={submitted}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Demo Video (Optional)
                  </label>
                  <Input
                    placeholder="https://youtu.be/..."
                    value={formData.project_video_url}
                    onChange={(e) => handleInputChange('project_video_url', e.target.value)}
                    disabled={submitted}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tech Stack Tab */}
          <TabsContent value="tech-stack">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Technologies Used
                  </label>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="React, Python, PostgreSQL..."
                      id="tech-input"
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById('tech-input') as HTMLInputElement;
                        if (input) {
                          handleTechStackAdd(input.value);
                          input.value = '';
                        }
                      }}
                      disabled={submitted}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.tech_stack.map(tech => (
                      <div
                        key={tech}
                        className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {tech}
                        {!submitted && (
                          <button
                            onClick={() => handleTechStackRemove(tech)}
                            className="text-blue-600 hover:text-blue-900 font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Submission History</h3>
                {submissionHistory.length === 0 ? (
                  <p className="text-slate-600">No history yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissionHistory.map(log => (
                      <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold text-slate-900 capitalize">{log.action}</p>
                        <p className="text-sm text-slate-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        {log.notes && <p className="text-sm text-slate-600">{log.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {!submitted && (
          <div className="mt-8 flex gap-4">
            <Button
              onClick={saveDraft}
              disabled={saving}
              variant="outline"
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </Button>
            <Button
              onClick={submitProject}
              disabled={saving || !formData.project_name}
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Project
            </Button>
          </div>
        )}

        {submitted && (
          <Alert className="mt-8 border-green-200 bg-green-50">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your project has been submitted successfully! Judges will be evaluating it shortly.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default TeamSubmissionPortal;
