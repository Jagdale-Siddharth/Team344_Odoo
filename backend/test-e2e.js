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

  // F3 TEST SUITE: EMPLOYEE MANAGEMENT
  const uniqueEmpCode = `EMP_${Date.now()}`;
  const uniqueWorkEmail = `test.emp.${Date.now()}@peoplepay360.demo`;
  let createdEmpId = null;

  // 26. GET /api/employees authenticated as HR_ADMIN (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.employees)) {
      console.log('✅ PASS: GET /api/employees as HR_ADMIN (Listed employees)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees as HR_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees as HR_ADMIN -', e.message);
    failed++;
  }

  // 27. GET /api/employees authenticated as SYSTEM_ADMIN (expecting 200 OK)
  try {
    const adminToken = signToken({ id: '1', email: 'admin@peoplepay360.demo', role: 'SYSTEM_ADMIN' });
    const res = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.employees)) {
      console.log('✅ PASS: GET /api/employees as SYSTEM_ADMIN (Listed employees)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees as SYSTEM_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees as SYSTEM_ADMIN -', e.message);
    failed++;
  }

  // 28. GET /api/employees unauthenticated (expecting 401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/employees`);
    if (res.status === 401) {
      console.log('✅ PASS: GET /api/employees unauthenticated rejected (401 Unauthorized)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees unauthenticated status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees unauthenticated error -', e.message);
    failed++;
  }

  // 29. GET /api/employees as EMPLOYEE role (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      console.log('✅ PASS: GET /api/employees by EMPLOYEE role blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees by EMPLOYEE role unexpected status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees by EMPLOYEE role error -', e.message);
    failed++;
  }

  // 30. POST /api/employees as HR_ADMIN (expecting 201 Created)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        employee_code: uniqueEmpCode,
        first_name: 'TestFirst',
        last_name: 'TestLast',
        work_email: uniqueWorkEmail,
        department_id: createdDeptId || '1',
        job_position_id: createdJobId || '1',
        employment_type: 'FULL_TIME',
        joining_date: '2026-01-15',
        status: 'ACTIVE',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.employee?.id) {
      createdEmpId = data.employee.id;
      console.log('✅ PASS: POST /api/employees (Created valid employee profile)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/employees as HR_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/employees as HR_ADMIN -', e.message);
    failed++;
  }

  // 31. POST /api/employees with nonexistent department_id (expecting 404 Not Found)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        first_name: 'InvalidDept',
        last_name: 'User',
        work_email: `invalid.dept.${Date.now()}@test.com`,
        department_id: '999999',
        job_position_id: '1',
      }),
    });
    if (res.status === 404) {
      console.log('✅ PASS: POST /api/employees with invalid department rejected (404 Not Found)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/employees invalid department status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/employees invalid department error -', e.message);
    failed++;
  }

  // 32. POST /api/employees with nonexistent job_position_id (expecting 404 Not Found)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        first_name: 'InvalidJob',
        last_name: 'User',
        work_email: `invalid.job.${Date.now()}@test.com`,
        department_id: '1',
        job_position_id: '999999',
      }),
    });
    if (res.status === 404) {
      console.log('✅ PASS: POST /api/employees with invalid job position rejected (404 Not Found)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/employees invalid job position status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/employees invalid job position error -', e.message);
    failed++;
  }

  // 33. POST /api/employees with duplicate work_email (expecting 409 Conflict)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        employee_code: `CODE_${Date.now()}`,
        first_name: 'DupEmail',
        last_name: 'User',
        work_email: uniqueWorkEmail,
        department_id: '1',
        job_position_id: '1',
      }),
    });
    if (res.status === 409) {
      console.log('✅ PASS: POST /api/employees duplicate work_email rejected (409 Conflict)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/employees duplicate work_email status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/employees duplicate work_email error -', e.message);
    failed++;
  }

  // 34. POST /api/employees with duplicate employee_code (expecting 409 Conflict)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        employee_code: uniqueEmpCode,
        first_name: 'DupCode',
        last_name: 'User',
        work_email: `unique.${Date.now()}@test.com`,
        department_id: '1',
        job_position_id: '1',
      }),
    });
    if (res.status === 409) {
      console.log('✅ PASS: POST /api/employees duplicate employee_code rejected (409 Conflict)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/employees duplicate employee_code status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/employees duplicate employee_code error -', e.message);
    failed++;
  }

  // 35. POST /api/employees validation failure (expecting 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        first_name: '',
        last_name: 'User',
        work_email: 'not-an-email',
      }),
    });
    const data = await res.json();
    if (res.status === 400 && data.errors?.length > 0) {
      console.log('✅ PASS: POST /api/employees invalid data returned 400 Bad Request');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/employees validation failure status -', res.status, data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/employees validation failure error -', e.message);
    failed++;
  }

  // 36. GET /api/employees/:id with valid ID (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.employee?.id === createdEmpId) {
      console.log('✅ PASS: GET /api/employees/:id (Retrieved employee profile)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees/:id', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees/:id -', e.message);
    failed++;
  }

  // 37. GET /api/employees/:id with invalid ID format (expecting 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/employees/abc-invalid`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    if (res.status === 400) {
      console.log('✅ PASS: GET /api/employees/:id invalid format rejected (400 Bad Request)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees/:id invalid format status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees/:id invalid format error -', e.message);
    failed++;
  }

  // 38. GET /api/employees/:id with nonexistent ID (expecting 404 Not Found)
  try {
    const res = await fetch(`${BASE_URL}/employees/999999`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    if (res.status === 404) {
      console.log('✅ PASS: GET /api/employees/:id nonexistent ID rejected (404 Not Found)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees/:id nonexistent ID status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees/:id nonexistent ID error -', e.message);
    failed++;
  }

  // 39. PUT /api/employees/:id as HR_ADMIN (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        first_name: 'UpdatedFirst',
        status: 'INACTIVE',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.employee?.first_name === 'UpdatedFirst' && data.employee?.status === 'INACTIVE') {
      console.log('✅ PASS: PUT /api/employees/:id (Updated employee profile)');
      passed++;
    } else {
      console.error('❌ FAIL: PUT /api/employees/:id', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: PUT /api/employees/:id -', e.message);
    failed++;
  }

  // 40. PUT /api/employees/:id as EMPLOYEE role (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        first_name: 'ForbiddenUpdate',
      }),
    });
    if (res.status === 403) {
      console.log('✅ PASS: PUT /api/employees/:id by EMPLOYEE role blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: PUT /api/employees/:id by EMPLOYEE role status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: PUT /api/employees/:id by EMPLOYEE role error -', e.message);
    failed++;
  }

  // 41. GET /api/employees?search=UpdatedFirst (expecting 200 OK filtered)
  try {
    const res = await fetch(`${BASE_URL}/employees?search=UpdatedFirst`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.employees) && data.employees.length > 0) {
      console.log('✅ PASS: GET /api/employees?search=UpdatedFirst (Filtered list by search string)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees?search=UpdatedFirst', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees?search=UpdatedFirst -', e.message);
    failed++;
  }

  // 42. GET /api/employees?status=INACTIVE (expecting 200 OK filtered)
  try {
    const res = await fetch(`${BASE_URL}/employees?status=INACTIVE`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.employees)) {
      console.log('✅ PASS: GET /api/employees?status=INACTIVE (Filtered list by status)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/employees?status=INACTIVE', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/employees?status=INACTIVE -', e.message);
    failed++;
  }

  // ================================================================
  // F4 — WORKING SCHEDULES TESTS
  // ================================================================

  let createdSchedId = null;
  const uniqueSchedName = `Test Shift ${Date.now()}`;
  const adminToken = signToken({ id: '1', email: 'admin@peoplepay360.demo', role: 'SYSTEM_ADMIN' });
  const payrollToken = signToken({ id: '2', email: 'payroll@peoplepay360.demo', role: 'PAYROLL_OFFICER' });

  // 43. GET /api/working-schedules unauthenticated (expecting 401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`);
    if (res.status === 401) {
      console.log('✅ PASS: GET /api/working-schedules unauthenticated rejected (401 Unauthorized)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules unauthenticated status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules unauthenticated -', e.message);
    failed++;
  }

  // 44. GET /api/working-schedules as EMPLOYEE role (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      console.log('✅ PASS: GET /api/working-schedules by EMPLOYEE role blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules by EMPLOYEE status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules by EMPLOYEE -', e.message);
    failed++;
  }

  // 45. GET /api/working-schedules as HR_ADMIN (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.schedules)) {
      console.log('✅ PASS: GET /api/working-schedules as HR_ADMIN (Listed schedules)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules as HR_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules as HR_ADMIN -', e.message);
    failed++;
  }

  // 46. GET /api/working-schedules as PAYROLL_OFFICER (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      headers: { Authorization: `Bearer ${payrollToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.schedules)) {
      console.log('✅ PASS: GET /api/working-schedules as PAYROLL_OFFICER (Listed schedules)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules as PAYROLL_OFFICER', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules as PAYROLL_OFFICER -', e.message);
    failed++;
  }

  // 47. GET /api/working-schedules as SYSTEM_ADMIN (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.schedules)) {
      console.log('✅ PASS: GET /api/working-schedules as SYSTEM_ADMIN (Listed schedules)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules as SYSTEM_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules as SYSTEM_ADMIN -', e.message);
    failed++;
  }

  // 48. POST /api/working-schedules as HR_ADMIN with valid lines (expecting 201 Created & PostgreSQL trigger calculated weekly_hours)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        schedule_name: uniqueSchedName,
        schedule_type: 'WEEKLY',
        is_active: true,
        lines: [
          { day_of_week: 1, is_working: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
          { day_of_week: 2, is_working: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
          { day_of_week: 3, is_working: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
          { day_of_week: 4, is_working: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
          { day_of_week: 5, is_working: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
        ],
      }),
    });
    const data = await res.json();
    // 5 days * (8h - 1h) = 35 weekly_hours calculated by PostgreSQL trigger!
    if (res.status === 201 && data.success && data.schedule?.weekly_hours === 35) {
      createdSchedId = data.schedule.id;
      console.log('✅ PASS: POST /api/working-schedules (Created schedule & verified PostgreSQL weekly_hours=35)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/working-schedules as HR_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/working-schedules as HR_ADMIN -', e.message);
    failed++;
  }

  // 49. POST /api/working-schedules as SYSTEM_ADMIN (expecting 201 Created)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        schedule_name: `Admin Shift ${Date.now()}`,
        schedule_type: 'WEEKLY',
        is_active: true,
        lines: [
          { day_of_week: 1, is_working: true, start_time: '08:00', end_time: '16:00', break_minutes: 30 },
        ],
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success) {
      console.log('✅ PASS: POST /api/working-schedules as SYSTEM_ADMIN (Created schedule)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/working-schedules as SYSTEM_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/working-schedules as SYSTEM_ADMIN -', e.message);
    failed++;
  }

  // 50. POST /api/working-schedules with invalid data (empty schedule_name) (expecting 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        schedule_name: '',
        lines: [{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }],
      }),
    });
    if (res.status === 400) {
      console.log('✅ PASS: POST /api/working-schedules with empty name rejected (400 Bad Request)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/working-schedules invalid name status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/working-schedules invalid name -', e.message);
    failed++;
  }

  // 51. POST /api/working-schedules with invalid time config (end_time before start_time) (expecting 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        schedule_name: `Bad Shift ${Date.now()}`,
        lines: [{ day_of_week: 1, is_working: true, start_time: '18:00', end_time: '09:00', break_minutes: 0 }],
      }),
    });
    if (res.status === 400) {
      console.log('✅ PASS: POST /api/working-schedules invalid timing rejected (400 Bad Request)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/working-schedules invalid timing status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/working-schedules invalid timing -', e.message);
    failed++;
  }

  // 52. POST /api/working-schedules by EMPLOYEE role (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        schedule_name: `Emp Shift ${Date.now()}`,
        lines: [{ day_of_week: 1, is_working: true, start_time: '09:00', end_time: '17:00' }],
      }),
    });
    if (res.status === 403) {
      console.log('✅ PASS: POST /api/working-schedules by EMPLOYEE role blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: POST /api/working-schedules by EMPLOYEE status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: POST /api/working-schedules by EMPLOYEE -', e.message);
    failed++;
  }

  // 53. GET /api/working-schedules/:id with valid ID (expecting 200 OK)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules/${createdSchedId}`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.schedule?.id === createdSchedId) {
      console.log('✅ PASS: GET /api/working-schedules/:id (Retrieved schedule details)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules/:id', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules/:id -', e.message);
    failed++;
  }

  // 54. GET /api/working-schedules/:id with invalid ID format (expecting 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules/invalid-id-format`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    if (res.status === 400) {
      console.log('✅ PASS: GET /api/working-schedules/:id invalid format rejected (400 Bad Request)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules/:id invalid format status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules/:id invalid format -', e.message);
    failed++;
  }

  // 55. GET /api/working-schedules/:id with nonexistent ID (expecting 404 Not Found)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules/999999`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    if (res.status === 404) {
      console.log('✅ PASS: GET /api/working-schedules/:id nonexistent ID rejected (404 Not Found)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules/:id nonexistent ID status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules/:id nonexistent ID -', e.message);
    failed++;
  }

  // 56. PUT /api/working-schedules/:id as HR_ADMIN (expecting 200 OK & updated PostgreSQL weekly_hours)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules/${createdSchedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        schedule_name: `${uniqueSchedName} Updated`,
        lines: [
          { day_of_week: 1, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 2, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 3, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 4, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 5, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        ],
      }),
    });
    const data = await res.json();
    // 5 days * (9h - 1h) = 40 weekly_hours calculated by PostgreSQL trigger!
    if (res.status === 200 && data.success && data.schedule?.weekly_hours === 40) {
      console.log('✅ PASS: PUT /api/working-schedules/:id (Updated schedule & verified updated PostgreSQL weekly_hours=40)');
      passed++;
    } else {
      console.error('❌ FAIL: PUT /api/working-schedules/:id as HR_ADMIN', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: PUT /api/working-schedules/:id as HR_ADMIN -', e.message);
    failed++;
  }

  // 57. PUT /api/working-schedules/:id by EMPLOYEE role (expecting 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules/${createdSchedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        schedule_name: 'Forbidden Edit',
      }),
    });
    if (res.status === 403) {
      console.log('✅ PASS: PUT /api/working-schedules/:id by EMPLOYEE role blocked (403 Forbidden)');
      passed++;
    } else {
      console.error('❌ FAIL: PUT /api/working-schedules/:id by EMPLOYEE status -', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: PUT /api/working-schedules/:id by EMPLOYEE -', e.message);
    failed++;
  }

  // 58. GET /api/working-schedules?is_active=true (expecting 200 OK filtered list)
  try {
    const res = await fetch(`${BASE_URL}/working-schedules?is_active=true`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.schedules)) {
      console.log('✅ PASS: GET /api/working-schedules?is_active=true (Filtered list by active status)');
      passed++;
    } else {
      console.error('❌ FAIL: GET /api/working-schedules?is_active=true', data);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: GET /api/working-schedules?is_active=true -', e.message);
    failed++;
  }

  console.log(`\n📊 Final Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
