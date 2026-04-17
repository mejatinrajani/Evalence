#!/usr/bin/env python3
"""
Reset test user passwords to a known value
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found!")
    exit(1)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test password for all users
TEST_PASSWORD = "Password123"
hashed_password = pwd_context.hash(TEST_PASSWORD)

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # Update all users with the test password
    session.execute(
        text("UPDATE users SET hashed_password = :pwd WHERE email LIKE 'user%@evalence.dev'"),
        {"pwd": hashed_password}
    )
    session.commit()
    print("✅ Successfully updated all test user passwords!\n")
    
    print("=" * 70)
    print("TEST USER CREDENTIALS FOR LOGIN")
    print("=" * 70)
    print("\nUsername/Email format: user{N}@evalence.dev")
    print("Where N = 0 to 49")
    print("\nExamples:")
    print("  • user0@evalence.dev")
    print("  • user1@evalence.dev")
    print("  • user25@evalence.dev")
    print("  • user49@evalence.dev")
    print("\nPassword (same for all):")
    print(f"  • {TEST_PASSWORD}")
    print("\n" + "=" * 70)
    print("\nTo login from frontend:")
    print("1. Navigate to login page")
    print("2. Enter email: user0@evalence.dev (or any user0-user49)")
    print(f"3. Enter password: {TEST_PASSWORD}")
    print("4. Click Login")
    print("\nNote: Each user has a random role (participant, judge, or mentor)")
    print("=" * 70)
    
except Exception as e:
    session.rollback()
    print(f"❌ Error: {str(e)}")
    exit(1)
finally:
    session.close()
