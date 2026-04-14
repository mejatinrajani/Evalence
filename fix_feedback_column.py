#!/usr/bin/env python3
"""Quick fix to add missing feedback column"""
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
        conn.execute(text("ALTER TABLE evaluations ADD COLUMN feedback TEXT"))
        conn.commit()
        print("✅ Added feedback column to evaluations table")
    except Exception as e:
        print(f"Column already exists or error: {e}")
        conn.rollback()

print("\nNow run: python seed_database.py")
