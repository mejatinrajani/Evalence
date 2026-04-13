-- Complete Feature Migration for Evalence Hackathon Portal
-- Phase 1: Add missing tables and columns for full functionality

-- ============================================================
-- 1. ROUNDS TABLE (Already exists, adding description)
-- ============================================================
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;


-- ============================================================
-- 2. CRITERIA TABLE (Already exists, adding weight and description)
-- ============================================================
ALTER TABLE criteria ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE criteria ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;


-- ============================================================
-- 3. JUDGE ASSIGNMENTS TABLE (NEW)
-- ============================================================
CREATE TABLE IF NOT EXISTS judge_assignments (
    id SERIAL PRIMARY KEY,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    judge_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    round_id INTEGER REFERENCES rounds(id) ON DELETE SET NULL,
    status VARCHAR DEFAULT 'pending',  -- pending, evaluating, completed
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(judge_id, team_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_hackathon_id ON judge_assignments(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge_id ON judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_team_id ON judge_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_round_id ON judge_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_status ON judge_assignments(status);


-- ============================================================
-- 4. ANNOUNCEMENTS TABLE (Enhanced with audience and tracking)
-- ============================================================
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience VARCHAR DEFAULT 'all';  -- all, judges, coordinators, participants, teams
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;


-- ============================================================
-- 5. EVALUATIONS TABLE (Enhanced with feedback)
-- ============================================================
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS round_id INTEGER REFERENCES rounds(id) ON DELETE SET NULL;


-- ============================================================
-- 6. EVENT LOGS TABLE (NEW - For analytics and tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_logs (
    id SERIAL PRIMARY KEY,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    event_type VARCHAR NOT NULL,  -- registration, submission, evaluation_started, evaluation_completed, announcement_sent, etc
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_logs_hackathon_id ON event_logs(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);


-- ============================================================
-- 7. PARTICIPANT REGISTRATIONS TABLE (NEW - Track registration)
-- ============================================================
CREATE TABLE IF NOT EXISTS participant_registrations (
    id SERIAL PRIMARY KEY,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    status VARCHAR DEFAULT 'registered',  -- registered, withdrawn, completed
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hackathon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participant_registrations_hackathon_id ON participant_registrations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_participant_registrations_user_id ON participant_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_registrations_team_id ON participant_registrations(team_id);


-- ============================================================
-- 8. Verify all critical indexes exist
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON teams(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_rounds_hackathon_id ON rounds(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_criteria_round_id ON criteria(round_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_team_id ON evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_judge_id ON evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_criterion_id ON evaluations(criterion_id);
CREATE INDEX IF NOT EXISTS idx_projects_hackathon_id ON projects(hackathon_id);
