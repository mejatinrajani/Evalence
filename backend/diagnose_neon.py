#!/usr/bin/env python3
"""
Comprehensive Neon PostgreSQL Connection Diagnostics
Tests various connection approaches and identifies the issue
"""

import os
import sys
from dotenv import load_dotenv
import socket

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print("=" * 70)
print("NEON CONNECTION DIAGNOSTICS")
print("=" * 70)

# Parse connection string
print("\n1. CONNECTION STRING ANALYSIS")
print("-" * 70)
print(f"URL: {DATABASE_URL}")

# Extract hostname
try:
    from urllib.parse import urlparse
    parsed = urlparse(DATABASE_URL)
    hostname = parsed.hostname
    port = parsed.port or 5432
    username = parsed.username
    database = parsed.path.lstrip('/')
    
    print(f"\n✓ Parsed Details:")
    print(f"  - Hostname: {hostname}")
    print(f"  - Port: {port}")
    print(f"  - Database: {database}")
    print(f"  - Username: {username}")
except Exception as e:
    print(f"✗ Failed to parse: {e}")

# Test network connectivity
print("\n2. NETWORK CONNECTIVITY TEST")
print("-" * 70)
print(f"Testing hostname resolution for: {hostname}")

try:
    ip = socket.gethostbyname(hostname)
    print(f"✓ DNS Resolution successful")
    print(f"  - IP Address: {ip}")
except socket.gaierror as e:
    print(f"✗ DNS Resolution failed: {e}")
    print(f"  This means the hostname cannot be reached from your network")
    sys.exit(1)

# Test port connectivity
print(f"\nTesting TCP connection to {hostname}:{port}")
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex((hostname, port))
    sock.close()
    
    if result == 0:
        print(f"✓ Port {port} is open and reachable")
    else:
        print(f"✗ Cannot connect to port {port}")
        print(f"  - Firewall may be blocking the connection")
        print(f"  - Neon database service may be down")
        sys.exit(1)
except socket.error as e:
    print(f"✗ Socket error: {e}")
    sys.exit(1)

# Test SQLAlchemy connection with timeout
print("\n3. SQLALCHEMY CONNECTION TEST")
print("-" * 70)
print("Attempting database connection...")

try:
    from sqlalchemy import create_engine, text
    
    engine = create_engine(
        DATABASE_URL,
        pool_size=1,
        max_overflow=0,
        pool_timeout=5,  # 5 second timeout
        pool_pre_ping=True,
        echo=False,
    )
    
    print("Executing test query with 5 second timeout...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1 as status"))
        value = result.fetchone()[0]
        print(f"✓ Connection successful!")
        print(f"  - Query result: {value}")
        
        # Get database version
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"  - Database: {version[:60]}...")
        
except Exception as e:
    error_str = str(e)
    print(f"✗ Connection failed!")
    print(f"\nError Details:")
    print(f"  {error_str[:200]}")
    
    if "Connection timed out" in error_str or "ETIMEDOUT" in error_str:
        print(f"\n💡 Timeout Issue - Possible causes:")
        print(f"  1. Neon database is temporarily down")
        print(f"  2. Network firewall blocking port 5432")
        print(f"  3. ISP/VPN blocking PostgreSQL connections")
        print(f"  4. Neon rate limiting or maintenance")
    elif "authentication failed" in error_str or "password" in error_str:
        print(f"\n💡 Authentication Issue:")
        print(f"  - Check username/password in connection string")
        print(f"  - Verify credentials haven't changed")
    elif "does not exist" in error_str or "database" in error_str.lower():
        print(f"\n💡 Database Issue:")
        print(f"  - Database may not exist")
        print(f"  - Check database name in connection string")

print("\n" + "=" * 70)
print("RECOMMENDATIONS:")
print("=" * 70)
print("""
If connection is timing out:
1. Check your internet connection
2. Verify firewall/VPN settings
3. Try connecting from a different network
4. Check Neon project status: https://console.neon.tech
5. Use SQLite locally for now:
   DATABASE_URL=sqlite:///./evalence.db

To use Neon when it's available:
DATABASE_URL=postgresql+psycopg2://neondb_owner:npg_e7CZWDlqNQc9@ep-snowy-bar-ankjksdx-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
""")
