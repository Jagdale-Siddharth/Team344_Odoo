# F1 — Authentication & Role-Based Access Control

Comprehensive documentation for Phase 1 Feature F1: Authentication and Role-Based Access Control (RBAC) in the PeoplePay360 full-stack application.

---

## 1. Feature Overview

Authentication and Role-Based Access Control (RBAC) form the security foundation of PeoplePay360. 
- **Authentication** verifies identity when a user registers or logs into the application using an email address and password. Once authenticated, a signed JSON Web Token (JWT) is issued.
- **RBAC (Authorization)** determines what resources, endpoints, and navigation options an authenticated user can access based on their assigned system role (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`, or `EMPLOYEE`).

---

## 2. Why This Feature Is Needed

Payroll and HR systems handle confidential financial data, compensation records, and sensitive employee personal information. Without strict authentication and RBAC:
1. Unauthorized users could view or tamper with salary details and attendance records.
2. Standard employees could access administrator or payroll processing controls.
3. API requests could be forged or intercepted without cryptographically verified identity tokens.

F1 guarantees that every request is authenticated via JWT and authorized on the backend before accessing sensitive endpoints or database data.

---

## 3. User Workflow

```
[User Log In]
      │
      ▼
[POST /api/auth/login] ──► [Bcrypt Password Verification]
      │
      ▼
[JWT Issued & Stored in LocalStorage]
      │
      ▼
[Axios Interceptor Attaches "Authorization: Bearer <JWT>" to Requests]
      │
      ├───────────────────────────────┐
      ▼                               ▼
[Backend: authenticate Middleware]  [Backend: authorize Middleware]
      │                               │
      ▼                               ▼
 (Verifies JWT signature &        (Checks role against required
  loads active user profile)       roles; returns 403 if unauthorized)
      │                               │
      └───────────────┬───────────────┘
                      ▼
        [Access Granted / Resource Delivered]
```

### Session Restoration Workflow
1. When the user reopens or refreshes the application, `AuthContext` checks for an existing JWT token in `localStorage`.
2. If present, `AuthContext` automatically invokes `GET /api/auth/me`.
3. The backend validates the JWT and returns current user details and employee profile metadata.
4. If the token is valid, the session is restored cleanly; if invalid or expired, the session is cleared.

### Logout Workflow
1. User clicks **Logout** in the navigation bar.
2. `logout()` is invoked in `AuthContext`.
3. `localStorage.removeItem('token')` and `localStorage.removeItem('user')` clear client storage.
4. React state (`user`, `token`) is set to `null`.
5. Protected routes automatically block further navigation and redirect the user to `/login`.

---

## 4. Roles

PeoplePay360 enforces 4 canonical roles:

| Role Name | Access Level / Responsibility |
| :--- | :--- |
| **`SYSTEM_ADMIN`** | System administrator with full operational and system configuration privileges. |
| **`HR_ADMIN`** | Human Resources administrator with employee, contract, and department management access. |
| **`PAYROLL_OFFICER`** | Payroll specialist responsible for payruns, payslips, and salary structures. |
| **`EMPLOYEE`** | Standard employee with self-service access to view personal profile and attendance. |

### Role Compatibility Normalization (`normalizeRole`)
In `authController.js` and `authMiddleware.js`, a helper function `normalizeRole()` maps legacy seed strings (`ADMIN` → `SYSTEM_ADMIN`, `HR_MANAGER` → `HR_ADMIN`, `PAYROLL_MANAGER` / `PAYROLL_USER` → `PAYROLL_OFFICER`) to ensure 100% compatibility with existing seed data without modifying database records. This normalization is strictly a compatibility helper and does not create additional application roles.

---

## 5. Frontend Implementation

- **`AuthContext`** ([AuthContext.jsx](file:///d:/Team344-Hackathon-Starter/frontend/src/context/AuthContext.jsx)):
  - Manages reactive state for `user`, `token`, `loading`, and `error`.
  - Exposes authentication actions (`login`, `register`, `logout`).
  - Provides role helpers: `isSystemAdmin`, `isHRAdmin`, `isPayrollOfficer`, `isEmployee`, `isAdmin`, and `hasRole()`.
- **Axios Interceptor** ([api.js](file:///d:/Team344-Hackathon-Starter/frontend/src/services/api.js)):
  - Request interceptor attaches `Authorization: Bearer <token>` to outbound API requests.
  - Response interceptor intercepts `401 Unauthorized` responses and automatically clears `localStorage` tokens.
- **Protected Routes** ([ProtectedRoute.jsx](file:///d:/Team344-Hackathon-Starter/frontend/src/components/ProtectedRoute.jsx)):
  - Blocks unauthenticated users and redirects to `/login` with location state preserved.
  - Compares `user.role` against required route roles, displaying an "Access Denied" message if unauthorized.
- **Navbar** ([Navbar.jsx](file:///d:/Team344-Hackathon-Starter/frontend/src/components/Navbar.jsx)):
  - Displays user profile badge (`user.email` / `user.name`), role indicator (`user.role`), and admin shield badge (`isAdmin`).

---

## 6. Backend Implementation

- **`authController.js`**: Controls registration, login credential verification, employee record linking, and `/me` responses.
- **`authRoutes.js`**: Declares endpoints (`/register`, `/login`, `/me`, `/rbac-test`) with Zod validation and authentication middlewares.
- **`authMiddleware.js`**:
  - `authenticate`: Extracts Bearer token, verifies JWT via `jsonwebtoken`, queries `prisma.users`, and attaches `req.user`.
  - `authorize(...roles)`: Verifies `req.user.role` against allowed roles. Returns **HTTP 403 Forbidden** if unauthorized.
- **Password Hashing** ([password.js](file:///d:/Team344-Hackathon-Starter/backend/src/utils/password.js)): Uses `bcryptjs` with salt rounds = 10 for password hashing and validation.
- **JWT Generation** ([jwt.js](file:///d:/Team344-Hackathon-Starter/backend/src/utils/jwt.js)): Signs tokens with minimal payload `{ id, email, role }`.

---

## 7. Database Integration

Authentication integrates directly with the shared PostgreSQL database via Prisma ORM ([schema.prisma](file:///d:/Team344-Hackathon-Starter/backend/prisma/schema.prisma)):

- **`users`**: Stores `user_id` (BigInt), `email` (unique), `password_hash`, `role_id` (FK to `roles`), `is_active`.
- **`roles`**: Stores `role_id`, `role_name` (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`, `EMPLOYEE`), and `description`.
- **`employees`**: Stores `employee_id`, `user_id` (unique FK to `users`), `work_email`, `first_name`, `last_name`.

> [!NOTE]
> Feature F1 required **zero database schema changes** and **zero new migrations**.

---

## 8. API Documentation

### 1. `POST /api/auth/register`
- **Purpose**: Creates a new user account and links an existing employee record if work email matches.
- **Request Body**:
  ```json
  {
    "email": "user@team344.com",
    "password": "Password123!",
    "name": "First Last"
  }
  ```
- **Validation**: Email format required, password min length 6.
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "<JWT_TOKEN>",
    "user": {
      "id": "10",
      "email": "user@team344.com",
      "role": "EMPLOYEE",
      "name": "First Last",
      "employee": null
    }
  }
  ```
- **Errors**: `400 Bad Request` (Validation error), `409 Conflict` (Email already registered).

### 2. `POST /api/auth/login`
- **Purpose**: Authenticates credentials and issues a signed JWT.
- **Request Body**:
  ```json
  {
    "email": "user@team344.com",
    "password": "Password123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "token": "<JWT_TOKEN>",
    "user": {
      "id": "10",
      "email": "user@team344.com",
      "role": "EMPLOYEE",
      "employee": null
    }
  }
  ```
- **Errors**: `401 Unauthorized` (Invalid email or password).

### 3. `GET /api/auth/me`
- **Purpose**: Restores user session and returns current authenticated user details.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "10",
      "email": "user@team344.com",
      "role": "EMPLOYEE",
      "employee": null
    }
  }
  ```
- **Errors**: `401 Unauthorized` (Missing, expired, or malformed JWT).

### 4. `GET /api/auth/rbac-test`
- **Purpose**: Lightweight verification endpoint to test RBAC role authorization.
- **Protected Roles**: `SYSTEM_ADMIN`, `HR_ADMIN`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Access granted to admin route.",
    "user": { "id": "1", "role": "SYSTEM_ADMIN" }
  }
  ```
- **Unauthorized Response (403 Forbidden)**:
  ```json
  {
    "success": false,
    "message": "Forbidden. Requires one of the following roles: SYSTEM_ADMIN, HR_ADMIN"
  }
  ```

---

## 9. Business Rules

1. Every protected endpoint requires a cryptographically valid JWT in `Authorization: Bearer <token>`.
2. Every user possesses exactly one active role (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`, or `EMPLOYEE`).
3. Backend RBAC is authoritative; frontend navigation hiding is for user experience only.
4. `EMPLOYEE` users cannot access administrative or payroll endpoints.
5. Password hashes are **never** returned in API responses.
6. Duplicate email registrations are rejected with `409 Conflict`.

---

## 10. Security Implementation

- **Bcrypt Hashing**: Passwords stored as salted hashes (`bcryptjs`, 10 rounds).
- **JWT Identity**: Minimal payload (`id`, `email`, `role`), verifiable signature.
- **Backend Authorization**: `authorize(...roles)` enforced at API level.
- **401 vs 403 Separation**: Distinct HTTP status codes for missing authentication (401) versus insufficient permissions (403).
- **Zero Secrets Tracked**: `.env` is un-tracked by Git; secrets loaded from environment variables.

---

## 11. Error Handling

- **Validation Errors (400)**: Formatted array of field-level Zod errors.
- **Invalid Credentials / Invalid Token (401)**: Generic authentication error preventing username enumeration.
- **Forbidden Role Access (403)**: Clear RBAC message listing allowed roles.
- **Duplicate User (409)**: Conflict status for duplicate email addresses.

---

## 12. Testing

### Backend E2E Test Suite (`backend/test-e2e.js`)
**Final Result**: **11 Passed, 0 Failed**

| # | Test Scenario | Expected Result | Result |
|---|:---|:---|:---:|
| 1 | Health Check (`GET /api/health`) | 200 OK, database connected | ✅ PASS |
| 2 | User Registration (`POST /api/auth/register`) | 201 Created, token issued | ✅ PASS |
| 3 | User Login (`POST /api/auth/login`) | 200 OK, token issued | ✅ PASS |
| 4 | Session Restoration (`GET /api/auth/me`) | 200 OK, valid session | ✅ PASS |
| 5 | Invalid Credentials Login | 401 Unauthorized | ✅ PASS |
| 6 | Zod Validation Error | 400 Bad Request with error array | ✅ PASS |
| 7 | Duplicate Email Registration | 409 Conflict | ✅ PASS |
| 8 | `/me` without JWT | 401 Unauthorized | ✅ PASS |
| 9 | `/me` with Malformed JWT | 401 Unauthorized | ✅ PASS |
| 10 | RBAC Unauthorized Access (`EMPLOYEE`) | 403 Forbidden | ✅ PASS |
| 11 | RBAC Authorized Access (`SYSTEM_ADMIN`) | 200 OK | ✅ PASS |

### Frontend Build
Vite production build completed with 0 errors (`dist/` generated in 31.94s).

---

## 13. Reviewer / Interview Questions & Answers

### 1. What is authentication?
Authentication is the process of verifying a user's identity (proving who they are) using credentials such as email and password.

### 2. What is authorization?
Authorization is the process of checking whether an authenticated user has permission to perform an action or access a specific resource based on their assigned role.

### 3. What is the difference between 401 Unauthorized and 403 Forbidden?
`401 Unauthorized` means authentication is missing or invalid (the system doesn't know who you are). `403 Forbidden` means you are authenticated, but your role lacks permission to access the resource.

### 4. Why use JWT for authentication?
JWTs are stateless, self-contained signed tokens. The backend can verify authenticity using a secret key without querying the session store on every request, enabling scalable API design.

### 5. Why use bcrypt for password hashing?
Bcrypt is a salted, slow hashing algorithm designed to resist brute-force and rainbow table attacks.

### 6. Where is authorization enforced in PeoplePay360?
Authorization is strictly enforced on the backend via the `authorize(...roles)` Express middleware.

### 7. Why is frontend-only role checking insecure?
Frontend code runs in the user's browser and can be manipulated. Without backend checks, an attacker could bypass frontend restrictions and call API endpoints directly.

### 8. What is Express middleware?
Middleware functions in Express execute during the request-response cycle, allowing tasks like logging, JWT verification, body parsing, and RBAC authorization before hitting controller logic.

### 9. How does the JWT reach the backend from the frontend?
The frontend Axios interceptor retrieves the JWT from `localStorage` and attaches it to the `Authorization` header as `Bearer <token>`.

### 10. What does the `/api/auth/me` endpoint do?
It validates the user's JWT and returns the current user's safe profile and employee metadata, allowing session restoration on page reload.

### 11. Why don't we return `password_hash` in API responses?
Exposing password hashes creates a serious security risk if API responses are logged or intercepted.

### 12. How does logout work in this implementation?
Logout clears `token` and `user` from `localStorage` and resets React state. Subsequent API requests will lack the Bearer token, causing protected routes to block access.

### 13. How are roles stored in PeoplePay360?
Roles are stored in the PostgreSQL `roles` table and linked to users via the `role_id` foreign key in the `users` table.

### 14. How does RBAC work in this project?
When a user logs in, their assigned role string (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`, or `EMPLOYEE`) is encoded in the JWT and verified by `authorize(...roles)` middleware.

### 15. How would you add a new role safely?
Add the role to the database `roles` table, update the role constants/helpers, and include the role string in relevant `authorize(...roles)` middlewares.

### 16. What happens if a malformed JWT is sent?
`jsonwebtoken.verify()` throws a `JsonWebTokenError`, which the `errorHandler` middleware catches and returns as `401 Unauthorized`.

### 17. How is session restoration handled on page refresh?
`AuthContext` reads the stored token on mount, invokes `/api/auth/me`, and populates user state if valid.

---

## 14. 60-Second Explanation

> "In Feature F1, we implemented Authentication and Role-Based Access Control (RBAC) for PeoplePay360. When users log in with their email and password, bcrypt verifies the credentials against our shared PostgreSQL database, issuing a minimal signed JWT containing their user ID, email, and canonical role—`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`, or `EMPLOYEE`.
>
> On the frontend, an Axios interceptor attaches this token to requests, while `AuthContext` handles session restoration and logout. On the backend, our `authenticate` middleware verifies the JWT, and `authorize(...roles)` enforces strict RBAC—returning 401 for unauthenticated requests and 403 Forbidden for unauthorized roles.
> 
> We achieved this with zero database schema changes, 100% clean production Vite build, and 11 out of 11 passing E2E tests."

---

## 15. Implementation Summary

- **Frontend Components**: `AuthContext.jsx`, `api.js`, `ProtectedRoute.jsx`, `Navbar.jsx`.
- **Backend Components**: `authController.js`, `authMiddleware.js`, `authRoutes.js`, `jwt.js`, `password.js`.
- **Database Tables**: Shared PostgreSQL `users`, `roles`, and `employees` tables (0 schema modifications).
- **Security**: Bcrypt password hashing, signed JWTs, backend RBAC middleware, 401/403 separation, zero tracked credentials.
- **Testing Status**: **11/11 E2E Tests Passed**, Frontend Build Succeeded.
