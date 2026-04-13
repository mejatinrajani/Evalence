from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta, datetime
import uvicorn
from typing import List, Optional
import math
import threading
import time
import os
import random
import string
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

import database
import models
import schemas
import security
from mail_service import EmailService

app = FastAPI(title="Evalence API", version="2.0.0", description="Professional Hackathon Management Platform")

# Create DB tables on app startup in a background thread (non-blocking)
def init_database():
    """Initialize database tables in background to avoid blocking startup"""
    time.sleep(1)  # Brief delay to let server start
    try:
        print("\n[INFO] Initializing database tables...")
        models.Base.metadata.create_all(bind=database.engine)
        print("[OK] Database tables created/verified\n")
    except Exception as e:
        print(f"\n[WARN] Database error: {str(e)[:150]}\n")

@app.on_event("startup")
def startup_event():
    # Start database initialization in background thread (non-blocking)
    db_thread = threading.Thread(target=init_database, daemon=True)
    db_thread.start()

# Setup CORS for the React Frontend (MUST be added as the LAST middleware to execute FIRST)
# Temporarily commented - will add at end of file

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# =============================================
# DEPENDENCIES
# =============================================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except security.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(*roles):
    """RBAC: Require specific roles to access an endpoint."""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Access denied. Required roles: {roles}")
        return current_user
    return role_checker

# =============================================
# ERROR HANDLERS
# =============================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent response format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": str(request.url.path)
        }
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=400,
        content={
            "error": True,
            "status_code": 400,
            "detail": str(exc),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    print(f"[ERR] Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "detail": "Internal server error",
            "path": str(request.url.path)
        }
    )

# =============================================
# HEALTH CHECK
# =============================================
@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "status": "operational",
        "version": "2.0.0",
        "platform": "Evalence",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/api/health", tags=["health"])
def health_check(db: Session = Depends(database.get_db)):
    """Detailed health check including database status."""
    try:
        # Test database connection
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "version": "2.0.0"
    }

# =============================================
# AUTH ROUTES
# =============================================
@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, tags=["auth"])
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """Register a new user with email, password, name, and role."""
    try:
        # Validate email uniqueness
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Validate password strength (minimum 8 characters)
        if len(user.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
        # Hash password
        hashed_pwd = security.get_password_hash(user.password)
        
        # Create new user
        new_user = models.User(
            email=user.email,
            hashed_password=hashed_pwd,
            full_name=user.full_name,
            role=user.role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Send welcome email in background to avoid blocking
        try:
            EmailService.welcome_email(new_user.email, new_user.full_name, new_user.role)
        except Exception as e:
            print(f"[WARN] Welcome email failed: {str(e)}")
            # Don't fail registration if email fails
        
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERR] Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

@app.post("/api/auth/token", tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    """Login user and return access and refresh tokens."""
    try:
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        if not user or not security.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create tokens
        access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
        )
        refresh_token = security.create_refresh_token(data={"sub": user.email, "role": user.role})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user.role,
            "full_name": user.full_name,
            "user_id": user.id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/auth/me", response_model=schemas.UserResponse, tags=["auth"])
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return current_user

@app.post("/api/auth/refresh", tags=["auth"])
def refresh_access_token(request_body: dict = None, token: str = None):
    """Refresh access token using refresh token."""
    try:
        # Accept refresh token from body or header
        if not token:
            return {"error": "No refresh token provided"}
        
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_type: str = payload.get("type")
        email: str = payload.get("sub")
        
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        if email is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        
        # Create new access token
        access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except security.JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    except Exception as e:
        print(f"[ERR] Token refresh error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/auth/me", response_model=schemas.UserResponse, tags=["auth"])
def update_profile(update: schemas.ProfileUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if update.full_name: current_user.full_name = update.full_name
    if update.bio: current_user.bio = update.bio
    if update.github_url: current_user.github_url = update.github_url
    if update.skills: current_user.skills = update.skills
    db.commit()
    db.refresh(current_user)
    return current_user

# =============================================
# HACKATHONS (RBAC: mentor/super_admin)
# =============================================
@app.post("/api/hackathons", response_model=schemas.HackathonResponse, tags=["hackathons"])
def create_hackathon(
    hackathon: schemas.HackathonCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    new_hack = models.Hackathon(
        name=hackathon.name,
        description=hackathon.description,
        start_date=hackathon.start_date,
        end_date=hackathon.end_date,
        prize_pool=hackathon.prize_pool,
        max_teams=hackathon.max_teams,
        status="registration_open",
        mentor_id=current_user.id
    )
    db.add(new_hack)
    db.commit()
    db.refresh(new_hack)

    for team_data in hackathon.teams:
        new_team = models.Team(name=team_data.name, members=team_data.members, hackathon_id=new_hack.id)
        db.add(new_team)

    for round_data in hackathon.rounds:
        new_round = models.Round(name=round_data.name, hackathon_id=new_hack.id)
        db.add(new_round)
        db.commit()
        db.refresh(new_round)
        for criteria_data in round_data.criteria:
            db.add(models.Criterion(name=criteria_data.name, max_points=criteria_data.max_points, round_id=new_round.id))

    db.commit()
    
    # Send confirmation email to organizer
    EmailService.hackathon_created_notification(current_user.email, current_user.full_name, new_hack.name, new_hack.id)
    
    return new_hack

@app.get("/api/hackathons", response_model=List[schemas.HackathonResponse], tags=["hackathons"])
def get_hackathons(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    return db.query(models.Hackathon).offset(offset).limit(limit).all()

@app.get("/api/hackathons/{hackathon_id}", response_model=schemas.HackathonDetailResponse, tags=["hackathons"])
def get_hackathon_detail(hackathon_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    h = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return h

@app.put("/api/hackathons/{hackathon_id}/status", tags=["hackathons"])
def update_hackathon_status(
    hackathon_id: int,
    payload: schemas.StatusUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    h = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id, models.Hackathon.mentor_id == current_user.id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    h.status = payload.status
    db.commit()
    return {"message": f"Status updated to {payload.status}"}

# =============================================
# TEAMS
# =============================================
@app.get("/api/hackathons/{hackathon_id}/teams", tags=["teams"])
def get_teams(hackathon_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()

@app.post("/api/teams", response_model=schemas.TeamResponse, tags=["teams"])
def create_team(
    team: schemas.TeamBase,
    hackathon_id: int = Query(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Create a single team for a hackathon."""
    h = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id, models.Hackathon.mentor_id == current_user.id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    new_team = models.Team(name=team.name, members=team.members, hackathon_id=hackathon_id)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return new_team

@app.put("/api/teams/{team_id}", response_model=schemas.TeamResponse, tags=["teams"])
def update_team(
    team_id: int,
    update: schemas.TeamUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Update a team's name and members."""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    h = db.query(models.Hackathon).filter(models.Hackathon.id == team.hackathon_id, models.Hackathon.mentor_id == current_user.id).first()
    if not h:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if update.name:
        team.name = update.name
    if update.members:
        team.members = update.members
    
    db.commit()
    db.refresh(team)
    return team

@app.delete("/api/teams/{team_id}", tags=["teams"])
def delete_team(
    team_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Delete a team and its associated project."""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    h = db.query(models.Hackathon).filter(models.Hackathon.id == team.hackathon_id, models.Hackathon.mentor_id == current_user.id).first()
    if not h:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Delete associated project if exists
    project = db.query(models.Project).filter(models.Project.team_id == team_id).first()
    if project:
        db.delete(project)
    
    db.delete(team)
    db.commit()
    return {"message": "Team deleted successfully"}

@app.post("/api/hackathons/{hackathon_id}/teams/import", response_model=schemas.TeamImportResponse, tags=["teams"])
def import_teams(
    hackathon_id: int,
    file: bytes = None,
    filename: str = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Import teams from CSV or XLSX file. Expected columns: team_name, members (JSON array)."""
    import pandas as pd
    from io import BytesIO
    import json
    
    h = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id, models.Hackathon.mentor_id == current_user.id).first()
    if not h:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(file))
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(BytesIO(file))
        else:
            raise HTTPException(status_code=400, detail="File must be CSV or XLSX")
        
        imported, failed, errors = 0, 0, []
        
        for idx, row in df.iterrows():
            try:
                team_name = str(row.get('team_name', '')) if 'team_name' in row else str(row.iloc[0])
                members_str = row.get('members', '[]') if 'members' in df.columns else '[]'
                
                if isinstance(members_str, pd.Series):
                    members_str = '[]'
                
                try:
                    if isinstance(members_str, str):
                        members = json.loads(members_str) if members_str.strip() else []
                    else:
                        members = []
                except json.JSONDecodeError:
                    members = []
                
                if not team_name.strip():
                    failed += 1
                    errors.append(f"Row {idx + 2}: Team name is empty")
                    continue
                
                new_team = models.Team(name=team_name.strip(), members=members, hackathon_id=hackathon_id)
                db.add(new_team)
                imported += 1
            except Exception as e:
                failed += 1
                errors.append(f"Row {idx + 2}: {str(e)}")
        
        db.commit()
        return schemas.TeamImportResponse(
            total=len(df),
            imported=imported,
            failed=failed,
            errors=errors[:10]  # Return first 10 errors
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")

# =============================================
# PROJECT SUBMISSIONS (RBAC: participant)
# =============================================
@app.post("/api/projects", response_model=schemas.ProjectResponse, tags=["projects"])
def submit_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if team already has a submission for this hackathon
    existing = db.query(models.Project).filter(
        models.Project.team_id == project.team_id,
        models.Project.hackathon_id == project.hackathon_id
    ).first()
    if existing:
        # Upsert — update the existing one
        existing.title = project.title
        existing.description = project.description
        existing.github_url = project.github_url
        existing.demo_url = project.demo_url
        existing.tech_stack = project.tech_stack
        db.commit()
        db.refresh(existing)
        return existing

    new_project = models.Project(
        title=project.title,
        description=project.description,
        github_url=project.github_url,
        demo_url=project.demo_url,
        tech_stack=project.tech_stack,
        team_id=project.team_id,
        hackathon_id=project.hackathon_id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@app.get("/api/hackathons/{hackathon_id}/projects", tags=["projects"])
def get_projects(hackathon_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Project).filter(models.Project.hackathon_id == hackathon_id).all()

# =============================================
# ANNOUNCEMENTS (RBAC: mentor)
# =============================================
@app.post("/api/hackathons/{hackathon_id}/announcements", response_model=schemas.AnnouncementResponse, tags=["announcements"])
def create_announcement(
    hackathon_id: int,
    announcement: schemas.AnnouncementCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    new_ann = models.Announcement(
        title=announcement.title,
        body=announcement.body,
        hackathon_id=hackathon_id,
        author_id=current_user.id
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)
    
    # Get all participants for this hackathon
    hackathon = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
    teams = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    
    # Extract unique participant emails from team members
    participant_emails = set()
    for team in teams:
        if team.members:
            for member in team.members:
                if isinstance(member, dict) and 'email' in member:
                    participant_emails.add(member['email'])
    
    # Send announcement notification to all participants
    if participant_emails and hackathon:
        EmailService.announcement_notification(
            list(participant_emails),
            hackathon.name,
            announcement.title,
            announcement.body
        )
    
    return new_ann

@app.get("/api/hackathons/{hackathon_id}/announcements", response_model=List[schemas.AnnouncementResponse], tags=["announcements"])
def get_announcements(hackathon_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Announcement).filter(models.Announcement.hackathon_id == hackathon_id).order_by(models.Announcement.id.desc()).all()

# =============================================
# JUDGING (RBAC: judge)
# =============================================
@app.get("/api/judge/queue", tags=["judging"])
def get_judge_queue(db: Session = Depends(database.get_db), current_user: models.User = Depends(require_role("judge", "super_admin"))):
    hackathons = db.query(models.Hackathon).all()
    queue = []
    for h in hackathons:
        for t in h.teams:
            for r in h.rounds:
                for c in r.criteria:
                    already_scored = db.query(models.Evaluation).filter(
                        models.Evaluation.judge_id == current_user.id,
                        models.Evaluation.team_id == t.id,
                        models.Evaluation.criterion_id == c.id
                    ).first()
                    queue.append({
                        "team_id": t.id,
                        "team_name": t.name,
                        "hackathon_id": h.id,
                        "hackathon_name": h.name,
                        "round_id": r.id,
                        "round_name": r.name,
                        "criterion_id": c.id,
                        "criterion_name": c.name,
                        "max_points": c.max_points,
                        "already_scored": already_scored is not None,
                        "current_score": already_scored.score if already_scored else None
                    })
    return queue

@app.post("/api/evaluations", status_code=status.HTTP_201_CREATED, tags=["judging"])
def submit_evaluation(
    evaluation: schemas.EvaluationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    # Upsert: allow judges to revise scores
    existing = db.query(models.Evaluation).filter(
        models.Evaluation.judge_id == current_user.id,
        models.Evaluation.team_id == evaluation.team_id,
        models.Evaluation.criterion_id == evaluation.criterion_id
    ).first()
    
    # Get team and criterion info for email
    team = db.query(models.Team).filter(models.Team.id == evaluation.team_id).first()
    criterion = db.query(models.Criterion).filter(models.Criterion.id == evaluation.criterion_id).first()
    hackathon = db.query(models.Hackathon).join(models.Team).filter(models.Team.id == evaluation.team_id).first()
    
    if existing:
        existing.score = evaluation.score
        db.commit()
        # Send update email
        if hackathon and team and criterion:
            EmailService.score_submitted_notification(
                current_user.email,
                current_user.full_name,
                team.name,
                hackathon.name,
                evaluation.score,
                criterion.max_points
            )
        return {"message": "Score updated"}

    new_eval = models.Evaluation(
        judge_id=current_user.id,
        team_id=evaluation.team_id,
        criterion_id=evaluation.criterion_id,
        score=evaluation.score
    )
    db.add(new_eval)
    db.commit()
    
    # Send confirmation email
    if hackathon and team and criterion:
        EmailService.score_submitted_notification(
            current_user.email,
            current_user.full_name,
            team.name,
            hackathon.name,
            evaluation.score,
            criterion.max_points
        )
    
    return {"message": "Score submitted"}

# =============================================
# LEADERBOARD (Z-SCORE NORMALIZED)
# =============================================
@app.get("/api/hackathons/{hackathon_id}/leaderboard", response_model=List[schemas.TeamLeaderboardResponse], tags=["leaderboard"])
def get_leaderboard(hackathon_id: int, db: Session = Depends(database.get_db)):
    evals = (
        db.query(models.Evaluation)
        .join(models.Team, models.Evaluation.team_id == models.Team.id)
        .filter(models.Team.hackathon_id == hackathon_id)
        .all()
    )

    # 1. Compute μ and σ per judge
    judge_scores: dict = {}
    for e in evals:
        judge_scores.setdefault(e.judge_id, []).append(e.score)

    judge_stats: dict = {}
    for j_id, scores in judge_scores.items():
        if len(scores) < 2:
            judge_stats[j_id] = (float(scores[0]) if scores else 0.0, 1.0)
        else:
            mean = sum(scores) / len(scores)
            variance = sum((x - mean) ** 2 for x in scores) / (len(scores) - 1)
            std = math.sqrt(variance)
            judge_stats[j_id] = (mean, std if std > 0 else 1.0)

    # 2. Accumulate normalized scores per team
    teams = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    team_results: dict = {
        t.id: {"team_id": t.id, "team_name": t.name, "raw_score_sum": 0, "z_score_total": 0.0, "eval_count": 0}
        for t in teams
    }

    for e in evals:
        mean, std = judge_stats.get(e.judge_id, (0.0, 1.0))
        z = (e.score - mean) / std
        team_results[e.team_id]["raw_score_sum"] += e.score
        team_results[e.team_id]["z_score_total"] += z
        team_results[e.team_id]["eval_count"] += 1

    sorted_teams = sorted(team_results.values(), key=lambda x: x["z_score_total"], reverse=True)
    return sorted_teams

# =============================================
# STATS (Dashboard Summary)
# =============================================
@app.get("/api/stats", tags=["stats"])
def get_platform_stats(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    total_hackathons = db.query(models.Hackathon).filter(models.Hackathon.mentor_id == current_user.id).count()
    total_teams = db.query(models.Team).join(models.Hackathon).filter(models.Hackathon.mentor_id == current_user.id).count()
    total_evals = db.query(models.Evaluation).count()
    return {
        "total_hackathons": total_hackathons,
        "total_teams": total_teams,
        "total_evaluations": total_evals,
        "pending_evaluations": max(0, total_teams * 3 - total_evals)
    }

@app.get("/api/hackathons/{hackathon_id}/stats", tags=["stats"])
def get_hackathon_stats(hackathon_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Get detailed statistics for a specific hackathon."""
    h = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    
    teams = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    projects = db.query(models.Project).filter(models.Project.hackathon_id == hackathon_id).all()
    evals = db.query(models.Evaluation).join(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    
    # Calculate stats per criteria
    criteria_stats = {}
    for r in h.rounds:
        for c in r.criteria:
            criterion_evals = [e for e in evals if e.criterion_id == c.id]
            if criterion_evals:
                scores = [e.score for e in criterion_evals]
                avg_score = sum(scores) / len(scores)
                criteria_stats[c.name] = {
                    "criterion_id": c.id,
                    "round": r.name,
                    "max_points": c.max_points,
                    "avg_score": round(avg_score, 2),
                    "eval_count": len(criterion_evals),
                    "min_score": min(scores),
                    "max_score": max(scores),
                }
    
    return {
        "hackathon_id": hackathon_id,
        "hackathon_name": h.name,
        "total_teams": len(teams),
        "total_projects": len(projects),
        "projects_submitted": sum(1 for p in projects if p.team_id),
        "submission_rate": round((sum(1 for p in projects if p.team_id) / len(teams) * 100) if teams else 0, 2),
        "total_evaluations": len(evals),
        "expected_evaluations": len(teams) * sum(len(r.criteria) for r in h.rounds),
        "evaluation_progress": round((len(evals) / (len(teams) * sum(len(r.criteria) for r in h.rounds)) * 100) if teams else 0, 2),
        "status": h.status,
        "criteria_stats": criteria_stats
    }

# =============================================
# ORGANIZER PORTAL - HACKATHON MANAGEMENT
# =============================================
@app.get("/api/me/hackathons", response_model=List[schemas.HackathonResponse], tags=["organizer"])
def get_my_hackathons(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get all hackathons created by the current organizer"""
    return db.query(models.Hackathon).filter(models.Hackathon.mentor_id == current_user.id).all()


@app.get("/api/me/hackathons/{hackathon_id}", response_model=schemas.OrganizerHackathonDetailResponse, tags=["organizer"])
def get_my_hackathon_detail(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get detailed view of organizer's hackathon with judges, coordinators, and credentials"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Get judges
    judges = db.query(models.HackathonJudge).filter(models.HackathonJudge.hackathon_id == hackathon_id).all()
    judges_list = [{"id": j.id, "user_id": j.user_id, "assigned_at": j.assigned_at} for j in judges]
    
    # Get coordinators
    coordinators = db.query(models.HackathonCoordinator).filter(models.HackathonCoordinator.hackathon_id == hackathon_id).all()
    coordinators_list = [{"id": c.id, "user_id": c.user_id, "assigned_at": c.assigned_at} for c in coordinators]
    
    # Get credentials
    credentials = db.query(models.Credentials).filter(models.Credentials.hackathon_id == hackathon_id).all()
    
    response = schemas.OrganizerHackathonDetailResponse.from_orm(h)
    response.judges = judges_list
    response.coordinators = coordinators_list
    response.credentials = [schemas.CredentialsResponse.from_orm(c) for c in credentials]
    
    return response


@app.put("/api/me/hackathons/{hackathon_id}", response_model=schemas.HackathonResponse, tags=["organizer"])
def update_my_hackathon(
    hackathon_id: int,
    update_data: schemas.HackathonCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Update hackathon details"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    h.name = update_data.name
    h.description = update_data.description
    h.start_date = update_data.start_date
    h.end_date = update_data.end_date
    h.prize_pool = update_data.prize_pool
    h.max_teams = update_data.max_teams
    h.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(h)
    return h


# =============================================
# JUDGE CREDENTIALS MANAGEMENT
# =============================================
@app.post("/api/me/hackathons/{hackathon_id}/judges", response_model=schemas.CredentialsWithPasswordResponse, tags=["organizer"])
def create_judge_credential(
    hackathon_id: int,
    payload: schemas.CredentialsCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Create judge credentials for a hackathon"""
    # Verify hackathon ownership
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Generate unique username
    base_username = f"judge_{hackathon_id}_{int(datetime.utcnow().timestamp())}"
    username = base_username
    counter = 1
    while db.query(models.Credentials).filter(models.Credentials.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    # Generate random password
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    
    credential = models.Credentials(
        hackathon_id=hackathon_id,
        username=username,
        hashed_password=security.get_password_hash(password),
        person_name=payload.person_name,
        role="judge",
        is_active="True",
        created_by=current_user.id
    )
    
    db.add(credential)
    db.commit()
    db.refresh(credential)
    
    response = schemas.CredentialsWithPasswordResponse.from_orm(credential)
    response.password = password
    return response


@app.get("/api/me/hackathons/{hackathon_id}/judges", response_model=List[schemas.CredentialsResponse], tags=["organizer"])
def get_judge_credentials(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get all judge credentials for a hackathon"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    credentials = db.query(models.Credentials).filter(
        models.Credentials.hackathon_id == hackathon_id,
        models.Credentials.role == "judge"
    ).all()
    
    return [schemas.CredentialsResponse.from_orm(c) for c in credentials]


@app.delete("/api/me/hackathons/{hackathon_id}/judges/{judge_id}", tags=["organizer"])
def delete_judge_credential(
    hackathon_id: int,
    judge_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Delete a judge credential"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    credential = db.query(models.Credentials).filter(
        models.Credentials.id == judge_id,
        models.Credentials.hackathon_id == hackathon_id,
        models.Credentials.role == "judge"
    ).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Judge credential not found")
    
    db.delete(credential)
    db.commit()
    return {"message": "Judge credential deleted"}


# =============================================
# STUDENT COORDINATOR CREDENTIALS MANAGEMENT
# =============================================
@app.post("/api/me/hackathons/{hackathon_id}/coordinators", response_model=schemas.CredentialsWithPasswordResponse, tags=["organizer"])
def create_coordinator_credential(
    hackathon_id: int,
    payload: schemas.CredentialsCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Create student coordinator credentials for a hackathon"""
    # Verify hackathon ownership
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Generate unique username
    base_username = f"coordinator_{hackathon_id}_{int(datetime.utcnow().timestamp())}"
    username = base_username
    counter = 1
    while db.query(models.Credentials).filter(models.Credentials.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    # Generate random password
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    
    credential = models.Credentials(
        hackathon_id=hackathon_id,
        username=username,
        hashed_password=security.get_password_hash(password),
        person_name=payload.person_name,
        role="coordinator",
        is_active="True",
        created_by=current_user.id
    )
    
    db.add(credential)
    db.commit()
    db.refresh(credential)
    
    response = schemas.CredentialsWithPasswordResponse.from_orm(credential)
    response.password = password
    return response


@app.get("/api/me/hackathons/{hackathon_id}/coordinators", response_model=List[schemas.CredentialsResponse], tags=["organizer"])
def get_coordinator_credentials(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get all student coordinator credentials for a hackathon"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    credentials = db.query(models.Credentials).filter(
        models.Credentials.hackathon_id == hackathon_id,
        models.Credentials.role == "coordinator"
    ).all()
    
    return [schemas.CredentialsResponse.from_orm(c) for c in credentials]


@app.delete("/api/me/hackathons/{hackathon_id}/coordinators/{coordinator_id}", tags=["organizer"])
def delete_coordinator_credential(
    hackathon_id: int,
    coordinator_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Delete a student coordinator credential"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    credential = db.query(models.Credentials).filter(
        models.Credentials.id == coordinator_id,
        models.Credentials.hackathon_id == hackathon_id,
        models.Credentials.role == "coordinator"
    ).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Coordinator credential not found")
    
    db.delete(credential)
    db.commit()
    return {"message": "Coordinator credential deleted"}


# =============================================
# PHASE 1: ROUNDS & CRITERIA MANAGEMENT
# =============================================

@app.post("/api/me/hackathons/{hackathon_id}/rounds", response_model=schemas.RoundResponse, tags=["rounds"])
def create_round(
    hackathon_id: int,
    round_data: schemas.RoundCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Create a new evaluation round for a hackathon"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    new_round = models.Round(
        name=round_data.name,
        description=round_data.description,
        hackathon_id=hackathon_id
    )
    db.add(new_round)
    db.commit()
    db.refresh(new_round)
    return new_round


@app.get("/api/me/hackathons/{hackathon_id}/rounds", response_model=List[schemas.RoundResponse], tags=["rounds"])
def get_rounds(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin", "judge"))
):
    """Get all rounds for a hackathon"""
    rounds = db.query(models.Round).filter(
        models.Round.hackathon_id == hackathon_id
    ).all()
    return rounds


@app.put("/api/me/hackathons/{hackathon_id}/rounds/{round_id}", response_model=schemas.RoundResponse, tags=["rounds"])
def update_round(
    hackathon_id: int,
    round_id: int,
    round_data: schemas.RoundUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Update a round"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    round_obj = db.query(models.Round).filter(
        models.Round.id == round_id,
        models.Round.hackathon_id == hackathon_id
    ).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    if round_data.name:
        round_obj.name = round_data.name
    if round_data.description is not None:
        round_obj.description = round_data.description
    
    db.commit()
    db.refresh(round_obj)
    return round_obj


@app.delete("/api/me/hackathons/{hackathon_id}/rounds/{round_id}", tags=["rounds"])
def delete_round(
    hackathon_id: int,
    round_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Delete a round"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    round_obj = db.query(models.Round).filter(
        models.Round.id == round_id,
        models.Round.hackathon_id == hackathon_id
    ).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    db.delete(round_obj)
    db.commit()
    return {"message": "Round deleted"}


@app.post("/api/me/hackathons/{hackathon_id}/rounds/{round_id}/criteria", response_model=schemas.CriterionResponse, tags=["criteria"])
def create_criterion(
    hackathon_id: int,
    round_id: int,
    criterion_data: schemas.CriterionCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Add a criterion to a round"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    round_obj = db.query(models.Round).filter(
        models.Round.id == round_id,
        models.Round.hackathon_id == hackathon_id
    ).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    new_criterion = models.Criterion(
        name=criterion_data.name,
        max_points=criterion_data.max_points,
        round_id=round_id
    )
    db.add(new_criterion)
    db.commit()
    db.refresh(new_criterion)
    return new_criterion


@app.put("/api/me/hackathons/{hackathon_id}/criteria/{criterion_id}", response_model=schemas.CriterionResponse, tags=["criteria"])
def update_criterion(
    hackathon_id: int,
    criterion_id: int,
    criterion_data: schemas.CriterionUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Update a criterion"""
    criterion = db.query(models.Criterion).filter(
        models.Criterion.id == criterion_id
    ).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")
    
    # Verify hackathon access
    round_obj = db.query(models.Round).filter(
        models.Round.id == criterion.round_id,
        models.Round.hackathon_id == hackathon_id
    ).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Unauthorized")
    
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    if criterion_data.name:
        criterion.name = criterion_data.name
    if criterion_data.max_points is not None:
        criterion.max_points = criterion_data.max_points
    if criterion_data.description is not None:
        criterion.description = criterion_data.description
    if criterion_data.weight is not None:
        criterion.weight = criterion_data.weight
    
    db.commit()
    db.refresh(criterion)
    return criterion


@app.delete("/api/me/hackathons/{hackathon_id}/criteria/{criterion_id}", tags=["criteria"])
def delete_criterion(
    hackathon_id: int,
    criterion_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Delete a criterion"""
    criterion = db.query(models.Criterion).filter(
        models.Criterion.id == criterion_id
    ).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")
    
    # Verify hackathon access
    round_obj = db.query(models.Round).filter(
        models.Round.id == criterion.round_id,
        models.Round.hackathon_id == hackathon_id
    ).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Unauthorized")
    
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    db.delete(criterion)
    db.commit()
    return {"message": "Criterion deleted"}


# =============================================
# PHASE 2: JUDGE ASSIGNMENT MANAGEMENT
# =============================================

@app.post("/api/me/hackathons/{hackathon_id}/judge-assignments", response_model=schemas.JudgeAssignmentResponse, tags=["judge-assignments"])
def assign_judge_to_team(
    hackathon_id: int,
    assignment_data: schemas.JudgeAssignmentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Assign a judge to evaluate a team"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Verify judge exists and is assigned to hackathon
    judge = db.query(models.User).filter(models.User.id == assignment_data.judge_id).first()
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    
    # Verify team exists
    team = db.query(models.Team).filter(
        models.Team.id == assignment_data.team_id,
        models.Team.hackathon_id == hackathon_id
    ).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check for existing assignment
    existing = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.judge_id == assignment_data.judge_id,
        models.JudgeAssignment.team_id == assignment_data.team_id,
        models.JudgeAssignment.round_id == assignment_data.round_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Judge already assigned to this team")
    
    new_assignment = models.JudgeAssignment(
        hackathon_id=hackathon_id,
        judge_id=assignment_data.judge_id,
        team_id=assignment_data.team_id,
        round_id=assignment_data.round_id,
        status="pending"
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment


@app.get("/api/me/hackathons/{hackathon_id}/judge-assignments", response_model=List[schemas.JudgeAssignmentResponse], tags=["judge-assignments"])
def get_judge_assignments(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin", "judge"))
):
    """Get all judge assignments for a hackathon"""
    assignments = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.hackathon_id == hackathon_id
    ).all()
    return assignments


@app.put("/api/me/hackathons/{hackathon_id}/judge-assignments/{assignment_id}", response_model=schemas.JudgeAssignmentResponse, tags=["judge-assignments"])
def update_judge_assignment(
    hackathon_id: int,
    assignment_id: int,
    update_data: schemas.JudgeAssignmentUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin", "judge"))
):
    """Update judge assignment status"""
    assignment = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.id == assignment_id,
        models.JudgeAssignment.hackathon_id == hackathon_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if update_data.status:
        assignment.status = update_data.status
    if update_data.started_at:
        assignment.started_at = update_data.started_at
    if update_data.completed_at:
        assignment.completed_at = update_data.completed_at
    
    db.commit()
    db.refresh(assignment)
    return assignment


@app.delete("/api/me/hackathons/{hackathon_id}/judge-assignments/{assignment_id}", tags=["judge-assignments"])
def delete_judge_assignment(
    hackathon_id: int,
    assignment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Delete a judge assignment"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    assignment = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.id == assignment_id,
        models.JudgeAssignment.hackathon_id == hackathon_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}


# =============================================
# PHASE 3: LIVE ANALYTICS & DASHBOARD
# =============================================

@app.get("/api/me/hackathons/{hackathon_id}/analytics/live", response_model=schemas.LiveAnalyticsResponse, tags=["analytics"])
def get_live_analytics(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get live analytics for a hackathon"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Calculate analytics
    total_registered = db.query(models.Team).filter(
        models.Team.hackathon_id == hackathon_id
    ).count()
    
    projects_submitted = db.query(models.Project).filter(
        models.Project.hackathon_id == hackathon_id
    ).count()
    
    judges_assigned = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.hackathon_id == hackathon_id
    ).count()
    
    eval_started = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.hackathon_id == hackathon_id,
        models.JudgeAssignment.status == "evaluating"
    ).count()
    
    eval_completed = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.hackathon_id == hackathon_id,
        models.JudgeAssignment.status == "completed"
    ).count()
    
    # Get average scores
    avg_score_result = db.query(func.avg(models.Evaluation.score)).filter(
        models.Evaluation.judge_id.in_(
            db.query(models.JudgeAssignment.judge_id).filter(
                models.JudgeAssignment.hackathon_id == hackathon_id
            )
        )
    ).scalar()
    
    snapshot = schemas.AnalyticsSnapshot(
        total_registered=total_registered,
        teams_registered=total_registered,
        projects_submitted=projects_submitted,
        judges_assigned=judges_assigned,
        eval_started=eval_started,
        eval_completed=eval_completed,
        participants_count=total_registered * 4,  # Average team size estimation
        average_score=float(avg_score_result) if avg_score_result else 0.0
    )
    
    return schemas.LiveAnalyticsResponse(
        hackathon_id=hackathon_id,
        snapshot=snapshot,
        last_updated=datetime.now()
    )


@app.get("/api/me/hackathons/{hackathon_id}/analytics/progress", tags=["analytics"])
def get_progress_analytics(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get progress analytics for spreadsheet-like view"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    return {
        "total_teams": db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).count(),
        "projects_submitted": db.query(models.Project).filter(models.Project.hackathon_id == hackathon_id).count(),
        "judges_assigned": db.query(models.JudgeAssignment).filter(models.JudgeAssignment.hackathon_id == hackathon_id).count(),
        "evaluations_completed": db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.hackathon_id == hackathon_id,
            models.JudgeAssignment.status == "completed"
        ).count(),
        "avg_score": 0  # TODO: Calculate from evaluations
    }


# =============================================
# PHASE 4: COMMUNICATION & PARTICIPANTS
# =============================================

@app.get("/api/me/hackathons/{hackathon_id}/participants", tags=["participants"])
def get_participants(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get all participants/team registrations for a hackathon"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    teams = db.query(models.Team).filter(
        models.Team.hackathon_id == hackathon_id
    ).all()
    
    participants_list = []
    for team in teams:
        for member in team.members:
            participants_list.append({
                "id": member.get("id"),
                "email": member.get("email"),
                "full_name": member.get("name"),
                "team_id": team.id,
                "team_name": team.name,
                "status": "registered",
                "registered_at": team.created_at
            })
    
    return participants_list


@app.post("/api/me/hackathons/{hackathon_id}/send-email", tags=["communication"])
def send_email_to_participants(
    hackathon_id: int,
    email_data: schemas.AnnouncementSendEmailRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Send bulk email to participants, judges, or coordinators"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    recipients = []
    
    if email_data.audience in ["all", "judges"]:
        judges = db.query(models.Credentials).filter(
            models.Credentials.hackathon_id == hackathon_id,
            models.Credentials.role == "judge"
        ).all()
        recipients.extend([j.username for j in judges])
    
    if email_data.audience in ["all", "coordinators"]:
        coordinators = db.query(models.Credentials).filter(
            models.Credentials.hackathon_id == hackathon_id,
            models.Credentials.role == "coordinator"
        ).all()
        recipients.extend([c.username for c in coordinators])
    
    if email_data.audience in ["all", "participants"]:
        teams = db.query(models.Team).filter(
            models.Team.hackathon_id == hackathon_id
        ).all()
        for team in teams:
            for member in team.members:
                recipients.append(member.get("email"))
    
    # Send emails
    try:
        mail_service.send_bulk_email(recipients, email_data.subject, email_data.body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send emails: {str(e)}")
    
    return {"message": f"Emails sent to {len(recipients)} recipients", "count": len(recipients)}


@app.get("/api/me/hackathons/{hackathon_id}/export/participants", tags=["participants"])
def export_participants_csv(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Export participants as CSV data"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    teams = db.query(models.Team).filter(
        models.Team.hackathon_id == hackathon_id
    ).all()
    
    csv_data = "Team Name,Member Name,Member Email,Member Status\n"
    for team in teams:
        for member in team.members:
            csv_data += f'{team.name},{member.get("name")},{member.get("email")},registered\n'
    
    return {"csv": csv_data}


# =============================================
# CORS MIDDLEWARE - Add LAST so it executes FIRST
# =============================================
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"[REQ] {request.method} {request.url.path} - Origin: {request.headers.get('origin', 'NONE')}")
        response = await call_next(request)
        return response

app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Add production URLs here when ready
        # "https://evalence.example.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "Access-Control-Allow-Headers"
    ],
    expose_headers=["Content-Length", "Content-Range"],
    max_age=600,  # Cache preflight for 10 minutes
)

# =============================================
# STARTUP
# =============================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
