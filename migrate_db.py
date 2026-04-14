#!/usr/bin/env python3
"""
Database migration script to update schema for new evaluation system
Adds missing columns and creates new tables
"""
import os
import sys
from datetime import datetime
from sqlalchemy import text

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from dotenv import load_dotenv
load_dotenv()

import database

def run_migrations():
    """Execute all database migrations"""
    engine = database.engine
    
    # List of migration SQL statements
    migrations = [
        # 1. Add missing columns to rounds table
        """
        ALTER TABLE rounds
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS "order" INTEGER;
        """,
        
        # 2. Add weight column to criteria table
        """
        ALTER TABLE criteria
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 10;
        """,
        
        # 3. Update evaluations table
        """
        ALTER TABLE evaluations
        ADD COLUMN IF NOT EXISTS round_id INTEGER REFERENCES rounds(id),
        ADD COLUMN IF NOT EXISTS hackathon_id INTEGER REFERENCES hackathons(id),
        ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS feedback TEXT;
        """,
        
        # 4. Create evaluation_scores table if it doesn't exist
        """
        CREATE TABLE IF NOT EXISTS evaluation_scores (
            id SERIAL PRIMARY KEY,
            evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
            criteria_id INTEGER NOT NULL REFERENCES criteria(id),
            score FLOAT NOT NULL,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        
        # 5. Rename user_id to judge_id in hackathon_judges if needed
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'hackathon_judges' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE hackathon_judges RENAME COLUMN user_id TO judge_id;
            END IF;
        END $$;
        """,
        
        # 6. Create indices for better query performance
        """
        CREATE INDEX IF NOT EXISTS idx_evaluations_team_judge ON evaluations(team_id, judge_id);
        CREATE INDEX IF NOT EXISTS idx_evaluations_round ON evaluations(round_id);
        CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation ON evaluation_scores(evaluation_id);
        CREATE INDEX IF NOT EXISTS idx_evaluation_scores_criteria ON evaluation_scores(criteria_id);
        """,
    ]
    
    print("🔄 Running database migrations...")
    
    try:
        with engine.connect() as connection:
            total_migrations = len(migrations)
            for i, migration in enumerate(migrations, 1):
                try:
                    print(f"\n  [{i}/{total_migrations}] Executing migration...")
                    connection.execute(text(migration))
                    connection.commit()
                    print(f"       ✅ Success")
                except Exception as e:
                    # Some errors are expected (column already exists, etc)
                    if "already exists" in str(e) or "duplicate" in str(e).lower():
                        print(f"       ⏭️  Already migrated (skipped)")
                    else:
                        print(f"       ⚠️  Warning: {str(e)[:100]}")
        
        print("\n✨ Database migration complete!")
        print("\n   Next step: Run 'python seed_database.py' to populate with test data")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
