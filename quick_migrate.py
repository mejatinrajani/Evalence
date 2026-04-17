#!/usr/bin/env python3
"""Quick database migration to add missing columns"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
load_dotenv(os.path.join(backend_path, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found!")
    sys.exit(1)

# Parse the connection string
parsed = urlparse(DATABASE_URL)

try:
    # Connect directly with psycopg2
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password,
        sslmode='require'
    )
    
    cursor = conn.cursor()
    
    print("Adding missing columns to evaluation_scores table...")
    
    # Add columns if they don't exist
    cursor.execute("""
        ALTER TABLE evaluation_scores
        ADD COLUMN IF NOT EXISTS z_score FLOAT,
        ADD COLUMN IF NOT EXISTS normalized_score FLOAT;
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("✅ Migration completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
