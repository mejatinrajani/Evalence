#!/usr/bin/env python3
"""
Simple test script to verify frontend-backend communication
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

print("=" * 60)
print("API COMMUNICATION TEST")
print("=" * 60)

# Test 1: Health check
print("\n[1] Testing health endpoint...")
try:
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"✅ Status: {resp.status_code}")
    print(f"Response: {json.dumps(resp.json(), indent=2)}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: Register user
print("\n[2] Testing user registration...")
try:
    payload = {
        "email": f"test_{int(time.time())}@evalence.com",
        "full_name": "Test User",
        "password": "TestPass123!",
        "role": "participant"
    }
    print(f"  Sending POST request... (timeout=30s)")
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=30)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 201 or resp.status_code == 400:
        print(f"Response: {json.dumps(resp.json(), indent=2)}")
        if resp.status_code == 201:
            user_data = resp.json()
            # Test 3: Login with registered user
            print("\n[3] Testing user login...")
            login_payload = {
                "username": payload["email"],
                "password": payload["password"]
            }
            # Use form data for login (not JSON)
            resp = requests.post(f"{BASE_URL}/auth/token", data=login_payload, timeout=30)
            print(f"Status: {resp.status_code}")
            print(f"Response: {json.dumps(resp.json(), indent=2)}")
            
            if resp.status_code == 200:
                token_data = resp.json()
                # Test 4: Get current user
                print("\n[4] Testing get current user...")
                headers = {"Authorization": f"Bearer {token_data['access_token']}"}
                resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=30)
                print(f"Status: {resp.status_code}")
                print(f"Response: {json.dumps(resp.json(), indent=2)}")
    else:
        print(f"Error: {resp.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 60)
print("Test completed!")
print("=" * 60)
