from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

# Security Configurations
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "super-secret-evalence-key-change-in-production":
    raise ValueError("❌ CRITICAL: SECRET_KEY must be set in .env file and be unique!")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Verify a plain text password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Hash a password for storage."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token with optional expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ============================================================
# JUDGE-SPECIFIC AUTHORIZATION
# ============================================================

def is_judge_role(user):
    """
    Check if user has judge role.
    
    Args:
        user: User object from database
    
    Returns:
        bool: True if user role is 'judge'
    """
    if not user:
        return False
    return str(user.role) == 'judge' or user.role == 'judge'


def verify_judge_assignment(judge_id: int, assignment_id: int, db):
    """
    Verify that a judge owns an assignment.
    
    Args:
        judge_id: The judge ID
        assignment_id: The assignment ID
        db: Database session
    
    Returns:
        bool: True if judge owns this assignment
    """
    from models import JudgeAssignment
    
    assignment = db.query(JudgeAssignment).filter(
        JudgeAssignment.id == assignment_id,
        JudgeAssignment.judge_id == judge_id
    ).first()
    
    return assignment is not None


def verify_judge_can_evaluate_team(judge_id: int, team_id: int, hackathon_id: int, db):
    """
    Verify that a judge is assigned to evaluate a team.
    
    Args:
        judge_id: The judge ID
        team_id: The team ID
        hackathon_id: The hackathon ID
        db: Database session
    
    Returns:
        bool: True if judge can evaluate this team
    """
    from models import JudgeAssignment
    
    assignment = db.query(JudgeAssignment).filter(
        JudgeAssignment.judge_id == judge_id,
        JudgeAssignment.team_id == team_id,
        JudgeAssignment.hackathon_id == hackathon_id
    ).first()
    
    return assignment is not None
