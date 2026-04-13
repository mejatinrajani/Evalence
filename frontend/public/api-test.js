// Test if API is accessible from frontend
const BASE_URL = 'http://localhost:8000/api';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  
  // Test 1: Can we reach the server?
  try {
    const healthCheck = await fetch(`${BASE_URL}/../docs`);
    if (healthCheck.ok) {
      console.log('✅ Backend server is reachable on port 8000');
    }
  } catch (e) {
    console.error('❌ Cannot reach backend on port 8000:', e.message);
    return;
  }

  // Test 2: Register a test user
  try {
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        full_name: 'Test User',
        password: 'TestPass123!',
        role: 'participant'
      })
    });
    
    const registerData = await registerRes.json();
    if (registerRes.ok) {
      console.log('✅ Register endpoint works:', registerData);
      
      // Test 3: Try to login with the registered user
      const loginRes = await fetch(`${BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${registerData.email}&password=TestPass123!`
      });
      
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        console.log('✅ Login endpoint works:', loginData);
      } else {
        console.error('❌ Login endpoint error:', loginRes.status, loginData);
      }
    } else {
      console.error('❌ Register endpoint error:', registerRes.status, registerData);
    }
  } catch (e) {
    console.error('❌ API test failed:', e.message);
  }
}

// Run tests
if (document.readyState === 'currentScript') {
  testEndpoints();
} else {
  window.addEventListener('load', testEndpoints);
}

// Also make it available globally for manual testing
window.testEndpoints = testEndpoints;
window.apiBase = BASE_URL;
console.log('API testing utilities loaded. Run testEndpoints() to test.');
