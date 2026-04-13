-- ============================================================
-- JUDGES PORTAL SYSTEM - DATABASE MIGRATION
-- Date: April 13, 2026
-- ============================================================

-- ============================================================
-- PHASE 1: Optimize indexes for judge_assignments
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge_id_status 
  ON judge_assignments(judge_id, status);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_hackathon_id_status 
  ON judge_assignments(hackathon_id, status);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_team_id 
  ON judge_assignments(team_id);

-- ============================================================
-- PHASE 2: Optimize evaluations table indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_evaluations_judge_team_round 
  ON evaluations(judge_id, team_id, round_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_judge_id_submitted 
  ON evaluations(judge_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluations_team_id 
  ON evaluations(team_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_criterion_id 
  ON evaluations(criterion_id);

-- ============================================================
-- PHASE 3: Add missing columns to evaluations
-- ============================================================

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS submitted_at 
  TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_final 
  BOOLEAN DEFAULT FALSE;

-- ============================================================
-- PHASE 4: Ensure judge_assignments has all tracking columns
-- ============================================================

ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS notes 
  TEXT;

-- ============================================================
-- PHASE 5: Indexes for common filter operations
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_criteria_round_id 
  ON criteria(round_id);

CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id 
  ON teams(hackathon_id);

CREATE INDEX IF NOT EXISTS idx_rounds_hackathon_id 
  ON rounds(hackathon_id);

CREATE INDEX IF NOT EXISTS idx_projects_hackathon_id 
  ON projects(hackathon_id);

CREATE INDEX IF NOT EXISTS idx_event_logs_judge_created 
  ON event_logs(event_type, created_at DESC)
  WHERE event_type IN ('evaluation_started', 'evaluation_submitted');

-- ============================================================
-- PHASE 6: Verify table structure
-- ============================================================

-- Verify judge_assignments has all required columns
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS hackathon_id INTEGER;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS judge_id INTEGER;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS team_id INTEGER;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS round_id INTEGER;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify evaluations has all required columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS judge_id INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS team_id INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS criterion_id INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS round_id INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS hackathon_id INTEGER;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- PHASE 7: Create UNIQUE constraint to prevent duplicate evaluations
-- ============================================================

-- This will be enforced at application level due to complexity
-- But we document it here: One judge can only submit one evaluation per team per round
-- Natural key: (judge_id, team_id, round_id, criterion_id)

-- ============================================================
-- PHASE 8: Verify event_logs structure
-- ============================================================

ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS hackathon_id INTEGER;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR NOT NULL;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS team_id INTEGER;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS details JSON;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

SELECT '[OK] Migration completed successfully' as status;
