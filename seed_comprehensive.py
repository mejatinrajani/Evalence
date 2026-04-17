#!/usr/bin/env python3
"""
Comprehensive Database Seeding for Full Portal Experience
Creates realistic data for judges, participants, and organizers
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Fix Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

load_dotenv(os.path.join(backend_path, '.env'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
sys.path.insert(0, backend_path)

# Import models
from models import (
    User, Hackathon, Team, Project, Round, Criteria, 
    Evaluation, EvaluationScore, Announcement, RoleEnum, JudgeAssignment,
    HackathonJudge
)
from security import get_password_hash
from database import Base

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found!")
    sys.exit(1)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600
)
Session = sessionmaker(bind=engine)

def seed_database():
    """Create comprehensive seed data for full portal experience"""
    session = Session()
    
    try:
        print("\n" + "="*80)
        print("🌱  COMPREHENSIVE PORTAL SEED")
        print("="*80 + "\n")
        
        # Step 1: Clear existing data (in correct order for foreign key dependencies)
        print("🔄 [1/7] Clearing existing data...")
        session.query(EvaluationScore).delete()
        session.query(Evaluation).delete()
        session.query(JudgeAssignment).delete()
        session.query(Announcement).delete()
        session.query(Project).delete()
        session.query(Criteria).delete()
        session.query(Round).delete()
        session.query(Team).delete()
        session.query(HackathonJudge).delete()  # Delete this before Hackathon
        session.query(Hackathon).delete()
        session.query(User).delete()
        session.commit()
        print("   ✅ Database cleared\n")
        
        # Password hash
        pwd_hash = get_password_hash("Password123!")
        
        # Step 2: Create users
        print("👥 [2/7] Creating users...")
        
        # Organizers/Mentors
        organizer = User(
            email="organizer@evalence.dev",
            hashed_password=pwd_hash,
            full_name="Alice Johnson",
            role=RoleEnum.mentor,
            bio="Hackathon organizer and mentor",
            github_url="https://github.com/alice",
            skills=["Event Management", "JavaScript", "Python"]
        )
        
        # Judges
        judges = [
            User(
                email="judge1@evalence.dev",
                hashed_password=pwd_hash,
                full_name="Dr. Robert Smith",
                role=RoleEnum.judge,
                bio="Senior Software Engineer at Google",
                github_url="https://github.com/rsmith",
                skills=["JavaScript", "System Design", "Performance"]
            ),
            User(
                email="judge2@evalence.dev",
                hashed_password=pwd_hash,
                full_name="Sarah Lee",
                role=RoleEnum.judge,
                bio="Product Designer & UX Expert",
                github_url="https://github.com/slee",
                skills=["UI/UX", "Design Systems", "Figma"]
            ),
            User(
                email="judge3@evalence.dev",
                hashed_password=pwd_hash,
                full_name="Michael Chen",
                role=RoleEnum.judge,
                bio="DevOps Engineer & Cloud Architect",
                github_url="https://github.com/mchen",
                skills=["Cloud", "Docker", "Kubernetes", "AWS"]
            ),
        ]
        
        # Participants (different teams)
        participants = []
        for i in range(20):
            participant = User(
                email=f"participant{i}@evalence.dev",
                hashed_password=pwd_hash,
                full_name=f"Developer {i}",
                role=RoleEnum.participant,
                bio=f"Passionate developer interested in hackathons",
                github_url=f"https://github.com/dev{i}",
                skills=random.sample(["Python", "JavaScript", "React", "Django", "FastAPI", "Node.js", "SQL"], 2)
            )
            participants.append(participant)
        
        session.add(organizer)
        session.add_all(judges)
        session.add_all(participants)
        session.commit()
        print(f"   ✅ Created 1 organizer, {len(judges)} judges, {len(participants)} participants\n")
        
        # Step 3: Create hackathons in different states
        print("🏆 [3/7] Creating hackathons with different statuses...")
        
        now = datetime.utcnow()
        
        # Hackathon 1: ACTIVE (Registration phase)
        h1 = Hackathon(
            name="Web3 Innovation Challenge 2026",
            description="Build the next generation of decentralized applications. Win prizes up to $50,000!",
            start_date=(now + timedelta(days=5)).isoformat(),
            end_date=(now + timedelta(days=12)).isoformat(),
            status="registration_open",
            mentor_id=organizer.id,
            prize_pool="$50,000",
            max_teams=50,
            registration_start=now,
            registration_end=now + timedelta(days=3),
            submission_start=now + timedelta(days=5),
            submission_end=now + timedelta(days=10),
            evaluation_start=now + timedelta(days=11),
            evaluation_end=now + timedelta(days=12),
            auto_transition_enabled=True
        )
        
        # Hackathon 2: EVALUATING (Submission complete, judges evaluating)
        h2 = Hackathon(
            name="AI/ML Hackathon 2026",
            description="Create intelligent solutions using AI and Machine Learning. Build chatbots, recommendation engines, and more!",
            start_date=(now - timedelta(days=10)).isoformat(),
            end_date=(now + timedelta(days=2)).isoformat(),
            status="evaluating",
            mentor_id=organizer.id,
            prize_pool="$30,000",
            max_teams=40,
            registration_start=now - timedelta(days=20),
            registration_end=now - timedelta(days=15),
            submission_start=now - timedelta(days=10),
            submission_end=now - timedelta(days=2),
            evaluation_start=now - timedelta(days=1),
            evaluation_end=now + timedelta(days=2),
            auto_transition_enabled=True
        )
        
        # Hackathon 3: COMPLETED (Results published)
        h3 = Hackathon(
            name="Fintech Revolution 2026",
            description="Build financial applications that disrupt traditional banking",
            start_date=(now - timedelta(days=60)).isoformat(),
            end_date=(now - timedelta(days=50)).isoformat(),
            status="results_published",
            mentor_id=organizer.id,
            prize_pool="$75,000",
            max_teams=60,
            auto_transition_enabled=True
        )
        
        session.add_all([h1, h2, h3])
        session.commit()
        print("   ✅ Created 3 hackathons with different statuses\n")
        
        # Step 4: Create teams and projects
        print("📋 [4/7] Creating teams and projects...")
        
        # Teams for H1 (registration phase)
        h1_teams = []
        for i in range(8):
            team = Team(
                name=f"Team {chr(65+i)}",
                members=[
                    {"name": participants[i*2].full_name, "email": participants[i*2].email},
                    {"name": participants[i*2+1].full_name, "email": participants[i*2+1].email}
                ],
                hackathon_id=h1.id
            )
            h1_teams.append(team)
        
        session.add_all(h1_teams)
        session.commit()
        print(f"   ✅ Created {len(h1_teams)} teams for {h1.name}\n")
        
        # Teams for H2 (with projects for evaluation)
        h2_teams = []
        tech_stacks = ["MERN", "Django+React", "FastAPI+Vue", "Next.js", "Flask+React"]
        for i in range(10):
            team = Team(
                name=f"ML Team {i+1}",
                members=[
                    {"name": f"Member {i*2}", "email": f"member{i*2}@hackers.dev"},
                    {"name": f"Member {i*2+1}", "email": f"member{i*2+1}@hackers.dev"}
                ],
                hackathon_id=h2.id
            )
            h2_teams.append(team)
        
        session.add_all(h2_teams)
        session.commit()
        
        # Create projects for H2 teams
        project_ideas = [
            ("Smart Chatbot Assistant", "AI-powered chatbot using GPT API for customer support"),
            ("Recommendation Engine", "Machine learning system to recommend products based on user behavior"),
            ("Fraud Detection System", "Real-time fraud detection using ML algorithms"),
            ("Sentiment Analysis Tool", "Analyze customer sentiment from social media data"),
            ("Price Optimization AI", "Dynamic pricing engine using predictive analytics"),
            ("Image Recognition Platform", "Computer vision system for object detection"),
            ("Time Series Forecasting", "Predict stock market trends using LSTM models"),
            ("NLP Text Classifier", "Classify documents automatically using transformers"),
            ("Anomaly Detection System", "Detect unusual patterns in network traffic"),
            ("Customer Segmentation Tool", "Cluster customers for targeted marketing"),
        ]
        
        for i, team in enumerate(h2_teams):
            title, desc = project_ideas[i]
            project = Project(
                title=title,
                description=desc,
                github_url=f"https://github.com/team{i}/hackathon-project",
                demo_url=f"https://demo{i}.herokuapp.com",
                tech_stack=random.choice(tech_stacks),
                submission_status="submitted",
                submitted_at=now - timedelta(days=2),
                team_id=team.id,
                hackathon_id=h2.id
            )
            session.add(project)
        
        session.commit()
        print(f"   ✅ Created {len(h2_teams)} teams with projects for {h2.name}\n")
        
        # Step 5: Create evaluation rounds and criteria
        print("📊 [5/7] Creating evaluation rounds and criteria...")
        
        # Round 1: Technical Excellence
        round1 = Round(
            name="Technical Excellence",
            description="Evaluate code quality, architecture, and technical implementation",
            order=1,
            hackathon_id=h2.id
        )
        
        criteria1 = [
            Criteria(name="Code Quality", description="Well-structured, readable, maintainable code", weight=25, max_points=100, round_id=round1.id),
            Criteria(name="Innovation", description="Creativity and uniqueness of the solution", weight=25, max_points=100, round_id=round1.id),
            Criteria(name="Functionality", description="Does it work as intended?", weight=30, max_points=100, round_id=round1.id),
            Criteria(name="Performance", description="Speed, efficiency, and resource usage", weight=20, max_points=100, round_id=round1.id),
        ]
        
        # Round 2: User Experience
        round2 = Round(
            name="User Experience",
            description="Evaluate UI/UX design and user engagement",
            order=2,
            hackathon_id=h2.id
        )
        
        criteria2 = [
            Criteria(name="Design", description="Visual appeal and consistency", weight=30, max_points=100, round_id=round2.id),
            Criteria(name="Usability", description="Easy to use and intuitive", weight=35, max_points=100, round_id=round2.id),
            Criteria(name="Accessibility", description="Works for all users", weight=20, max_points=100, round_id=round2.id),
            Criteria(name="Documentation", description="Clear user guides and documentation", weight=15, max_points=100, round_id=round2.id),
        ]
        
        session.add(round1)
        session.add_all(criteria1)
        session.add(round2)
        session.add_all(criteria2)
        session.commit()
        print(f"   ✅ Created 2 rounds with 8 criteria for {h2.name}\n")
        
        # Step 6: Create judge assignments and evaluations
        print("⭐ [6/7] Creating judge assignments and evaluations...")
        
        # First, assign judges to the H2 hackathon (the evaluating one)
        for judge in judges:
            hackathon_judge = HackathonJudge(
                hackathon_id=h2.id,
                judge_id=judge.id
            )
            session.add(hackathon_judge)
        
        session.commit()
        
        # Create mix of completed and pending evaluations
        evaluations_count = 0
        pending_assignments = 0
        
        # Completed evaluations for first 5 teams
        for team_idx, team in enumerate(h2_teams[:5]):
            for round_num, (round_obj, criteria_list) in enumerate([(round1, criteria1), (round2, criteria2)], 1):
                for judge_idx, judge in enumerate(judges):
                    # Create judge assignment
                    assignment = JudgeAssignment(
                        judge_id=judge.id,
                        team_id=team.id,
                        hackathon_id=h2.id,
                        round_id=round_obj.id,
                        status="completed"
                    )
                    session.add(assignment)
                    
                    # Create evaluation
                    eval_obj = Evaluation(
                        judge_id=judge.id,
                        team_id=team.id,
                        round_id=round_obj.id,
                        status="completed",
                        feedback=f"Excellent {round_obj.name.lower()} implementation!",
                        submitted_at=now - timedelta(hours=12)
                    )
                    session.add(eval_obj)
                    session.flush()
                    
                    # Add scores for each criterion using raw SQL
                    for criterion in criteria_list:
                        score = random.randint(70, 98)
                        sql = text("""
                            INSERT INTO evaluation_scores (evaluation_id, criteria_id, score, created_at, updated_at)
                            VALUES (:eval_id, :crit_id, :score, NOW(), NOW())
                        """)
                        session.execute(sql, {
                            "eval_id": eval_obj.id,
                            "crit_id": criterion.id,
                            "score": score
                        })
                    
                    evaluations_count += 1
        
        # Pending evaluations for next 5 teams (judges assigned but not evaluated)
        for team_idx, team in enumerate(h2_teams[5:10]):
            for round_num, (round_obj, criteria_list) in enumerate([(round1, criteria1)], 1):
                for judge_idx, judge in enumerate(judges):
                    # Create judge assignment with pending status
                    assignment = JudgeAssignment(
                        judge_id=judge.id,
                        team_id=team.id,
                        hackathon_id=h2.id,
                        round_id=round_obj.id,
                        status="pending"
                    )
                    session.add(assignment)
                    pending_assignments += 1
        
        session.commit()
        print(f"   ✅ Assigned {len(judges)} judges to hackathon")
        print(f"   ✅ Created {evaluations_count} completed evaluations")
        print(f"   ✅ Created {pending_assignments} pending team assignments for evaluation\n")
        
        # Step 7: Create announcements
        print("📢 [7/7] Creating announcements...")
        
        announcements = [
            Announcement(
                title="Welcome to Web3 Challenge!",
                body="Get ready to build the future of decentralized web. Registration is now open!",
                hackathon_id=h1.id,
                author_id=organizer.id
            ),
            Announcement(
                title="AI/ML Hackathon Judging Complete",
                body="Thank you to all participants! Judges are currently scoring all submissions.",
                hackathon_id=h2.id,
                author_id=organizer.id
            ),
            Announcement(
                title="Fintech Challenge Results Released",
                body="Congratulations to all winners! Check out the leaderboard to see final rankings.",
                hackathon_id=h3.id,
                author_id=organizer.id
            ),
        ]
        
        session.add_all(announcements)
        session.commit()
        print(f"   ✅ Created {len(announcements)} announcements\n")
        
        print("="*80)
        print("✅ DATABASE SEEDING COMPLETE!")
        print("="*80 + "\n")
        
        print("📊 SUMMARY:")
        print(f"   • Hackathons: 3 (Registration, Evaluating, Completed)")
        print(f"   • Users: 1 Organizer + {len(judges)} Judges + {len(participants)} Participants")
        print(f"   • Teams: {len(h1_teams)} (Registration) + {len(h2_teams)} (Evaluating)")
        print(f"   • Evaluation Rounds: 2")
        print(f"   • Criteria: 8")
        print(f"   • Evaluations: {evaluations_count}")
        print(f"   • Announcements: {len(announcements)}")
        
        print("\n🎯 PORTAL EXPERIENCE:\n")
        print("   👤 As Participant (email: participant0@evalence.dev):")
        print("      ✓ Register for Web3 Innovation Challenge 2026")
        print("      ✓ Join team and submit project for evaluation")
        print("      ✓ View your project scores from judges")
        print("      ✓ See feedback and rankings on leaderboard")
        
        print("\n   👨‍⚖️ As Judge (e.g., judge1@evalence.dev - Dr. Robert Smith):")
        print("      ✓ View 'AI/ML Hackathon 2026' assigned to you")
        print("      ✓ See 5 teams with COMPLETED evaluations (already scored)")
        print("      ✓ See 5 teams PENDING your evaluation (to be scored)")
        print("      ✓ Evaluate projects on 2 rounds:")
        print("         - Round 1: Technical Excellence (4 criteria)")
        print("         - Round 2: User Experience (4 criteria)")
        print("      ✓ Score each team on a 0-100 scale for each criterion")
        print("      ✓ Provide feedback comments for teams")
        print("      ✓ View real-time leaderboard updates as you score")
        
        print("\n   👨‍💼 As Organizer (email: organizer@evalence.dev - Alice Johnson):")
        print("      ✓ Manage all 3 hackathons at different lifecycle stages")
        print("      ✓ View judge assignments and evaluation progress")
        print("      ✓ See statistics: teams registered, submissions, scores")
        print("      ✓ Monitor evaluation status by round")
        print("      ✓ Publish final results when ready")
        print("      ✓ Create and manage announcements for participants")
        
        print("\n   🔐 Password for all accounts: Password123!")
        print("\n" + "="*80 + "\n")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
