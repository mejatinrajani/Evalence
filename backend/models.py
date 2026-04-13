from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Text, JSON, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from database import Base


class RoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    mentor = "mentor"
    judge = "judge"
    participant = "participant"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.participant)
    bio = Column(Text, nullable=True)
    github_url = Column(String, nullable=True)
    skills = Column(JSON, nullable=True)  # ["React", "Python", "Rust"]
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    hackathons = relationship("Hackathon", back_populates="mentor")


class Hackathon(Base):
    __tablename__ = "hackathons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    start_date = Column(String)
    end_date = Column(String)
    prize_pool = Column(String, nullable=True)
    max_teams = Column(Integer, nullable=True)
    status = Column(String, default="draft")  # draft, registration_open, evaluating, completed
    mentor_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    mentor = relationship("User", back_populates="hackathons")
    teams = relationship("Team", back_populates="hackathon", cascade="all, delete-orphan")
    rounds = relationship("Round", back_populates="hackathon", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="hackathon", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="hackathon", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    members = Column(JSON)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon", back_populates="teams")
    project = relationship("Project", back_populates="team", uselist=False, cascade="all, delete-orphan")


class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon", back_populates="rounds")
    criteria = relationship("Criterion", back_populates="round", cascade="all, delete-orphan")


class Criterion(Base):
    __tablename__ = "criteria"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    max_points = Column(Integer, default=10)
    round_id = Column(Integer, ForeignKey("rounds.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    round = relationship("Round", back_populates="criteria")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer, nullable=False)
    feedback = Column(Text, nullable=True)
    judge_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(Integer, ForeignKey("teams.id"))
    criterion_id = Column(Integer, ForeignKey("criteria.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    judge = relationship("User")
    team = relationship("Team")
    criterion = relationship("Criterion")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    github_url = Column(String, nullable=True)
    demo_url = Column(String, nullable=True)
    tech_stack = Column(JSON, nullable=True)  # ["React", "FastAPI"]
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    team = relationship("Team", back_populates="project")
    hackathon = relationship("Hackathon", back_populates="projects")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"))
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon", back_populates="announcements")
    author = relationship("User")


class HackathonJudge(Base):
    __tablename__ = "hackathon_judges"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon")
    user = relationship("User")


class HackathonCoordinator(Base):
    __tablename__ = "hackathon_coordinators"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon")
    user = relationship("User")


class Credentials(Base):
    __tablename__ = "credentials"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    person_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "judge" or "coordinator"
    is_active = Column(String, default="True")
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    hackathon = relationship("Hackathon")
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])


class JudgeAssignment(Base):
    __tablename__ = "judge_assignments"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=False)
    judge_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=True)
    status = Column(String, default="pending")  # pending, evaluating, completed
    assigned_at = Column(DateTime, server_default=func.now(), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon")
    judge = relationship("User", foreign_keys=[judge_id])
    team = relationship("Team")
    round = relationship("Round")


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=False)
    event_type = Column(String, nullable=False)  # registration, submission, evaluation, announcement, etc
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon")
    user = relationship("User")
    team = relationship("Team")


class ParticipantRegistration(Base):
    __tablename__ = "participant_registrations"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    status = Column(String, default="registered")  # registered, withdrawn, completed
    registered_at = Column(DateTime, server_default=func.now(), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)

    hackathon = relationship("Hackathon")
    user = relationship("User")
    team = relationship("Team")
