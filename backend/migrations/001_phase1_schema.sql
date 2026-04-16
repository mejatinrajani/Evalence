-- Phase 1 Schema Migrations for Evalence Hackathon Platform
-- Created: April 16, 2026

-- Add missing columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS presentation_slide_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS project_video_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS submission_status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

-- Create ProjectSubmissionLog table for audit trail
CREATE TABLE IF NOT EXISTS project_submission_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_submission_logs_project_id 
ON project_submission_logs(project_id);

-- Create ConflictOfInterest table
CREATE TABLE IF NOT EXISTS conflicts_of_interest (
    id SERIAL PRIMARY KEY,
    judge_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conflicts_judge 
ON conflicts_of_interest(judge_id, hackathon_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_team 
ON conflicts_of_interest(team_id, hackathon_id);

-- Update Announcements table for enhanced features
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Update ScoreAppeal table for full appeal workflow
ALTER TABLE score_appeals 
ADD COLUMN IF NOT EXISTS criterion_id INTEGER REFERENCES criteria(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reviewed_by_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS resolution VARCHAR(100);

-- Update JudgeAssignment table (ensure all columns exist)
ALTER TABLE judge_assignments 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_hackathon_id_status 
ON projects(hackathon_id, submission_status);
CREATE INDEX IF NOT EXISTS idx_projects_team_id 
ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_judges 
ON judge_assignments(hackathon_id, judge_id);
CREATE INDEX IF NOT EXISTS idx_announcements_hackathon_role 
ON announcements(hackathon_id, target_role);
CREATE INDEX IF NOT EXISTS idx_score_appeals_status 
ON score_appeals(status);

-- Create view for organizer dashboard - evaluation progress
CREATE OR REPLACE VIEW v_evaluation_progress AS
SELECT 
    r.id as round_id,
    r.name as round_name,
    h.id as hackathon_id,
    COUNT(DISTINCT t.id) as total_teams,
    COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_evaluations,
    COUNT(DISTINCT CASE WHEN e.status = 'in_progress' THEN e.id END) as in_progress_evaluations,
    COUNT(DISTINCT CASE WHEN e.status IS NULL OR e.status = 'pending' THEN t.id END) as pending_teams,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) 
        / NULLIF(COUNT(DISTINCT t.id), 0), 2) as completion_percent,
    ROUND(AVG(CASE WHEN e.status = 'completed' THEN e.score END)::NUMERIC, 2) as avg_score
FROM rounds r
JOIN hackathons h ON r.hackathon_id = h.id
JOIN teams t ON t.hackathon_id = h.id
LEFT JOIN evaluations e ON e.team_id = t.id AND e.round_id = r.id
GROUP BY r.id, r.name, h.id;

-- Create view for judge performance metrics
CREATE OR REPLACE VIEW v_judge_performance AS
SELECT 
    ja.judge_id,
    u.full_name as judge_name,
    ja.hackathon_id,
    COUNT(DISTINCT ja.id) as assigned_count,
    COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_count,
    ROUND(AVG(CASE WHEN e.status = 'completed' THEN e.score END)::NUMERIC, 2) as avg_score,
    ROUND(AVG(EXTRACT(EPOCH FROM (e.submitted_at - e.created_at))/60)::NUMERIC, 2) as avg_time_per_eval_minutes,
    ROUND(STDDEV(CASE WHEN e.status = 'completed' THEN e.score END)::NUMERIC, 2) as score_std_dev,
    MAX(e.updated_at) as last_activity
FROM judge_assignments ja
JOIN users u ON ja.judge_id = u.id
LEFT JOIN evaluations e ON ja.judge_id = e.judge_id 
    AND ja.hackathon_id = e.hackathon_id
GROUP BY ja.judge_id, u.full_name, ja.hackathon_id;

-- Create view for leaderboard rankings
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT 
    ROW_NUMBER() OVER (PARTITION BY h.id ORDER BY es.final_score DESC) as rank,
    t.id as team_id,
    t.name as team_name,
    h.id as hackathon_id,
    ROUND(AVG(es.score)::NUMERIC, 2) as avg_score,
    ROUND(AVG(es.normalized_score)::NUMERIC, 2) as final_score,
    COUNT(DISTINCT e.id) as evaluations_received
FROM teams t
JOIN hackathons h ON t.hackathon_id = h.id
LEFT JOIN evaluations e ON e.team_id = t.id AND e.status = 'completed'
LEFT JOIN evaluation_scores es ON e.id = es.evaluation_id
WHERE h.status = 'results'
GROUP BY t.id, t.name, h.id, h.status;

-- Verify new tables and columns exist
SELECT 'Database migration successful' as status;
