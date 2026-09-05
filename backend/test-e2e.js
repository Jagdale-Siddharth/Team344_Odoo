import { signToken } from './src/utils/jwt.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Full-Stack Starter Kit E2E Tests...\n');
  let passed = 0;
  let failed = 0;

  // 1. Health check test
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === 'healthy' && data.database === 'connected') {
      console.log('✅ PASS: GET /api/health (Database connected)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/health', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/health -', e.message);
    failed++;
  }

  // Generate unique test user
  const testEmail = `testuser_${Date.now()}@team344.com`;
  const testPassword = 'Password123!';
  const testName = 'Tester 344';
  let token = null;

  // 2. User registration test
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.token) {
      console.log('✅ PASS: POST /api/auth/register (User created & token issued)');
      token = data.token;
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/auth/register', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/auth/register -', e.message);
    failed++;
  }

  // 3. User login test
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.token) {
      console.log('✅ PASS: POST /api/auth/login (Login successful)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/auth/login', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/auth/login -', e.message);
    failed++;
  }

  // 4. Protected /me endpoint test
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.user?.email === testEmail) {
      console.log('✅ PASS: GET /api/auth/me (Protected route verified user session)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/auth/me', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/auth/me -', e.message);
    failed++;
  }

  // 5. Invalid credentials test (expecting 401)
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });
    if (res.status === 401) {
      console.log('✅ PASS: Invalid credentials correctly rejected (401 Unauthorized)');
      passed++;
    } else {
      console.error('❌ FAIL: Invalid credentials unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Invalid credentials error -', e.message);
    failed++;
  }

  // 6. Zod validation test (expecting 400)
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', password: '123' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.errors?.length > 0) {
      console.log('✅ PASS: Zod validation error correctly returned 400 Bad Request with error array');
      passed++;
    } else {
      console.error('❌ FAIL: Zod validation unexpected response -', res.status, data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Zod validation error -', e.message);
    failed++;
  }

  // 7. Duplicate user registration test (expecting 409)
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    if (res.status === 409) {
      console.log('✅ PASS: Duplicate registration correctly rejected (409 Conflict)');
      passed++;
    } else {
      console.error('❌ FAIL: Duplicate registration unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Duplicate registration error -', e.message);
    failed++;
  }

  // 8. /me without JWT test (expecting 401)
  try {
    const res = await fetch(`${BASE_URL}/auth/me`);
    if (res.status === 401) {
      console.log('✅ PASS: GET /api/auth/me without token correctly rejected (401 Unauthorized)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/auth/me without token unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/auth/me without token error -', e.message);
    failed++;
  }

  // 9. /me with malformed JWT test (expecting 401)
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    if (res.status === 401) {
      console.log('✅ PASS: GET /api/auth/me with malformed token correctly rejected (401 Unauthorized)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/auth/me with malformed token unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/auth/me with malformed token error -', e.message);
    failed++;
  }

  // 10. RBAC unauthorized test: EMPLOYEE role accessing admin-only endpoint (expecting 403)
  try {
    const res = await fetch(`${BASE_URL}/auth/rbac-test`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      console.log('✅ PASS: RBAC endpoint returned 403 Forbidden for unauthorized role (EMPLOYEE)');
      passed++;
    } else {
      console.error('❌ FAIL: RBAC unauthorized test unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: RBAC unauthorized test error -', e.message);
    failed++;
  }

  // 11. RBAC authorized test: SYSTEM_ADMIN role accessing admin endpoint (expecting 200)
  try {
    const adminToken = signToken({ id: '1', email: 'admin@peoplepay360.demo', role: 'SYSTEM_ADMIN' });
    const res = await fetch(`${BASE_URL}/auth/rbac-test`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      console.log('✅ PASS: RBAC endpoint granted access (200 OK) for authorized role (SYSTEM_ADMIN)');
      passed++;
    } else {
      console.error('❌ FAIL: RBAC authorized test unexpected status -', res.status, data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: RBAC authorized test error -', e.message);
    failed++;
  }

  console.log(`\n📊 Final Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
