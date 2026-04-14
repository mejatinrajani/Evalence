#!/usr/bin/env python3
"""Fix score column to be nullable"""
import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from dotenv import load_dotenv
load_dotenv()

import database

engine = database.engine

with engine.connect() as conn:
    try:
        # Make score column nullable
        conn.execute(text("""
            ALTER TABLE evaluations 
            ALTER COLUMN score DROP NOT NULL
        """))
        conn.commit()
        print("✅ Made score column nullable in evaluations table")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()

print("\nNow run: python seed_database.py")
