import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, QueuePool
from dotenv import load_dotenv

load_dotenv()

# We expect a Neon Postgres string like "postgresql://user:password@ep-cool-db.us-east-2.aws.neon.tech/dbname"
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate Neon connection
if not DATABASE_URL:
    print("⚠️  WARNING: No DATABASE_URL found in .env. Using SQLite for local development only.")
    DATABASE_URL = "sqlite:///./evalence.db"
elif not DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg2://")):
    raise ValueError("❌ DATABASE_URL must be a PostgreSQL connection string for Neon")

# Configure connection pooling for Neon (specifically for serverless)
if DATABASE_URL.startswith("sqlite"):
    # SQLite for local development
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        echo=False
    )
    print("✅ Using SQLite (local development)")
else:
    # PostgreSQL/Neon configuration with optimized pooling for serverless
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,  # Use connection pooling
        pool_size=2,  # Reduced for Neon serverless
        max_overflow=5,  # Allow overflow connections
        pool_timeout=10,  # Timeout for getting connection
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_pre_ping=True,  # Verify connection before using
        echo=False,
        connect_args={
            "connect_timeout": 10,
            "application_name": "evalence_app"
        }
    )
    print("[OK] Connected to Neon PostgreSQL database")

# Event handler to handle Neon connection drops
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Optimize Neon connection on connect."""
    cursor = dbapi_conn.cursor()
    try:
        # Set timezone to UTC
        cursor.execute("SET timezone = 'UTC'")
        # Enable jit for Neon (optional performance boost)
        cursor.execute("SET jit = off")
        cursor.close()
    except Exception as e:
        print(f"⚠️  Could not set connection parameters: {e}")

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

Base = declarative_base()

def get_db():
    """Get database session with proper error handling."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"❌ Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()
