-- Migration to add missing columns to evaluations table
-- These columns are required by the Evaluation model in models.py

-- Add feedback-related columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS detailed_feedback TEXT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS suggestions TEXT;

-- Add submission tracking columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS submitted_by_id INTEGER REFERENCES users(id);

-- Add finalization tracking columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT FALSE;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;

-- Add modification tracking column
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify all columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'evaluations' 
ORDER BY column_name;
