# Feature F3: Employee Management — Technical & Architecture Documentation

## 1. Feature Overview
**Employee Management** (Phase 1 Feature F3) introduces a comprehensive workspace for managing an organization's workforce within the **PeoplePay360** HR & Payroll system. It provides administrative users with tools to view, search, filter, create, edit, and deactivate employee records while seamlessly linking employees to existing Departments (F2) and Job Positions (F2).

---

## 2. Business Purpose
In an enterprise HR system, employee records serve as the central source of truth for organizational hierarchy, payroll processing, compliance reporting, and access control. Feature F3 enables HR personnel and System Administrators to:
- Maintain complete employee profiles (contact info, departmental placement, job titles, joining dates, employment status, and banking details).
- Prevent duplicate data entries (unique employee codes and work email enforcement).
- Dynamically assign and reorganize personnel across departments and positions.
- Deactivate former or inactive employees while preserving historical payroll records (soft deactivation over destructive deletion).

---

## 3. User Workflow
```
[ Login as SYSTEM_ADMIN or HR_ADMIN ]
                ↓
    [ Access /employees Navigation ]
                ↓
    [ Employees Workspace Overview ]
   ├── View Metric Cards (Total, Active, Inactive)
   ├── Filter by Search, Department, Job Position, Status
   └── View Paginated/Structured Employee Table
                ↓
┌───────────────────────┬───────────────────────┬───────────────────────┐
│     Create Employee   │     Edit Employee     │   View Full Profile   │
├───────────────────────┼───────────────────────┼───────────────────────┤
│ 1. Click "Add" button │ 1. Click "Edit" icon  │ 1. Click "View" icon  │
│ 2. Select Department  │ 2. Modify details     │ 2. Open side drawer   │
│ 3. Select Job Position│ 3. Dynamic Position   │ 3. View personal,     │
│    (filtered by Dept) │    dropdown re-load   │    bank, and job      │
│ 4. Submit form        │ 4. Save updates       │    details            │
└───────────────────────┴───────────────────────┴───────────────────────┘
```

---

## 4. Roles and Permissions (RBAC Matrix)
The RBAC implementation enforces strict access control aligned with canonical enterprise roles:

| Role | View Employees | Create Employee | Edit Employee | Soft Deactivate | Access UI Route |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SYSTEM_ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **HR_ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PAYROLL_OFFICER** | ✅ | ❌ | ❌ | ❌ | ✅ (Read-Only) |
| **EMPLOYEE** | ❌ | ❌ | ❌ | ❌ | ❌ (403 Forbidden) |

---

## 5. Frontend Implementation
- **Page Component**: `frontend/src/pages/EmployeesPage.jsx`
- **Route**: Protected `/employees` route declared in `App.jsx` wrapped in `<ProtectedRoute requiredRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER']}>`.
- **Navigation**: Integrated desktop and mobile links in `Navbar.jsx` conditionally visible when `user.role` can access employee records.
- **Key UI Capabilities**:
  - **Metric Cards**: Real-time calculated counters for Total, Active, and Inactive employees.
  - **Multi-Filter Control Bar**: Live text search (matches name, email, employee code), Department dropdown filter, Job Position dropdown filter, and Status filter (`ACTIVE` / `INACTIVE`).
  - **Dynamic Dropdowns**: When creating or editing an employee, selecting a Department automatically filters the available Job Positions to those belonging to the selected department (`GET /api/job-positions?department_id=...`).
  - **Modal Forms & Drawer**: Seamless creation and editing in a multi-column modal with instant client-side validation; detailed view profile slide-out drawer.
  - **Visual Design**: Styled with standard CSS and Tailwind conventions matching the existing Departments page aesthetic (slate tones, indigo badges, crisp micro-interactions).

---

## 6. Backend Implementation
- **Controller**: `backend/src/controllers/employeeController.js`
- **Routes**: `backend/src/routes/employeeRoutes.js`
- **Router Mounting**: Mounted at `/api/employees` in `backend/src/routes/index.js`.
- **Validation**: Strict schema validation using **Zod** (`createEmployeeSchema`, `updateEmployeeSchema`, `employeeQuerySchema`).
- **BigInt Safety**: All BigInt primary/foreign keys (`employee_id`, `department_id`, `job_position_id`, `user_id`, `manager_id`) are safely converted to string representations via a custom serializer utility before JSON transmission to prevent 64-bit integer truncation in JavaScript engines.

---

## 7. Database Implementation
- **ORM & Database**: Prisma ORM with PostgreSQL.
- **Existing Table Schema**: `employees` table in PeoplePay360 schema (no database modifications or migrations made).
- **Core Columns**:
  - `employee_id` (BigInt, PK, Autoincrement)
  - `employee_code` (VarChar, Unique)
  - `first_name` & `last_name` (VarChar)
  - `work_email` (VarChar, Unique)
  - `personal_email` & `phone` (VarChar, Nullable)
  - `department_id` (BigInt, FK -> departments)
  - `job_position_id` (BigInt, FK -> job_positions)
  - `employment_type` (VarChar: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`)
  - `joining_date` (Timestamp)
  - `status` (VarChar: `ACTIVE`, `INACTIVE`, `PROBATION`, `TERMINATED`)
  - `bank_name`, `bank_account_number`, `bank_ifsc_code` (VarChar, Nullable)
  - `created_at` & `updated_at` (Timestamps)

---

## 8. API Documentation

### 8.1 List & Filter Employees
- **Endpoint**: `GET /api/employees`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`)
- **Query Parameters**:
  - `search` (string): Filters by first name, last name, work email, or employee code.
  - `department_id` (integer/string): Filters by department ID.
  - `job_position_id` (integer/string): Filters by job position ID.
  - `status` (string): Filters by status (`ACTIVE`, `INACTIVE`, etc.).
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": [
      {
        "employee_id": "1",
        "employee_code": "EMP001",
        "first_name": "Alice",
        "last_name": "Smith",
        "work_email": "alice.smith@peoplepay360.com",
        "department_id": "1",
        "job_position_id": "2",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department": { "department_name": "Engineering" },
        "job_position": { "title": "Software Engineer" }
      }
    ]
  }
  ```

### 8.2 Get Employee Details by ID
- **Endpoint**: `GET /api/employees/:id`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`)
- **Response** (`200 OK`): Returns complete employee object including joined department and job position objects.

### 8.3 Create Employee
- **Endpoint**: `POST /api/employees`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`)
- **Request Body**:
  ```json
  {
    "employee_code": "EMP101",
    "first_name": "John",
    "last_name": "Doe",
    "work_email": "john.doe@company.com",
    "personal_email": "john.personal@gmail.com",
    "phone": "+19876543210",
    "department_id": 1,
    "job_position_id": 2,
    "employment_type": "FULL_TIME",
    "joining_date": "2026-09-01",
    "status": "ACTIVE",
    "bank_name": "Global Bank",
    "bank_account_number": "987654321098",
    "bank_ifsc_code": "GLOB0001234"
  }
  ```
- **Response** (`201 Created`): Returns newly created employee object.

### 8.4 Update Employee Profile
- **Endpoint**: `PUT /api/employees/:id`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`)
- **Request Body**: Accepts partial or full employee object update fields.
- **Response** (`200 OK`): Returns updated employee record.

---

## 9. Business Rules
1. **Uniqueness**: `employee_code` and `work_email` must be unique across all employee records in the system.
2. **Referential Integrity**: An employee must be assigned to a valid, existing `department_id` and `job_position_id`.
3. **Job Position Context**: In the UI, selected job positions are filtered by the selected department to guarantee organizational consistency.
4. **Soft Deactivation**: Destructive deletion (`DELETE /api/employees/:id`) is intentionally omitted. Employees are deactivated by updating their `status` to `INACTIVE`.

---

## 10. Validation Rules
- **`employee_code`**: Required non-empty string.
- **`first_name` & `last_name`**: Required non-empty strings.
- **`work_email`**: Required valid email address format.
- **`personal_email`**: Optional; if provided must be a valid email format.
- **`department_id` & `job_position_id`**: Required valid numeric IDs.
- **`employment_type`**: Must be one of `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`.
- **`status`**: Must be one of `ACTIVE`, `INACTIVE`, `PROBATION`, `TERMINATED`.

---

## 11. Security and RBAC Enforcement
- **Authentication**: All endpoints pass through `authenticate` middleware, verifying the signed JWT bearer token.
- **Authorization**: Endpoint handlers pass through `authorize(['SYSTEM_ADMIN', 'HR_ADMIN', ...])` middleware.
- **Data Protection**: Sensitive password hashes or authentication secrets are never exposed in employee payloads.

---

## 12. Error Handling & Edge Cases
- `400 Bad Request`: Returned on Zod validation failure or invalid integer path parameter formatting.
- `401 Unauthorized`: Returned when request lacks a valid JWT token.
- `403 Forbidden`: Returned when user's role lacks access permission (e.g. `EMPLOYEE` role calling `/api/employees`).
- `404 Not Found`: Returned when target employee, department, or job position does not exist.
- `409 Conflict`: Returned when attempting to create/update an employee with a duplicate `work_email` or `employee_code`.

---

## 13. Testing Strategy and Execution
- **E2E Test Suite**: Expanded `backend/test-e2e.js` with 17 new comprehensive test cases (Tests 26–42).
- **Coverage**:
  - Authenticated listing vs unauthenticated 401 rejection.
  - Role restriction tests (`EMPLOYEE` 403 Forbidden).
  - Creation with valid vs invalid department/job position.
  - Duplicate email and employee code 409 conflict checks.
  - Parameterized search and status filter checks.
  - Profile detail retrieval and profile update execution.
- **Result**: `42 Passed, 0 Failed` across full full-stack test suite.

---

## 14. Database Relationships
```
┌───────────────────┐           ┌───────────────────┐
│    departments    │ 1       * │   job_positions   │
│ ───────────────── │ ───────── │ ───────────────── │
│ department_id (PK)│           │ job_position_id   │
│ department_name   │           │ department_id (FK)│
└───────────────────┘           └───────────────────┘
          │ 1                             │ 1
          │                               │
          │ *                             │ *
          └───────────┐       ┌───────────┘
                      ▼       ▼
            ┌───────────────────────────┐
            │         employees         │
            │ ───────────────────────── │
            │ employee_id (PK)          │
            │ employee_code (UQ)        │
            │ work_email (UQ)           │
            │ department_id (FK)        │
            │ job_position_id (FK)      │
            │ status                    │
            └───────────────────────────┘
```

---

## 15. Design Decisions & Trade-offs
1. **Soft Deactivation Over Deletion**: Retaining inactive employees preserves historic context for payroll run calculations (F4) and attendance tracking without corrupting database foreign keys.
2. **Dynamic Dependent Dropdowns**: Populating job positions dynamically based on department selection prevents user error (e.g. assigning a Marketing title to an Engineering employee).
3. **No Migration / Zero Schema Changes**: Reused existing production `employees` database table to guarantee 100% backward compatibility and eliminate risks of database reset during hackathon evaluations.

---

## 16. Reviewer / Interview Q&A

### Q1: What does Feature F3 achieve in PeoplePay360?
**A**: Feature F3 implements full Employee Management, allowing authorized HR and Admin users to manage employee profiles and link them to departments and job positions built in Feature F2.

### Q2: Which HTTP endpoints were added for Employee Management?
**A**: Four core RESTful endpoints: `GET /api/employees`, `GET /api/employees/:id`, `POST /api/employees`, and `PUT /api/employees/:id`.

### Q3: Why is there no `DELETE /api/employees/:id` endpoint?
**A**: To protect historical integrity. Deleting employee records destroys payroll and attendance history. Instead, we use soft deactivation (`status = INACTIVE`).

### Q4: How is Role-Based Access Control (RBAC) enforced on the backend?
**A**: Using the `authorize` middleware. `SYSTEM_ADMIN` and `HR_ADMIN` have full read/write access; `PAYROLL_OFFICER` has read access; `EMPLOYEE` receives a 403 Forbidden.

### Q5: How is RBAC enforced on the frontend?
**A**: Route protection uses `<ProtectedRoute requiredRoles={['SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER']}>` around `/employees`. `Navbar.jsx` also conditionally renders the link.

### Q6: How does the backend prevent JavaScript BigInt precision truncation errors?
**A**: Prisma reads 64-bit BigInt IDs from PostgreSQL. We pass response payloads through a BigInt formatter utility that converts BigInt integers into safe string representations.

### Q7: How does the frontend handle dependent department/job position dropdowns?
**A**: When a department is selected in the employee form, an API request (`GET /api/job-positions?department_id=X`) fetches only job positions assigned to that department.

### Q8: What database schema changes were required for F3?
**A**: Zero schema changes were required. We inspected and reused the existing `employees` table in `schema.prisma`.

### Q9: How are duplicate employee codes or work emails prevented?
**A**: Both at the database constraint level and in backend controller logic, which checks for existing records and returns a `409 Conflict` response with clear error messages.

### Q10: How does text search work in `GET /api/employees`?
**A**: The controller parses the `search` query parameter and applies Prisma `OR` filters across `first_name`, `last_name`, `work_email`, and `employee_code` using `contains` with `mode: 'insensitive'`.

### Q11: What validation library is used on the backend?
**A**: **Zod** is used to validate all incoming JSON request bodies and query parameters.

### Q12: How are invalid foreign keys handled during employee creation?
**A**: The controller queries the target `department_id` and `job_position_id` in Prisma before creation. If either is missing, it returns a `404 Not Found` response.

### Q13: What employment types are supported?
**A**: `FULL_TIME`, `PART_TIME`, `CONTRACT`, and `INTERN`.

### Q14: What statuses can an employee have?
**A**: `ACTIVE`, `INACTIVE`, `PROBATION`, and `TERMINATED`.

### Q15: How does the UI indicate loading and error states?
**A**: The page includes dedicated spinner loading states during asynchronous API calls and displays visual banner error alerts if an API call fails.

### Q16: How did you test the backend endpoints?
**A**: By expanding `backend/test-e2e.js` with 17 new assertions covering authenticated/unauthenticated access, validation errors, foreign key errors, RBAC restrictions, filtering, creation, and updating.

### Q17: How did you verify the frontend build?
**A**: By running `npm run build` using Vite, ensuring zero compiler or syntax errors.

### Q18: What summary metrics are displayed at the top of the Employees page?
**A**: Cards for Total Employees, Active Employees, and Inactive Employees calculated dynamically from the fetched employee list.

### Q19: Is employee password or user account creation part of F3?
**A**: No. Authentication and user accounts are kept strictly separate from HR employee profiles to maintain separation of concerns.

### Q20: How does this implementation fit into the broader PeoplePay360 architecture?
**A**: It bridges core organization structure (F2 Departments & Positions) with downstream payroll runs (F4) and attendance tracking, serving as the core employee repository.

---

## 17. 60-Second Elevator Summary
> "Feature F3 introduces complete Employee Management to PeoplePay360. Built cleanly on our existing PostgreSQL schema without disruptive migrations, it allows HR Admins and System Admins to manage workforce profiles, search and filter personnel, and assign employees to their respective departments and job positions. We implemented strict Zod schema validation, safe BigInt JSON serialization, and robust RBAC checks across four RESTful API endpoints and a responsive React frontend page featuring metric cards and dynamic dependent position dropdowns. The entire suite was validated with 42 automated E2E tests and a production build."
