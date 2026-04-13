-- Migration script to add organizer portal tables
-- This script creates tables for managing judges, coordinators, and their credentials

-- Create hackathon_judges table
CREATE TABLE IF NOT EXISTS hackathon_judges (
    id SERIAL PRIMARY KEY,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hackathon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_judges_hackathon_id ON hackathon_judges(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_judges_user_id ON hackathon_judges(user_id);

-- Create hackathon_coordinators table
CREATE TABLE IF NOT EXISTS hackathon_coordinators (
    id SERIAL PRIMARY KEY,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hackathon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_coordinators_hackathon_id ON hackathon_coordinators(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_coordinators_user_id ON hackathon_coordinators(user_id);

-- Create credentials table for temporary judge/coordinator access
CREATE TABLE IF NOT EXISTS credentials (
    id SERIAL PRIMARY KEY,
    hackathon_id INTEGER NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'judge' or 'coordinator'
    is_active VARCHAR(10) DEFAULT 'True',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_credentials_hackathon_id ON credentials(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_credentials_username ON credentials(username);
CREATE INDEX IF NOT EXISTS idx_credentials_role ON credentials(role);
CREATE INDEX IF NOT EXISTS idx_credentials_created_by ON credentials(created_by);
