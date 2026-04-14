#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, 'backend')
from dotenv import load_dotenv
load_dotenv()

import database
import models

db = database.SessionLocal()
try:
    users = db.query(models.User).count()
    hackathons = db.query(models.Hackathon).count()
    teams = db.query(models.Team).count()
    projects = db.query(models.Project).count()
    
    print("\n" + "="*50)
    print("📊 DATABASE SUMMARY")
    print("="*50)
    print(f"✅ Users:      {users}")
    print(f"✅ Hackathons: {hackathons}")
    print(f"✅ Teams:      {teams}")
    print(f"✅ Projects:   {projects}")
    print("="*50)
    
    # Print sample users
    sample_users = db.query(models.User).limit(3).all()
    print("\n👥 Sample Users:")
    for u in sample_users:
        print(f"   - {u.email} ({u.role})")
    
    # Print hackathons
    sample_hackathons = db.query(models.Hackathon).all()
    print("\n🏆 Hackathons:")
    for h in sample_hackathons:
        print(f"   - {h.name}")
        teams = db.query(models.Team).filter(models.Team.hackathon_id == h.id).count()
        print(f"     └─ {teams} teams")
    
finally:
    db.close()
