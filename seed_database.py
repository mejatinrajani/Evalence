#!/usr/bin/env python3
"""
Comprehensive database seed script with full portal data
Creates users, hackathons, rounds, criteria, teams, projects, and evaluations
"""
import os
import sys
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

load_dotenv()

# Import after env is loaded
import database
import models
import security

# Sample data generators
PROJECT_TITLES = [
    "AI-Powered Code Assistant",
    "Real-time Collaboration Tool",
    "Blockchain Voting System",
    "ML Model Optimizer",
    "Web3 Social Network",
    "Climate Data Dashboard",
    "Smart Contract Auditor",
    "Quantum Computing Simulator",
]

DESCRIPTIONS = [
    "An innovative solution to streamline developer workflows",
    "Building the future of remote collaboration",
    "Secure and transparent voting on the blockchain",
    "Optimizing ML models for production",
    "Decentralized social network with privacy-first design",
    "Visualizing climate data for better decision making",
    "Automated security auditing for smart contracts",
    "Exploring quantum computing capabilities",
]

CRITERIA_NAMES = ["Innovation", "Code Quality", "Presentation", "Impact", "Feasibility"]

def seed_database():
    """Populate database with comprehensive test data."""
    
    db = database.SessionLocal()
    
    try:
        print("🌱 Starting database seeding...")
        
        # Create tables
        models.Base.metadata.create_all(bind=database.engine)
        print("✅ Tables created/verified")
        
        # 1. Create test users
        print("\n👥 Creating test users...")
        
        users_data = [
            # Judges
            {"email": "judge1@evalence.com", "full_name": "Alice Johnson", "password": "JudgePass123!", "role": "judge"},
            {"email": "judge2@evalence.com", "full_name": "Bob Smith", "password": "JudgePass123!", "role": "judge"},
            {"email": "judge3@evalence.com", "full_name": "Carol White", "password": "JudgePass123!", "role": "judge"},
            {"email": "judge4@evalence.com", "full_name": "David Brown", "password": "JudgePass123!", "role": "judge"},
            # Organizers
            {"email": "organizer1@evalence.com", "full_name": "Emma Davis", "password": "OrganizerPass123!", "role": "mentor"},
            {"email": "organizer2@evalence.com", "full_name": "Frank Miller", "password": "OrganizerPass123!", "role": "mentor"},
            # Participants
            {"email": "participant1@evalence.com", "full_name": "Grace Lee", "password": "ParticipantPass123!", "role": "participant"},
            {"email": "participant2@evalence.com", "full_name": "Henry Chen", "password": "ParticipantPass123!", "role": "participant"},
            {"email": "participant3@evalence.com", "full_name": "Iris Kumar", "password": "ParticipantPass123!", "role": "participant"},
            {"email": "participant4@evalence.com", "full_name": "Jack Wilson", "password": "ParticipantPass123!", "role": "participant"},
            {"email": "participant5@evalence.com", "full_name": "Karen Taylor", "password": "ParticipantPass123!", "role": "participant"},
            {"email": "participant6@evalence.com", "full_name": "Liam Martinez", "password": "ParticipantPass123!", "role": "participant"},
            # Admin
            {"email": "admin@evalence.com", "full_name": "Admin User", "password": "AdminPass123!", "role": "super_admin"},
        ]
        
        users = {}
        for user_data in users_data:
            existing = db.query(models.User).filter(models.User.email == user_data["email"]).first()
            if not existing:
                user = models.User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=security.get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    bio=f"Passionate about technology and innovation",
                    avatar_url=f"https://i.pravatar.cc/150?img={hash(user_data['email']) % 70}"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                users[user_data["email"]] = user
                print(f"  ✅ {user_data['full_name']}")
            else:
                users[user_data["email"]] = existing
        
        # 2. Create hackathons
        print("\n🏆 Creating hackathons...")
        
        now = datetime.utcnow()
        hackathons_data = [
            {
                "name": "TechHack 2026",
                "description": "Build the future of technology with cutting-edge tools",
                "start_date": (now + timedelta(days=30)),
                "end_date": (now + timedelta(days=32)),
                "mentor_id": users["organizer1@evalence.com"].id,
                "max_teams": 5,
            },
            {
                "name": "AI Innovation Cup",
                "description": "AI and machine learning hackathon for next-generation solutions",
                "start_date": (now + timedelta(days=45)),
                "end_date": (now + timedelta(days=47)),
                "mentor_id": users["organizer2@evalence.com"].id,
                "max_teams": 4,
            },
            {
                "name": "WebDev Challenge",
                "description": "Create amazing web experiences and win big prizes",
                "start_date": (now + timedelta(days=10)),
                "end_date": (now + timedelta(days=12)),
                "mentor_id": users["organizer1@evalence.com"].id,
                "max_teams": 3,
            },
        ]
        
        hackathons = {}
        for hackathon_data in hackathons_data:
            existing = db.query(models.Hackathon).filter(models.Hackathon.name == hackathon_data["name"]).first()
            if not existing:
                hackathon = models.Hackathon(**hackathon_data)
                db.add(hackathon)
                db.commit()
                db.refresh(hackathon)
                hackathons[hackathon_data["name"]] = hackathon
                print(f"  ✅ Created: {hackathon_data['name']}")
            else:
                hackathons[hackathon_data["name"]] = existing
                print(f"  ⏭️  Exists: {hackathon_data['name']}")
        
        # 3. Create rounds for each hackathon
        print("\n📊 Creating rounds and criteria...")
        
        rounds_data = {
            "TechHack 2026": [
                {"name": "Initial Submission", "description": "Submit your project idea", "order": 1},
                {"name": "Technical Review", "description": "Technical evaluation phase", "order": 2},
                {"name": "Final Presentation", "description": "Final judging and awards", "order": 3},
            ],
            "AI Innovation Cup": [
                {"name": "Proposal Round", "description": "Submit AI project proposal", "order": 1},
                {"name": "Model Validation", "description": "Test AI model performance", "order": 2},
                {"name": "Demonstration", "description": "Live demo and Q&A", "order": 3},
            ],
            "WebDev Challenge": [
                {"name": "Design Phase", "description": "Design submission", "order": 1},
                {"name": "Development", "description": "Code submission", "order": 2},
            ],
        }
        
        criteria_data = {
            "Initial Submission": [
                {"name": "Idea Clarity", "description": "How clear is the project idea?", "weight": 20},
                {"name": "Innovation", "description": "How innovative is the solution?", "weight": 30},
                {"name": "Feasibility", "description": "Is the idea feasible?", "weight": 25},
                {"name": "Potential Impact", "description": "What is the potential impact?", "weight": 25},
            ],
            "Technical Review": [
                {"name": "Code Quality", "description": "Quality of the codebase", "weight": 30},
                {"name": "Architecture", "description": "System design and architecture", "weight": 25},
                {"name": "Documentation", "description": "Code and API documentation", "weight": 20},
                {"name": "Testing", "description": "Test coverage and quality", "weight": 25},
            ],
            "Final Presentation": [
                {"name": "Presentation Skills", "description": "Quality of presentation", "weight": 20},
                {"name": "Technical Depth", "description": "Technical complexity achieved", "weight": 30},
                {"name": "Demo Quality", "description": "Quality of live demo", "weight": 25},
                {"name": "Q&A Performance", "description": "Answers to judge questions", "weight": 25},
            ],
        }
        
        rounds = {}
        for hackathon_name, rounds_list in rounds_data.items():
            for round_data in rounds_list:
                existing = db.query(models.Round).filter(
                    models.Round.hackathon_id == hackathons[hackathon_name].id,
                    models.Round.name == round_data["name"]
                ).first()
                
                if not existing:
                    round_obj = models.Round(
                        hackathon_id=hackathons[hackathon_name].id,
                        name=round_data["name"],
                        description=round_data["description"],
                        order=round_data["order"]
                    )
                    db.add(round_obj)
                    db.commit()
                    db.refresh(round_obj)
                    rounds[f"{hackathon_name}_{round_data['name']}"] = round_obj
                    
                    # Add criteria for this round
                    for criteria in criteria_data.get(round_data["name"], []):
                        existing_criteria = db.query(models.Criteria).filter(
                            models.Criteria.round_id == round_obj.id,
                            models.Criteria.name == criteria["name"]
                        ).first()
                        
                        if not existing_criteria:
                            criteria_obj = models.Criteria(
                                round_id=round_obj.id,
                                name=criteria["name"],
                                description=criteria["description"],
                                weight=criteria["weight"]
                            )
                            db.add(criteria_obj)
                    
                    db.commit()
                    print(f"  ✅ Round: {hackathon_name} - {round_data['name']} (with criteria)")
                else:
                    rounds[f"{hackathon_name}_{round_data['name']}"] = existing
        
        # 4. Assign judges to hackathons
        print("\n⚖️ Assigning judges to hackathons...")
        
        judges = [users["judge1@evalence.com"], users["judge2@evalence.com"], users["judge3@evalence.com"], users["judge4@evalence.com"]]
        for hackathon in hackathons.values():
            for judge in judges[:3]:  # Assign 3 judges per hackathon
                existing = db.query(models.HackathonJudge).filter(
                    models.HackathonJudge.hackathon_id == hackathon.id,
                    models.HackathonJudge.judge_id == judge.id
                ).first()
                
                if not existing:
                    hj = models.HackathonJudge(
                        hackathon_id=hackathon.id,
                        judge_id=judge.id
                    )
                    db.add(hj)
            
            db.commit()
            print(f"  ✅ Assigned judges to {hackathon.name}")
        
        # 5. Create teams
        print("\n👨‍💻 Creating teams...")
        
        teams_data = [
            {"name": "Code Masters", "hackathon_name": "TechHack 2026", "member_ids": [users["participant1@evalence.com"].id, users["participant2@evalence.com"].id]},
            {"name": "Tech Titans", "hackathon_name": "TechHack 2026", "member_ids": [users["participant2@evalence.com"].id, users["participant3@evalence.com"].id]},
            {"name": "Innovation Lab", "hackathon_name": "TechHack 2026", "member_ids": [users["participant4@evalence.com"].id]},
            {"name": "AI Wizards", "hackathon_name": "AI Innovation Cup", "member_ids": [users["participant1@evalence.com"].id, users["participant5@evalence.com"].id]},
            {"name": "Neural Network", "hackathon_name": "AI Innovation Cup", "member_ids": [users["participant3@evalence.com"].id]},
            {"name": "Web Warriors", "hackathon_name": "WebDev Challenge", "member_ids": [users["participant2@evalence.com"].id, users["participant6@evalence.com"].id]},
        ]
        
        teams = {}
        for team_data in teams_data:
            existing = db.query(models.Team).filter(
                models.Team.name == team_data["name"],
                models.Team.hackathon_id == hackathons[team_data["hackathon_name"]].id
            ).first()
            
            if not existing:
                team = models.Team(
                    name=team_data["name"],
                    hackathon_id=hackathons[team_data["hackathon_name"]].id,
                    members=team_data["member_ids"]
                )
                db.add(team)
                db.commit()
                db.refresh(team)
                teams[f"{team_data['hackathon_name']}_{team_data['name']}"] = team
                print(f"  ✅ Created: {team_data['name']} ({len(team_data['member_ids'])} members)")
            else:
                teams[f"{team_data['hackathon_name']}_{team_data['name']}"] = existing
        
        # 6. Create projects for teams
        print("\n🎯 Creating projects...")
        
        project_count = 0
        for team_key, team in teams.items():
            existing_project = db.query(models.Project).filter(models.Project.team_id == team.id).first()
            if not existing_project:
                project = models.Project(
                    title=f"{team.name} - Innovation Project",
                    description=f"An innovative project built by {team.name} team during the hackathon",
                    github_url=f"https://github.com/hackathon/{team.name.lower().replace(' ', '-')}",
                    demo_url=f"https://demo.evalence.com/{team.name.lower().replace(' ', '-')}",
                    tech_stack=["React", "FastAPI", "PostgreSQL"],
                    team_id=team.id,
                    hackathon_id=team.hackathon_id
                )
                db.add(project)
                db.commit()
                db.refresh(project)
                project_count += 1
                print(f"  ✅ Project: {project.title}")
        
        # 7. Create evaluations with scores
        print("\n📝 Creating evaluations...")
        
        evaluation_count = 0
        for team_key, team in teams.items():
            for judge in judges:
                existing_eval = db.query(models.Evaluation).filter(
                    models.Evaluation.team_id == team.id,
                    models.Evaluation.judge_id == judge.id
                ).first()
                
                if not existing_eval:
                    # Find rounds for this hackathon
                    team_rounds = db.query(models.Round).filter(
                        models.Round.hackathon_id == team.hackathon_id
                    ).order_by(models.Round.order).all()
                    
                    for round_obj in team_rounds[:1]:  # Just evaluate first round for now
                        evaluation = models.Evaluation(
                            team_id=team.id,
                            judge_id=judge.id,
                            round_id=round_obj.id,
                            hackathon_id=team.hackathon_id,
                            status="completed"
                        )
                        db.add(evaluation)
                        db.commit()
                        db.refresh(evaluation)
                        
                        # Add scores for criteria
                        criteria_list = db.query(models.Criteria).filter(
                            models.Criteria.round_id == round_obj.id
                        ).all()
                        
                        for criteria in criteria_list:
                            # Generate pseudo-random scores (70-95)
                            score = 70 + hash(f"{evaluation.id}_{criteria.id}") % 26
                            
                            score_obj = models.EvaluationScore(
                                evaluation_id=evaluation.id,
                                criteria_id=criteria.id,
                                score=score,
                                comment=f"Good work on {criteria.name.lower()}"
                            )
                            db.add(score_obj)
                        
                        db.commit()
                        evaluation_count += 1
                        print(f"  ✅ Evaluation: {team.name} by {judge.full_name}")
        
        print(f"\n✨ Database seeding complete!")
        print(f"   - {len(users)} users created")
        print(f"   - {len(hackathons)} hackathons created")
        print(f"   - {len(rounds)} rounds created")
        print(f"   - {len(teams)} teams created")
        print(f"   - {project_count} projects created")
        print(f"   - {evaluation_count} evaluations created")
        
        print("\n🔑 Test Credentials:")
        print("   Judge: judge1@evalence.com / JudgePass123!")
        print("   Judge: judge2@evalence.com / JudgePass123!")
        print("   Organizer: organizer1@evalence.com / OrganizerPass123!")
        print("   Participant: participant1@evalence.com / ParticipantPass123!")
        print("   Admin: admin@evalence.com / AdminPass123!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
