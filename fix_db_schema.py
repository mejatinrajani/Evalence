#!/usr/bin/env python3
"""Fix database schema by adding missing columns"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
load_dotenv(os.path.join(backend_path, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found!")
    exit(1)

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

# SQL commands to add missing columns
migrations = [
    """
    ALTER TABLE evaluation_scores
    ADD COLUMN IF NOT EXISTS z_score FLOAT,
    ADD COLUMN IF NOT EXISTS normalized_score FLOAT,
    ADD COLUMN IF NOT EXISTS comment TEXT;
    """,
]

try:
    with engine.connect() as conn:
        for migration in migrations:
            print(f"Running migration...")
            conn.execute(text(migration))
            conn.commit()
        print("✅ All schema migrations completed successfully!")
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
