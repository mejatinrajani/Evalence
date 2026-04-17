from fastapi import FastAPI, Depends, HTTPException, status, Query, WebSocket, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta, datetime
import uvicorn
from typing import List, Optional, Dict
import math
import threading
import time
import os
import random
import string
import json
import logging
import sys
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Configure Python logging - logs go to both console and file
logging.basicConfig(
    level=logging.WARNING,
    format='%(levelname)-8s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Console output
        logging.FileHandler('backend.log', encoding='utf-8')  # File output
    ]
)
logger = logging.getLogger(__name__)

import database
import models
import schemas
import security
from mail_service import EmailService
from services.evaluation_service import EvaluationService
from services.import_service import ParticipantImporter
from services.websocket_manager import ws_manager
from services.results_service import ResultsCalculator

app = FastAPI(title="Evalence API", version="2.0.0", description="Professional Hackathon Management Platform")

# Create DB tables on app startup in a background thread (non-blocking)
def init_database():
    """Initialize database tables in background to avoid blocking startup"""
    time.sleep(1)  # Brief delay to let server start
    try:
        # Ensure all model modules are imported so their tables are registered in metadata
        import models
        import models_admin
        import models_feedback
        
        # Create all tables
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"Database error: {str(e)[:150]}")

@app.on_event("startup")
def startup_event():
    # Start database initialization in background thread (non-blocking)
    db_thread = threading.Thread(target=init_database, daemon=True)
    db_thread.start()

# Setup CORS for the React Frontend (MUST be added as the LAST middleware to execute FIRST)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# =============================================
# DEPENDENCIES
# =============================================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    """Extract and validate JWT token, return current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode JWT token
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            raise credentials_exception
        
        # Query user from database
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise credentials_exception
        
        return user
        
    except security.JWTError:
        raise credentials_exception
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise credentials_exception

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
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "detail": "Internal server error",
            "path": str(request.url.path)
        }
    )

# Add RequestValidationError handler for better debugging
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors with detailed logging."""
    errors = exc.errors()
    logger.error(f"🔴 [Validation Error] Path: {request.url.path}")
    logger.error(f"🔴 [Validation Error] Method: {request.method}")
    logger.error(f"🔴 [Validation Error] Errors: {errors}")
    
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "status_code": 422,
            "detail": "Validation error",
            "errors": errors,
            "path": str(request.url.path)
        }
    )

@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle FastAPI RequestValidationError with detailed logging."""
    errors = exc.errors()
    logger.error(f"🔴 [Request Validation Error] Path: {request.url.path}")
    logger.error(f"🔴 [Request Validation Error] Method: {request.method}")
    logger.error(f"🔴 [Request Validation Error] Errors: {errors}")
    
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "status_code": 422,
            "detail": "Request validation error",
            "errors": errors,
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
        
        # Hash password and create user
        hashed_pwd = security.get_password_hash(user.password)
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
            # Don't fail registration if email fails
            pass
        
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

@app.post("/api/auth/token", tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    """Login user and return access and refresh tokens."""
    try:
        # Query user by email (OAuth2PasswordRequestForm uses 'username' field)
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password
        if not security.verify_password(form_data.password, user.hashed_password):
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
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

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
        logger.error(f"Token refresh error: {str(e)}")
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
            db.add(models.Criteria(name=criteria_data.name, weight=25, round_id=new_round.id))

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
    """Get all teams available for judge to evaluate with criteria from database."""
    # Get hackathons where judge is assigned
    judge_hackathons = db.query(models.Hackathon).join(
        models.HackathonJudge,
        models.Hackathon.id == models.HackathonJudge.hackathon_id
    ).filter(
        models.HackathonJudge.judge_id == current_user.id
    ).all()
    
    queue = []
    for h in judge_hackathons:
        for t in h.teams:
            for r in h.rounds:
                # Check if judge has already evaluated this team/round combo
                existing_eval = db.query(models.Evaluation).filter(
                    models.Evaluation.judge_id == current_user.id,
                    models.Evaluation.team_id == t.id,
                    models.Evaluation.round_id == r.id
                ).first()
                
                # Build criteria list with full details
                criteria_list = []
                score_dict = {}
                if existing_eval and existing_eval.scores:
                    score_dict = {s.criteria_id: s for s in existing_eval.scores}
                
                for c in r.criteria:
                    existing_score = score_dict.get(c.id)
                    criteria_list.append({
                        "id": c.id,
                        "criterion_id": c.id,
                        "name": c.name,
                        "criterion_name": c.name,
                        "description": c.description or "",
                        "weight": c.weight,
                        "max_points": 100,
                        "current_score": existing_score.score if existing_score else None,
                        "feedback": existing_score.comment if existing_score else None
                    })
                
                queue.append({
                    "evaluation_id": existing_eval.id if existing_eval else None,
                    "team_id": t.id,
                    "team_name": t.name,
                    "hackathon_id": h.id,
                    "hackathon_name": h.name,
                    "round_id": r.id,
                    "round_name": r.name,
                    "status": existing_eval.status if existing_eval else "pending",
                    "criteria": criteria_list
                })
    return queue

@app.post("/api/evaluations", status_code=status.HTTP_201_CREATED, tags=["judging"])
def submit_evaluation(
    evaluation: schemas.EvaluationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    # Get team, round, and hackathon info
    team = db.query(models.Team).filter(models.Team.id == evaluation.team_id).first()
    round_obj = db.query(models.Round).filter(models.Round.id == evaluation.round_id).first()
    hackathon = db.query(models.Hackathon).filter(models.Hackathon.id == round_obj.hackathon_id).first() if round_obj else None
    
    if not team or not round_obj or not hackathon:
        raise HTTPException(status_code=404, detail="Team, round, or hackathon not found")
    
    # Check for existing evaluation (upsert)
    existing = db.query(models.Evaluation).filter(
        models.Evaluation.judge_id == current_user.id,
        models.Evaluation.team_id == evaluation.team_id,
        models.Evaluation.round_id == evaluation.round_id
    ).first()
    
    if existing:
        # Delete existing scores and update status
        existing.status = "in_progress"
        db.query(models.EvaluationScore).filter(models.EvaluationScore.evaluation_id == existing.id).delete()
        eval_obj = existing
    else:
        # Create new evaluation
        eval_obj = models.Evaluation(
            judge_id=current_user.id,
            team_id=evaluation.team_id,
            round_id=evaluation.round_id,
            hackathon_id=hackathon.id,
            status="in_progress",
            feedback=evaluation.feedback
        )
        db.add(eval_obj)
        db.flush()
    
    # Add scores for each criterion
    for score_data in evaluation.scores:
        score_obj = models.EvaluationScore(
            evaluation_id=eval_obj.id,
            criteria_id=score_data.criteria_id,
            score=score_data.score,
            comment=score_data.comment
        )
        db.add(score_obj)
    
    eval_obj.status = "completed"
    eval_obj.feedback = evaluation.feedback
    db.commit()
    db.refresh(eval_obj)
    
    # Send completion email
    try:
        avg_score = sum([s.score for s in eval_obj.scores]) / len(eval_obj.scores) if eval_obj.scores else 0
        EmailService.score_submitted_notification(
            current_user.email,
            current_user.full_name,
            team.name,
            hackathon.name,
            avg_score,
            100
        )
    except Exception as e:
        logger.error(f"Email notification failed: {e}")
    
    return {"message": "Evaluation submitted successfully", "evaluation_id": eval_obj.id}


# =============================================
# JUDGE PORTAL - NEW ENDPOINTS
# =============================================

@app.get("/api/judge/dashboard", tags=["judge-portal"])
def get_judge_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Get judge dashboard summary with assignment counts and progress."""
    try:
        # Get all judge assignments for current user
        assignments = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.judge_id == current_user.id
        ).all()
        
        if not assignments:
            return schemas.JudgeDashboardResponse(
                total_assigned=0,
                completed=0,
                pending=0,
                in_progress=0,
                completion_percentage=0.0,
                current_round=None,
                upcoming_rounds=[],
                recent_activity=[]
            )
        
        total_assigned = len(assignments)
        completed = sum(1 for a in assignments if a.status == "completed")
        pending = sum(1 for a in assignments if a.status == "pending")
        in_progress = sum(1 for a in assignments if a.status == "evaluating")
        
        completion_percentage = (completed / total_assigned * 100) if total_assigned > 0 else 0.0
        
        # Get current active round
        current_round = db.query(models.Round).order_by(models.Round.id.desc()).first()
        current_round_dict = None
        if current_round:
            current_round_dict = {
                "id": current_round.id,
                "name": current_round.name,
                "criteria_count": len(current_round.criteria)
            }
        
        # Get upcoming rounds (future rounds)
        upcoming_rounds = []
        all_rounds = db.query(models.Round).all()
        for r in all_rounds:
            if current_round is None or r.id > current_round.id:
                upcoming_rounds.append({
                    "id": r.id,
                    "name": r.name,
                    "criteria_count": len(r.criteria)
                })
        
        # Get recent activity
        recent_evals = db.query(models.Evaluation).filter(
            models.Evaluation.judge_id == current_user.id
        ).order_by(models.Evaluation.updated_at.desc()).limit(5).all()
        
        recent_activity = [
            {
                "type": "evaluation",
                "team_id": e.team_id,
                "team_name": e.team.name if e.team else "Unknown",
                "score": e.score,
                "timestamp": e.updated_at.isoformat() if e.updated_at else None
            }
            for e in recent_evals
        ]
        
        return schemas.JudgeDashboardResponse(
            total_assigned=total_assigned,
            completed=completed,
            pending=pending,
            in_progress=in_progress,
            completion_percentage=round(completion_percentage, 2),
            current_round=current_round_dict,
            upcoming_rounds=upcoming_rounds,
            recent_activity=recent_activity
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard: {str(e)}")


@app.get("/api/judge/evaluations/assigned", response_model=List[schemas.TeamQueueItemResponse], tags=["judge-portal"])
def get_assigned_teams(
    round_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Get list of teams assigned to judge with pagination and filtering."""
    try:
        query = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.judge_id == current_user.id
        )
        
        # Filter by round if specified
        if round_id:
            query = query.filter(models.JudgeAssignment.round_id == round_id)
        
        # Filter by status if specified
        if status:
            query = query.filter(models.JudgeAssignment.status == status)
        
        assignments = query.offset(skip).limit(limit).all()
        
        result = []
        for assignment in assignments:
            team = assignment.team
            hackathon = assignment.hackathon
            round_obj = assignment.round
            project = db.query(models.Project).filter(models.Project.team_id == team.id).first()
            
            # Count criteria
            criteria_count = len(round_obj.criteria) if round_obj else 0
            total_points = sum(c.max_points for c in round_obj.criteria) if round_obj else 0
            
            result.append(schemas.TeamQueueItemResponse(
                id=assignment.id,
                team_id=team.id,
                team_name=team.name,
                hackathon_id=hackathon.id,
                hackathon_name=hackathon.name,
                round_id=round_obj.id if round_obj else 0,
                round_name=round_obj.name if round_obj else "Unknown",
                status=assignment.status,
                assigned_at=assignment.assigned_at,
                started_at=assignment.started_at,
                completed_at=assignment.completed_at,
                members=team.members if hasattr(team, 'members') and team.members else [],
                project_title=project.title if project else None,
                project_description=project.description if project else None,
                criteria_count=criteria_count,
                total_possible_points=total_points
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assigned teams: {str(e)}")


@app.get("/api/judge/evaluations/assigned/{assignment_id}", response_model=schemas.TeamEvaluationDetailResponse, tags=["judge-portal"])
def get_team_evaluation_details(
    assignment_id: int,
    team_id: Optional[int] = None,
    round_id: Optional[int] = None,
    hackathon_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Get detailed information for evaluating a specific team with all criteria from the database."""
    try:
        team = None
        round_obj = None
        hackathon = None
        project = None
        
        # First try to fetch from JudgeAssignment
        assignment = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.id == assignment_id,
            models.JudgeAssignment.judge_id == current_user.id
        ).first()
        
        if assignment:
            team = assignment.team
            hackathon = assignment.hackathon
            round_obj = assignment.round
            project = db.query(models.Project).filter(models.Project.team_id == team.id).first()
        elif team_id and round_id and hackathon_id:
            # Fallback: use query parameters to fetch team/round/hackathon
            # Verify judge is assigned to this hackathon
            judge_hackathon = db.query(models.HackathonJudge).filter(
                models.HackathonJudge.judge_id == current_user.id,
                models.HackathonJudge.hackathon_id == hackathon_id
            ).first()
            
            if not judge_hackathon:
                raise HTTPException(status_code=403, detail="Not assigned to this hackathon")
            
            team = db.query(models.Team).filter(models.Team.id == team_id).first()
            hackathon = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
            round_obj = db.query(models.Round).filter(models.Round.id == round_id).first()
            project = db.query(models.Project).filter(models.Project.team_id == team_id).first()
            
            if not (team and hackathon and round_obj):
                raise HTTPException(status_code=404, detail="Team, hackathon, or round not found")
        else:
            raise HTTPException(status_code=404, detail="Assignment not found or access denied")
        
        # Get existing evaluations for this team/round combo
        existing_eval = db.query(models.Evaluation).filter(
            models.Evaluation.judge_id == current_user.id,
            models.Evaluation.team_id == team.id,
            models.Evaluation.round_id == round_obj.id if round_obj else None
        ).first() if round_obj else None
        
        # Build criteria list with current scores FROM DATABASE
        criteria_list = []
        score_dict = {}
        if existing_eval and existing_eval.scores:
            score_dict = {s.criteria_id: s for s in existing_eval.scores}
        
        if round_obj:
            for criterion in round_obj.criteria:
                existing_score = score_dict.get(criterion.id)
                criteria_list.append(schemas.CriterionEvaluationDetail(
                    criterion_id=criterion.id,
                    criterion_name=criterion.name,
                    max_points=100,  # Scores out of 100
                    current_score=existing_score.score if existing_score else None,
                    feedback=existing_score.comment if existing_score else None,
                    description=criterion.description or ""
                ))
        
        return schemas.TeamEvaluationDetailResponse(
            assignment_id=assignment_id if assignment else (assignment_id or 0),
            team_id=team.id,
            team_name=team.name,
            hackathon_id=hackathon.id,
            hackathon_name=hackathon.name,
            round_id=round_obj.id if round_obj else 0,
            round_name=round_obj.name if round_obj else "Unknown",
            project_title=project.title if project else None,
            project_description=project.description if project else None,
            demo_url=project.demo_url if project else None,
            github_url=project.github_url if project else None,
            tech_stack=project.tech_stack if project else None,
            members=team.members if hasattr(team, 'members') and team.members else [],
            criteria=criteria_list,
            status=assignment.status if assignment else "pending",
            assigned_at=assignment.assigned_at if assignment else None,
            started_at=assignment.started_at if assignment else None,
            completed_at=assignment.completed_at if assignment else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch evaluation details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch evaluation details: {str(e)}")


@app.post("/api/judge/evaluations/submit", status_code=status.HTTP_201_CREATED, tags=["judge-portal"])
def submit_team_evaluation(
    request: schemas.EvaluationSubmitRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Submit evaluation scores for a team."""
    logger.warning(f"📥 [Submit Evaluation] Received request: team_id={request.team_id}, round_id={request.round_id}, scores={request.scores}, feedback={request.feedback}")
    try:
        # Verify assignment exists and belongs to judge
        from services.evaluation import EvaluationService
        
        assignment = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.judge_id == current_user.id,
            models.JudgeAssignment.team_id == request.team_id,
            models.JudgeAssignment.round_id == request.round_id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Get round and validate scores
        round_obj = db.query(models.Round).filter(models.Round.id == request.round_id).first()
        if not round_obj:
            raise HTTPException(status_code=404, detail="Round not found")
        
        # Validate that all criteria are scored
        criteria_ids = {c.id for c in round_obj.criteria}
        submitted_ids = set(request.scores.keys())
        
        if submitted_ids != criteria_ids:
            missing = criteria_ids - submitted_ids
            raise HTTPException(status_code=400, detail=f"Missing scores for criteria: {missing}")
        
        # Validate each score
        for criterion in round_obj.criteria:
            score = request.scores.get(criterion.id)
            if score is None or score < 0 or score > 100:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid score for {criterion.name}: must be 0-100"
                )
        
        # Save evaluation with all scores at once
        existing_eval = db.query(models.Evaluation).filter(
            models.Evaluation.judge_id == current_user.id,
            models.Evaluation.team_id == request.team_id,
            models.Evaluation.round_id == request.round_id
        ).first()
        
        if existing_eval:
            # Delete and recreate scores
            db.query(models.EvaluationScore).filter(models.EvaluationScore.evaluation_id == existing_eval.id).delete()
            eval_obj = existing_eval
        else:
            # Create new evaluation
            eval_obj = models.Evaluation(
                judge_id=current_user.id,
                team_id=request.team_id,
                round_id=request.round_id,
                hackathon_id=round_obj.hackathon_id,
                status="in_progress"
            )
            db.add(eval_obj)
            db.flush()
        
        # Add all scores
        for criterion_id, score in request.scores.items():
            feedback = request.feedback.get(criterion_id) if request.feedback else None
            score_obj = models.EvaluationScore(
                evaluation_id=eval_obj.id,
                criteria_id=criterion_id,
                score=score,
                comment=feedback
            )
            db.add(score_obj)
        
        eval_obj.status = "completed"
        db.commit()
        
        # Update assignment status
        assignment.status = "completed"
        assignment.completed_at = datetime.now()
        db.commit()
        
        # Send confirmation email
        team = assignment.team
        hackathon = assignment.hackathon
        avg_score = sum(request.scores.values()) / len(request.scores) if request.scores else 0
        
        try:
            EmailService.score_submitted_notification(
                current_user.email,
                current_user.full_name,
                team.name,
                hackathon.name,
                avg_score,
                100
            )
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
        
        return {"message": "Evaluation submitted successfully", "assignment_id": assignment.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit evaluation: {str(e)}")


@app.put("/api/judge/evaluations/{assignment_id}", tags=["judge-portal"])
def update_evaluation(
    assignment_id: int,
    request: schemas.EvaluationUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Update an existing evaluation (only if not finalized)."""
    try:
        assignment = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.id == assignment_id,
            models.JudgeAssignment.judge_id == current_user.id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        if assignment.status == "finalized":
            raise HTTPException(status_code=403, detail="Cannot edit finalized evaluation")
        
        # Get round for validation
        round_obj = assignment.round
        if not round_obj:
            raise HTTPException(status_code=404, detail="Round not found")
        
        # Validate scores
        for criterion_id, score in request.scores.items():
            criterion = next((c for c in round_obj.criteria if c.id == criterion_id), None)
            if not criterion:
                raise HTTPException(status_code=400, detail=f"Invalid criterion: {criterion_id}")
            
            if score < 0 or score > 100:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid score for {criterion.name}: must be 0-100"
                )
        
        # Update evaluation with all scores
        existing_eval = db.query(models.Evaluation).filter(
            models.Evaluation.judge_id == current_user.id,
            models.Evaluation.team_id == assignment.team_id,
            models.Evaluation.round_id == assignment.round_id
        ).first()
        
        if existing_eval:
            # Delete and recreate scores
            db.query(models.EvaluationScore).filter(models.EvaluationScore.evaluation_id == existing_eval.id).delete()
            eval_obj = existing_eval
        else:
            # Create new evaluation
            eval_obj = models.Evaluation(
                judge_id=current_user.id,
                team_id=assignment.team_id,
                round_id=assignment.round_id,
                hackathon_id=assignment.hackathon_id,
                status="in_progress"
            )
            db.add(eval_obj)
            db.flush()
        
        # Add all scores
        for criterion_id, score in request.scores.items():
            feedback = request.feedback.get(criterion_id) if request.feedback else None
            score_obj = models.EvaluationScore(
                evaluation_id=eval_obj.id,
                criteria_id=criterion_id,
                score=score,
                comment=feedback
            )
            db.add(score_obj)
        
        eval_obj.status = "completed"
        db.commit()
        
        return {"message": "Evaluation updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update evaluation: {str(e)}")


@app.get("/api/judge/evaluations/history", response_model=List[schemas.EvaluationHistoryItemResponse], tags=["judge-portal"])
def get_evaluation_history(
    hackathon_id: Optional[int] = None,
    round_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Get judge's past evaluations with optional filtering."""
    try:
        query = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.judge_id == current_user.id,
            models.JudgeAssignment.status == "completed"
        )
        
        if hackathon_id:
            query = query.filter(models.JudgeAssignment.hackathon_id == hackathon_id)
        
        if round_id:
            query = query.filter(models.JudgeAssignment.round_id == round_id)
        
        assignments = query.order_by(models.JudgeAssignment.completed_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for assignment in assignments:
            team = assignment.team
            hackathon = assignment.hackathon
            round_obj = assignment.round
            
            # Calculate total and average score for this evaluation
            evals = db.query(models.Evaluation).filter(
                models.Evaluation.judge_id == current_user.id,
                models.Evaluation.team_id == team.id
            ).all()
            
            total_score = sum(e.score for e in evals) if evals else 0
            average_score = (total_score / len(evals)) if evals else 0
            
            result.append(schemas.EvaluationHistoryItemResponse(
                id=assignment.id,
                team_id=team.id,
                team_name=team.name,
                hackathon_id=hackathon.id,
                hackathon_name=hackathon.name,
                round_id=round_obj.id if round_obj else 0,
                round_name=round_obj.name if round_obj else "Unknown",
                criteria_count=len(evals),
                total_score=float(total_score),
                average_score=float(average_score),
                created_at=assignment.assigned_at,
                updated_at=assignment.completed_at
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch evaluation history: {str(e)}")


@app.get("/api/judge/progress", response_model=schemas.JudgeProgressResponse, tags=["judge-portal"])
def get_judge_progress(
    hackathon_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Get judge's evaluation progress and performance statistics."""
    try:
        from services.evaluation import EvaluationService
        
        # Get all assignments
        query = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.judge_id == current_user.id
        )
        
        if hackathon_id:
            query = query.filter(models.JudgeAssignment.hackathon_id == hackathon_id)
        
        assignments = query.all()
        
        completed_assignments = [a for a in assignments if a.status == "completed"]
        pending_assignments = [a for a in assignments if a.status == "pending"]
        
        # Get all evaluations for this judge
        evals = db.query(models.Evaluation).filter(
            models.Evaluation.judge_id == current_user.id
        ).all()
        
        if hackathon_id:
            hackathon = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
            if hackathon:
                team_ids = {t.id for t in hackathon.teams}
                evals = [e for e in evals if e.team_id in team_ids]
        
        # Calculate statistics
        total_evaluations = len(evals)
        completed_count = len(completed_assignments)
        pending_count = len(pending_assignments)
        
        # Average score calculation
        average_score = (sum(e.score for e in evals) / len(evals)) if evals else 0.0
        
        # Score distribution (count by grade)
        eval_service = EvaluationService()
        score_distribution = {
            "A": 0, "B": 0, "C": 0, "D": 0, "F": 0
        }
        
        for eval_obj in evals:
            # Calculate percentage based on criterion max points
            if eval_obj.criterion and eval_obj.criterion.max_points > 0:
                percentage = (eval_obj.score / eval_obj.criterion.max_points * 100)
                grade = eval_service.convert_score_to_grade(percentage)
                score_distribution[grade] = score_distribution.get(grade, 0) + 1
        
        # Get top and lowest performing criteria
        criteria_scores = {}
        for eval_obj in evals:
            if eval_obj.criterion:
                crit_id = eval_obj.criterion.id
                crit_name = eval_obj.criterion.name
                if crit_id not in criteria_scores:
                    criteria_scores[crit_id] = {"name": crit_name, "scores": [], "max_points": eval_obj.criterion.max_points}
                criteria_scores[crit_id]["scores"].append(eval_obj.score)
        
        criteria_stats = []
        for crit_id, data in criteria_scores.items():
            avg = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
            percentage = (avg / data["max_points"] * 100) if data["max_points"] > 0 else 0
            criteria_stats.append({
                "criterion_id": crit_id,
                "name": data["name"],
                "average_score": round(avg, 2),
                "percentage": round(percentage, 2),
                "count": len(data["scores"])
            })
        
        # Sort by percentage
        top_criteria = sorted(criteria_stats, key=lambda x: x["percentage"], reverse=True)[:3]
        lowest_criteria = sorted(criteria_stats, key=lambda x: x["percentage"])[:3]
        
        # Completion trend (by day in last 7 days)
        from datetime import timedelta
        trend = []
        for i in range(7):
            day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            day_next = day + timedelta(days=1)
            count = len([a for a in completed_assignments if a.completed_at and day <= a.completed_at < day_next])
            trend.append({
                "date": day.strftime("%Y-%m-%d"),
                "completed": count
            })
        
        return schemas.JudgeProgressResponse(
            total_evaluations=total_evaluations,
            completed_evaluations=completed_count,
            pending_evaluations=pending_count,
            average_score=round(average_score, 2),
            score_distribution=score_distribution,
            top_performing_criteria=top_criteria,
            lowest_performing_criteria=lowest_criteria,
            completion_trend=trend
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch progress: {str(e)}")

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
    
    new_criterion = models.Criteria(
        name=criterion_data.name,
        weight=criterion_data.weight if hasattr(criterion_data, 'weight') else 10,
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
    criterion = db.query(models.Criteria).filter(
        models.Criteria.id == criterion_id
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
    if criterion_data.weight is not None:
        criterion.weight = criterion_data.weight
    if criterion_data.description is not None:
        criterion.description = criterion_data.description
    
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
    criterion = db.query(models.Criteria).filter(
        models.Criteria.id == criterion_id
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
# MIDDLEWARE SETUP - CORS & LOGGING
# =============================================
class LoggingMiddleware(BaseHTTPMiddleware):
    """Log only successful routes (ok) and errors."""
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        try:
            response = await call_next(request)
            # Log successful responses (status < 400) as 'ok'
            if response.status_code < 400:
                print(f"ok | {method} {path}")
            else:
                # Log client/server errors with status code
                print(f"error | {method} {path} (Status: {response.status_code})")
            return response
        except Exception as e:
            # Log errors
            logger.error(f"Route error: {method} {path} - {type(e).__name__}: {str(e)}")
            raise

# Add middleware in correct order (FIFO for registration, LIFO for execution)
# This ensures CORS headers are set first, then logging middleware sees everything
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite default
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",      # Common dev port
        "http://127.0.0.1:3000",
        "http://localhost:8080",      # Fallback
        "http://127.0.0.1:8080",
        # Add production URLs here when deployed
        # "https://evalence.example.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS preflight
    allow_headers=["*"],  # Allow all headers
    expose_headers=[
        "Content-Type",
        "Content-Length",
        "Content-Range",
        "X-Total-Count",
        "X-Page-Number",
    ],
    max_age=3600,  # Cache CORS preflight for 1 hour
)

# Add logging middleware LAST so it wraps everything (executes first in the chain)
app.add_middleware(LoggingMiddleware)

# =============================================
# TEAM FEEDBACK & COMMENTS SYSTEM
# =============================================

@app.post("/api/evaluations/{evaluation_id}/feedback", status_code=status.HTTP_201_CREATED, tags=["feedback"])
def add_evaluation_feedback(
    evaluation_id: int,
    feedback: schemas.EvaluationFeedbackCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("judge", "super_admin"))
):
    """Add detailed feedback/comments to an evaluation"""
    eval_obj = db.query(models.Evaluation).filter(
        models.Evaluation.id == evaluation_id,
        models.Evaluation.judge_id == current_user.id
    ).first()
    if not eval_obj:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    eval_obj.detailed_feedback = feedback.feedback
    eval_obj.suggestions = feedback.suggestions
    db.commit()
    db.refresh(eval_obj)
    return {"message": "Feedback added successfully", "evaluation_id": eval_obj.id}


@app.get("/api/teams/{team_id}/feedback", tags=["feedback"])
def get_team_feedback(
    team_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all feedback for a team from all judges"""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    evals = db.query(models.Evaluation).filter(
        models.Evaluation.team_id == team_id
    ).all()
    
    feedback_list = [
        {
            "judge_name": e.judge.full_name if e.judge else "Unknown",
            "round": e.round.name if e.round else "Unknown",
            "score": e.score,
            "detailed_feedback": e.detailed_feedback,
            "suggestions": e.suggestions,
            "submitted_at": e.updated_at
        }
        for e in evals
    ]
    
    return {"team_id": team_id, "team_name": team.name, "feedback": feedback_list}


# =============================================
# RESULTS EXPORT SYSTEM
# =============================================

@app.get("/api/me/hackathons/{hackathon_id}/results/export", tags=["results"])
def export_results(
    hackathon_id: int,
    format: str = "json",
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Export hackathon results in JSON or CSV format"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Get teams and their scores
    teams = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    results = []
    
    for team in teams:
        evals = db.query(models.Evaluation).filter(models.Evaluation.team_id == team.id).all()
        avg_score = (sum(e.score for e in evals) / len(evals)) if evals else 0
        
        project = db.query(models.Project).filter(models.Project.team_id == team.id).first()
        
        results.append({
            "rank": 0,  # Will be set after sorting
            "team_id": team.id,
            "team_name": team.name,
            "members": team.members,
            "project_title": project.title if project else None,
            "project_url": project.github_url if project else None,
            "demo_url": project.demo_url if project else None,
            "average_score": round(avg_score, 2),
            "evaluation_count": len(evals),
            "tech_stack": project.tech_stack if project else None
        })
    
    # Sort by score
    results.sort(key=lambda x: x["average_score"], reverse=True)
    
    # Add ranks
    for idx, result in enumerate(results):
        result["rank"] = idx + 1
    
    if format == "csv":
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=["rank", "team_name", "average_score", "project_title", "members_count"])
        writer.writeheader()
        
        for r in results:
            writer.writerow({
                "rank": r["rank"],
                "team_name": r["team_name"],
                "average_score": r["average_score"],
                "project_title": r["project_title"] or "N/A",
                "members_count": len(r["members"]) if r["members"] else 0
            })
        
        return {"csv": output.getvalue()}
    
    return {"format": "json", "results": results, "exported_at": datetime.now().isoformat()}


# =============================================
# APPEAL SYSTEM
# =============================================

@app.post("/api/teams/{team_id}/appeals", status_code=status.HTTP_201_CREATED, tags=["appeals"])
def submit_score_appeal(
    team_id: int,
    appeal: schemas.ScoreAppealCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit an appeal for score review"""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is a team member (simplified check)
    # In production, verify team membership from team.members array
    
    appeal_obj = models.ScoreAppeal(
        team_id=team_id,
        evaluation_id=appeal.evaluation_id,
        reason=appeal.reason,
        status="pending",
        submitted_by=current_user.id
    )
    
    db.add(appeal_obj)
    db.commit()
    db.refresh(appeal_obj)
    
    return {
        "appeal_id": appeal_obj.id,
        "status": "pending",
        "message": "Appeal submitted successfully. The organizer will review it shortly.",
        "submitted_at": appeal_obj.created_at
    }


@app.get("/api/me/hackathons/{hackathon_id}/appeals", response_model=List[dict], tags=["appeals"])
def get_appeals(
    hackathon_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get all appeals for a hackathon"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    query = db.query(models.ScoreAppeal).join(
        models.Team, models.ScoreAppeal.team_id == models.Team.id
    ).filter(models.Team.hackathon_id == hackathon_id)
    
    if status_filter:
        query = query.filter(models.ScoreAppeal.status == status_filter)
    
    appeals = query.all()
    
    return [
        {
            "appeal_id": a.id,
            "team_id": a.team_id,
            "team_name": a.team.name,
            "reason": a.reason,
            "status": a.status,
            "submitted_at": a.created_at,
            "review_notes": a.review_notes
        }
        for a in appeals
    ]


@app.put("/api/me/appeals/{appeal_id}/review", tags=["appeals"])
def review_appeal(
    appeal_id: int,
    review: schemas.AppealReviewRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Review and approve/reject an appeal"""
    appeal_obj = db.query(models.ScoreAppeal).filter(models.ScoreAppeal.id == appeal_id).first()
    if not appeal_obj:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    appeal_obj.status = review.status  # "approved" or "rejected"
    appeal_obj.review_notes = review.review_notes
    appeal_obj.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(appeal_obj)
    
    return {"message": f"Appeal {review.status}", "appeal_id": appeal_obj.id}


# =============================================
# JUDGE PERFORMANCE ANALYTICS
# =============================================

@app.get("/api/me/hackathons/{hackathon_id}/judge-performance", tags=["analytics"])
def get_judge_performance(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get performance metrics for all judges"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Get all judge assignments
    assignments = db.query(models.JudgeAssignment).filter(
        models.JudgeAssignment.hackathon_id == hackathon_id
    ).all()
    
    # Group by judge
    judge_stats = {}
    for assignment in assignments:
        judge_id = assignment.judge_id
        if judge_id not in judge_stats:
            judge_stats[judge_id] = {
                "judge_id": judge_id,
                "total_assigned": 0,
                "completed": 0,
                "in_progress": 0,
                "pending": 0,
                "avg_completion_time": 0,
                "consistency_score": 0
            }
        
        judge_stats[judge_id]["total_assigned"] += 1
        
        if assignment.status == "completed":
            judge_stats[judge_id]["completed"] += 1
            if assignment.started_at and assignment.completed_at:
                duration = (assignment.completed_at - assignment.started_at).total_seconds() / 3600
                judge_stats[judge_id]["avg_completion_time"] += duration
        elif assignment.status == "evaluating":
            judge_stats[judge_id]["in_progress"] += 1
        else:
            judge_stats[judge_id]["pending"] += 1
    
    # Calculate final metrics
    for judge_id, stats in judge_stats.items():
        if stats["completed"] > 0:
            stats["avg_completion_time"] = stats["avg_completion_time"] / stats["completed"]
        
        # Get judge's evaluations for consistency
        evals = db.query(models.Evaluation).filter(
            models.Evaluation.judge_id == judge_id
        ).all()
        
        if evals:
            scores = [e.score for e in evals]
            mean_score = sum(scores) / len(scores)
            variance = sum((x - mean_score) ** 2 for x in scores) / len(scores)
            std_dev = math.sqrt(variance)
            
            # Consistency score: higher is better (lower variance)
            # Normalize to 0-100 scale
            stats["consistency_score"] = round(max(0, 100 - (std_dev / 50 * 100)), 2)
    
    return {
        "hackathon_id": hackathon_id,
        "judges": list(judge_stats.values()),
        "total_judges": len(judge_stats)
    }


# =============================================
# REAL-TIME NOTIFICATIONS
# =============================================

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time notifications"""
    try:
        await websocket.accept()
        # Add user to notification manager
        ws_manager.connect(user_id, websocket)
        
        while True:
            data = await websocket.receive_text()
            # Echo back or handle specific commands
            await websocket.send_json({"type": "echo", "data": data})
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(user_id)


@app.post("/api/notifications/send", tags=["notifications"])
async def send_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Send notification to specific users"""
    try:
        # Broadcast to WebSocket clients
        for user_id in notification.recipient_ids:
            await ws_manager.broadcast(user_id, {
                "type": "notification",
                "title": notification.title,
                "message": notification.message,
                "sent_at": datetime.now().isoformat()
            })
        
        return {"message": f"Notification sent to {len(notification.recipient_ids)} users"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")


# =============================================
# TEAM PROGRESS TRACKING
# =============================================

@app.get("/api/me/hackathons/{hackathon_id}/team-progress", tags=["tracking"])
def get_team_progress(
    hackathon_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Get submission and evaluation progress for all teams"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    teams = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    
    progress_list = []
    for team in teams:
        # Check project submission
        project = db.query(models.Project).filter(models.Project.team_id == team.id).first()
        project_submitted = project is not None
        
        # Check evaluation progress
        assignments = db.query(models.JudgeAssignment).filter(
            models.JudgeAssignment.team_id == team.id,
            models.JudgeAssignment.hackathon_id == hackathon_id
        ).all()
        
        total_evaluations = len(assignments)
        completed_evaluations = sum(1 for a in assignments if a.status == "completed")
        
        progress_list.append({
            "team_id": team.id,
            "team_name": team.name,
            "members_count": len(team.members) if team.members else 0,
            "project_submitted": project_submitted,
            "project_title": project.title if project else None,
            "total_judges_assigned": total_evaluations,
            "evaluations_completed": completed_evaluations,
            "evaluation_progress": round((completed_evaluations / total_evaluations * 100) if total_evaluations > 0 else 0, 2)
        })
    
    return {
        "hackathon_id": hackathon_id,
        "total_teams": len(teams),
        "teams": sorted(progress_list, key=lambda x: x["evaluation_progress"], reverse=True)
    }


# =============================================
# INTELLIGENT JUDGE AUTO-ASSIGNMENT
# =============================================

@app.post("/api/me/hackathons/{hackathon_id}/auto-assign-judges", tags=["judge-assignments"])
def auto_assign_judges(
    hackathon_id: int,
    config: schemas.JudgeAutoAssignConfig,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role("mentor", "super_admin"))
):
    """Automatically assign judges to teams based on balanced workload"""
    h = db.query(models.Hackathon).filter(
        models.Hackathon.id == hackathon_id,
        models.Hackathon.mentor_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
    
    # Get all judges and teams
    judges = db.query(models.User).filter(models.User.role == "judge").all()
    teams = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).all()
    rounds = db.query(models.Round).filter(models.Round.hackathon_id == hackathon_id).all()
    
    if not judges or not teams or not rounds:
        raise HTTPException(status_code=400, detail="Not all required data available (judges, teams, rounds)")
    
    # Simple round-robin assignment
    assignments_created = 0
    for round_obj in rounds:
        judge_workload = {judge.id: 0 for judge in judges}
        
        for team in teams:
            # Find judge with least workload
            lightest_judge_id = min(judge_workload, key=judge_workload.get)
            
            # Check if assignment already exists
            existing = db.query(models.JudgeAssignment).filter(
                models.JudgeAssignment.judge_id == lightest_judge_id,
                models.JudgeAssignment.team_id == team.id,
                models.JudgeAssignment.round_id == round_obj.id
            ).first()
            
            if not existing:
                new_assignment = models.JudgeAssignment(
                    hackathon_id=hackathon_id,
                    judge_id=lightest_judge_id,
                    team_id=team.id,
                    round_id=round_obj.id,
                    status="pending"
                )
                db.add(new_assignment)
                judge_workload[lightest_judge_id] += 1
                assignments_created += 1
    
    db.commit()
    
    return {
        "message": "Auto-assignment completed",
        "assignments_created": assignments_created,
        "total_judges": len(judges),
        "total_teams": len(teams),
        "rounds_processed": len(rounds)
    }


# =============================================
# PHASE 1: TEAM SUBMISSION PORTAL
# =============================================

@app.get("/api/projects/my-submission", tags=["team-submission"])
def get_team_submission(
    hackathon_id: int,
    current_user: models.User = Depends(require_role("participant")),
    db: Session = Depends(database.get_db)
):
    """Get team's project submission for a hackathon"""
    try:
        # Find team for current user
        team_reg = db.query(models.ParticipantRegistration).filter(
            and_(
                models.ParticipantRegistration.user_id == current_user.id,
                models.ParticipantRegistration.hackathon_id == hackathon_id
            )
        ).first()
        
        if not team_reg or not team_reg.team_id:
            raise HTTPException(status_code=404, detail="Team not found for this user")
        
        project = db.query(models.Project).filter(
            and_(
                models.Project.hackathon_id == hackathon_id,
                models.Project.team_id == team_reg.team_id
            )
        ).first()
        
        if not project:
            # Create empty draft
            project = models.Project(
                team_id=team_reg.team_id,
                hackathon_id=hackathon_id,
                title="Untitled Project",
                submission_status="draft"
            )
            db.add(project)
            db.commit()
        
        return {
            "id": project.id,
            "team_id": project.team_id,
            "hackathon_id": project.hackathon_id,
            "project_name": project.title,
            "description": project.description,
            "demo_url": project.demo_url,
            "github_url": project.github_url,
            "presentation_slide_url": project.presentation_slide_url,
            "tech_stack": project.tech_stack,
            "project_video_url": project.project_video_url,
            "submission_status": project.submission_status,
            "submitted_at": project.submitted_at,
            "created_at": project.created_at,
            "updated_at": project.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/submit", status_code=status.HTTP_201_CREATED, tags=["team-submission"])
def submit_project(
    request: schemas.ProjectSubmissionRequest,
    current_user: models.User = Depends(require_role("participant")),
    db: Session = Depends(database.get_db)
):
    """Submit or update project for evaluation"""
    try:
        # Find team for current user
        team_reg = db.query(models.ParticipantRegistration).filter(
            and_(
                models.ParticipantRegistration.user_id == current_user.id,
                models.ParticipantRegistration.hackathon_id == request.hackathon_id
            )
        ).first()
        
        if not team_reg or not team_reg.team_id:
            raise HTTPException(status_code=403, detail="You are not a member of any team in this hackathon")
        
        # Get or create project
        project = db.query(models.Project).filter(
            and_(
                models.Project.hackathon_id == request.hackathon_id,
                models.Project.team_id == team_reg.team_id
            )
        ).first()
        
        if not project:
            project = models.Project(
                team_id=team_reg.team_id,
                hackathon_id=request.hackathon_id,
                title="Untitled Project"
            )
            db.add(project)
        
        # Update fields
        project.title = request.project_name or project.title
        project.description = request.description or project.description
        project.demo_url = request.demo_url or project.demo_url
        project.github_url = request.github_url or project.github_url
        project.presentation_slide_url = request.presentation_slide_url or project.presentation_slide_url
        project.project_video_url = request.project_video_url or project.project_video_url
        project.tech_stack = request.tech_stack or project.tech_stack
        project.submission_status = "submitted"
        project.submitted_at = datetime.utcnow()
        
        db.commit()
        
        # Log submission
        log_entry = models.ProjectSubmissionLog(
            project_id=project.id,
            action="submitted",
            submitted_by_id=current_user.id,
            notes="Team submitted project for evaluation"
        )
        db.add(log_entry)
        db.commit()
        
        logger.info(f"Project {project.id} submitted by user {current_user.id}")
        
        return {
            "id": project.id,
            "team_id": project.team_id,
            "hackathon_id": project.hackathon_id,
            "project_name": project.title,
            "description": project.description,
            "demo_url": project.demo_url,
            "github_url": project.github_url,
            "presentation_slide_url": project.presentation_slide_url,
            "tech_stack": project.tech_stack,
            "project_video_url": project.project_video_url,
            "submission_status": project.submission_status,
            "submitted_at": project.submitted_at,
            "created_at": project.created_at,
            "updated_at": project.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# PHASE 1: JUDGE ASSIGNMENT
# =============================================

@app.get("/api/organizer/hackathons/{hackathon_id}/assignment-status", tags=["judge-assignment"])
def get_assignment_status(
    hackathon_id: int,
    current_user: models.User = Depends(require_role("mentor", "super_admin")),
    db: Session = Depends(database.get_db)
):
    """Get overview of judge assignments"""
    try:
        hackathon = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
        if not hackathon:
            raise HTTPException(status_code=404, detail="Hackathon not found")
        
        total_judges = db.query(func.count(models.JudgeAssignment.judge_id.distinct())).filter(
            models.JudgeAssignment.hackathon_id == hackathon_id
        ).scalar() or 0
        
        total_teams = db.query(func.count(models.Team.id)).filter(
            models.Team.hackathon_id == hackathon_id
        ).scalar() or 0
        
        assigned_teams = db.query(func.count(models.Team.id.distinct())).join(
            models.JudgeAssignment, models.JudgeAssignment.team_id == models.Team.id
        ).filter(
            models.Team.hackathon_id == hackathon_id,
            models.JudgeAssignment.hackathon_id == hackathon_id
        ).scalar() or 0
        
        conflicts = db.query(func.count(models.ConflictOfInterest.id)).filter(
            models.ConflictOfInterest.hackathon_id == hackathon_id
        ).scalar() or 0
        
        return {
            "total_judges": total_judges,
            "assigned_judges": total_judges,
            "unassigned_judges": 0,
            "total_teams": total_teams,
            "assigned_teams": assigned_teams,
            "unassigned_teams": total_teams - assigned_teams,
            "conflicts_detected": conflicts,
            "workload_imbalance": False
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assignment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# PHASE 1: ORGANIZER DASHBOARD
# =============================================

@app.get("/api/organizer/hackathons/{hackathon_id}/evaluation-progress", tags=["organizer-dashboard"])
def get_evaluation_progress(
    hackathon_id: int,
    current_user: models.User = Depends(require_role("mentor", "super_admin")),
    db: Session = Depends(database.get_db)
):
    """Get evaluation progress by round"""
    try:
        rounds = db.query(models.Round).filter(models.Round.hackathon_id == hackathon_id).all()
        
        progress = []
        for round_obj in rounds:
            total_teams = db.query(func.count(models.Team.id)).filter(
                models.Team.hackathon_id == hackathon_id
            ).scalar() or 1
            
            completed = db.query(func.count(models.Evaluation.id.distinct())).filter(
                and_(
                    models.Evaluation.round_id == round_obj.id,
                    models.Evaluation.status == "completed"
                )
            ).scalar() or 0
            
            in_progress = db.query(func.count(models.Evaluation.id.distinct())).filter(
                and_(
                    models.Evaluation.round_id == round_obj.id,
                    models.Evaluation.status == "in_progress"
                )
            ).scalar() or 0
            
            avg_score = db.query(func.avg(models.Evaluation.score)).filter(
                and_(
                    models.Evaluation.round_id == round_obj.id,
                    models.Evaluation.status == "completed"
                )
            ).scalar()
            
            progress.append({
                "round_id": round_obj.id,
                "round_name": round_obj.name,
                "total_teams": total_teams,
                "completed": completed,
                "in_progress": in_progress,
                "pending": total_teams - completed - in_progress,
                "completion_percent": round(100.0 * completed / total_teams, 2) if total_teams > 0 else 0,
                "avg_score": float(avg_score) if avg_score else None
            })
        
        return progress
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting evaluation progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# PHASE 1: RESULTS & LEADERBOARD
# =============================================

@app.get("/api/results/leaderboard", tags=["results"])
def get_leaderboard(
    hackathon_id: int,
    db: Session = Depends(database.get_db)
):
    """Get public leaderboard"""
    try:
        hackathon = db.query(models.Hackathon).filter(models.Hackathon.id == hackathon_id).first()
        if not hackathon:
            raise HTTPException(status_code=404, detail="Hackathon not found")
        
        if hackathon.status != "completed" and hackathon.status != "results":
            raise HTTPException(status_code=400, detail="Results not yet published")
        
        # Get teams with their scores
        teams_with_scores = db.query(
            models.Team.id,
            models.Team.name,
            func.avg(models.EvaluationScore.score).label("avg_score"),
            func.count(models.Evaluation.id.distinct()).label("evaluation_count")
        ).join(
            models.Evaluation, models.Evaluation.team_id == models.Team.id
        ).outerjoin(
            models.EvaluationScore, models.EvaluationScore.evaluation_id == models.Evaluation.id
        ).filter(
            models.Team.hackathon_id == hackathon_id,
            models.Evaluation.status == "completed"
        ).group_by(
            models.Team.id, models.Team.name
        ).order_by(
            func.avg(models.EvaluationScore.score).desc()
        ).all()
        
        leaderboard = []
        for rank, (team_id, team_name, avg_score, eval_count) in enumerate(teams_with_scores, 1):
            badge = None
            if rank == 1:
                badge = "gold"
            elif rank == 2:
                badge = "silver"
            elif rank == 3:
                badge = "bronze"
            
            leaderboard.append({
                "rank": rank,
                "team_id": team_id,
                "team_name": team_name,
                "final_score": float(avg_score or 0),
                "avg_score": float(avg_score or 0),
                "evaluations_received": eval_count or 0,
                "badge": badge
            })
        
        return {
            "hackathon_id": hackathon_id,
            "hackathon_name": hackathon.name,
            "published_at": datetime.utcnow(),
            "entries": leaderboard,
            "total_teams": len(leaderboard),
            "last_updated": datetime.utcnow()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/organizer/hackathons/{hackathon_id}/publish-results", tags=["results"])
def publish_results(
    hackathon_id: int,
    current_user: models.User = Depends(require_role("mentor", "super_admin")),
    db: Session = Depends(database.get_db)
):
    """Publish final results"""
    try:
        hackathon = db.query(models.Hackathon).filter(
            and_(
                models.Hackathon.id == hackathon_id,
                models.Hackathon.mentor_id == current_user.id
            )
        ).first()
        
        if not hackathon:
            raise HTTPException(status_code=404, detail="Hackathon not found or unauthorized")
        
        hackathon.status = "results"
        db.commit()
        
        teams_count = db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).count()
        
        logger.info(f"Results published for hackathon {hackathon_id}")
        return {
            "status": "published",
            "published_at": datetime.utcnow(),
            "team_count": teams_count,
            "hackathon_id": hackathon_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# STARTUP
# =============================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
