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

  // F2 TEST SUITE: DEPARTMENTS & JOB POSITIONS
  const hrToken = signToken({ id: '1', email: 'hr.admin@team344.com', role: 'HR_ADMIN' });
  const uniqueDeptName = `Dept_${Date.now()}`;
  let createdDeptId = null;
  let createdJobId = null;

  // 12. GET /api/departments with valid authenticated user (expecting 200)
  try {
    const res = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.departments)) {
      console.log('✅ PASS: GET /api/departments (Listed departments for authenticated user)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/departments', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/departments -', e.message);
    failed++;
  }

  // 13. GET /api/job-positions with valid authenticated user (expecting 200)
  try {
    const res = await fetch(`${BASE_URL}/job-positions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.jobPositions)) {
      console.log('✅ PASS: GET /api/job-positions (Listed job positions for authenticated user)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/job-positions', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/job-positions -', e.message);
    failed++;
  }

  // 14. GET /api/job-positions filtered by department_id (expecting 200)
  try {
    const res = await fetch(`${BASE_URL}/job-positions?department_id=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.jobPositions)) {
      console.log('✅ PASS: GET /api/job-positions?department_id=1 (Filtered by department)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/job-positions?department_id=1', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/job-positions?department_id=1 -', e.message);
    failed++;
  }

  // 15. POST /api/departments as HR_ADMIN (expecting 201 Created)
  try {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        department_name: uniqueDeptName,
        description: 'Test Department Description',
        is_active: true,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.department?.id) {
      createdDeptId = data.department.id;
      console.log('✅ PASS: POST /api/departments (Created department as HR_ADMIN)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/departments as HR_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/departments as HR_ADMIN -', e.message);
    failed++;
  }

  // 16. POST /api/departments duplicate name (expecting 409 Conflict)
  try {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        department_name: uniqueDeptName,
        description: 'Duplicate test',
      }),
    });
    if (res.status === 409) {
      console.log('✅ PASS: POST /api/departments duplicate name rejected (409 Conflict)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/departments duplicate name unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/departments duplicate name error -', e.message);
    failed++;
  }

  // 17. PUT /api/departments/:id as HR_ADMIN (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        description: 'Updated Department Description',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.department?.description === 'Updated Department Description') {
      console.log('✅ PASS: PUT /api/departments/:id (Updated department description)');
      passed++;
    } else {
      console.error('❌ FAIL: PUT /api/departments/:id', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: PUT /api/departments/:id -', e.message);
    failed++;
  }

  // 18. POST /api/job-positions as HR_ADMIN (expecting 201 Created)
  const uniqueJobTitle = `Title_${Date.now()}`;
  try {
    const res = await fetch(`${BASE_URL}/job-positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        department_id: createdDeptId,
        title: uniqueJobTitle,
        description: 'Test position description',
        is_active: true,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.jobPosition?.id) {
      createdJobId = data.jobPosition.id;
      console.log('✅ PASS: POST /api/job-positions (Created position linked to department)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/job-positions', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/job-positions -', e.message);
    failed++;
  }

  // 19. POST /api/job-positions with nonexistent department (expecting 404 Not Found)
  try {
    const res = await fetch(`${BASE_URL}/job-positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        department_id: '999999',
        title: 'Nonexistent Dept Title',
      }),
    });
    if (res.status === 404) {
      console.log('✅ PASS: POST /api/job-positions with invalid department correctly rejected (404 Not Found)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/job-positions with invalid department unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/job-positions with invalid department error -', e.message);
    failed++;
  }

  // 20. POST /api/job-positions duplicate title in same department (expecting 409 Conflict)
  try {
    const res = await fetch(`${BASE_URL}/job-positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        department_id: createdDeptId,
        title: uniqueJobTitle,
      }),
    });
    if (res.status === 409) {
      console.log('✅ PASS: POST /api/job-positions duplicate title in same department rejected (409 Conflict)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/job-positions duplicate title unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/job-positions duplicate title error -', e.message);
    failed++;
  }

  // 21. PUT /api/job-positions/:id as HR_ADMIN (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/job-positions/${createdJobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        description: 'Updated position description',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.jobPosition?.description === 'Updated position description') {
      console.log('✅ PASS: PUT /api/job-positions/:id (Updated job position description)');
      passed++;
    } else {
      console.error('❌ FAIL: PUT /api/job-positions/:id', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: PUT /api/job-positions/:id -', e.message);
    failed++;
  }

  // 22. POST /api/departments as EMPLOYEE (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        department_name: 'Employee Forbidden Dept',
      }),
    });
    if (res.status === 403) {
      console.log('✅ PASS: POST /api/departments by EMPLOYEE role correctly blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/departments by EMPLOYEE unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/departments by EMPLOYEE error -', e.message);
    failed++;
  }

  // 23. POST /api/job-positions as EMPLOYEE (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/job-positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        department_id: '1',
        title: 'Employee Forbidden Position',
      }),
    });
    if (res.status === 403) {
      console.log('✅ PASS: POST /api/job-positions by EMPLOYEE role correctly blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/job-positions by EMPLOYEE unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/job-positions by EMPLOYEE error -', e.message);
    failed++;
  }

  // 24. Unauthenticated POST /api/departments without token (expecting 401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_name: 'No Token Dept' }),
    });
    if (res.status === 401) {
      console.log('✅ PASS: POST /api/departments without token rejected (401 Unauthorized)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/departments without token unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/departments without token error -', e.message);
    failed++;
  }

  // 25. Invalid request data with empty department_name (expecting 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({ department_name: '' }),
    });
    const data = await res.json();
    if (res.status === 400 && data.errors?.length > 0) {
      console.log('✅ PASS: POST /api/departments with empty name returned 400 Bad Request');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/departments empty name unexpected status -', res.status, data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/departments empty name error -', e.message);
    failed++;
  }

  console.log(`\n📊 Final Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
