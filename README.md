# PeoplePay360 — HR & Payroll Platform

An integrated HR & Payroll platform built for the Odoo Hackathon PS, focused on **RBAC**
and a fully connected employee → contract → attendance → time off → payroll flow.

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons, Recharts
- **Backend:** Node.js, Express (ESM)
- **Database/ORM:** PostgreSQL + Prisma
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Validation:** Zod
- **Architecture:** Decoupled client/server (`frontend/` + `backend/`)

## 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally (username `postgres`, password `Madhavpostgre` is already
  wired into `backend/.env` — change it there if yours differs)

## 2. Backend Setup
```bash
cd backend
npm install
# create the database (once)
psql -U postgres -c "CREATE DATABASE peoplepay360;"
# create tables from prisma/schema.prisma
npx prisma migrate dev --name init
# seed 200 employees + contracts + attendance + time off + payroll data
npm run seed
# start the API (http://localhost:5000)
npm run dev
```

## 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```
`frontend/.env` already points `VITE_API_URL` to `http://localhost:5000/api`.

## 4. Login Credentials (from the seed script)
| Role | Email | Password |
|---|---|---|
| Admin | admin@peoplepay360.com | Admin@123 |
| HR Manager | hrmanager@peoplepay360.com | Admin@123 |
| HR Payroll User | payrolluser@peoplepay360.com | Admin@123 |
| HR Payroll Manager | payrollmanager@peoplepay360.com | Admin@123 |
| Any of the 200 seeded employees | `<their work email, printed by the seed script / visible in Employees list>` | Password@123 |

## 5. RBAC Matrix (enforced server-side in every route)
| Role | Employees/Contracts/Attendance/Schedules/TimeOff | Approve Time Off | Payruns/Payslips | Salary Structures/Rules | Users/Roles |
|---|---|---|---|---|---|
| **Admin** | Full CRUD | Yes | Full CRUD | Full CRUD | Full CRUD |
| **HR Payroll Manager** | Full CRUD | Yes | Full CRUD | Full CRUD | — |
| **HR Payroll User** | Full CRUD | Yes | Create/Read/Update | Read-only | — |
| **HR Manager** | Full CRUD | Yes | No access | No access | — |
| **Employee** | Read own record only; create own attendance & time off requests | No | Read own payslips only | No access | — |

RBAC is enforced in `backend/src/middleware/auth.js` (`authenticate` + `authorize`) and
applied per-route in every file under `backend/src/routes/`. The frontend also hides
navigation/actions per role (`frontend/src/context/AuthContext.jsx`), but the backend is
the actual source of truth — every write endpoint re-checks the role independently.

## 6. Data Model / Flow
`prisma/schema.prisma` implements the full PS data model:
- **Employee** — central hub (Kanban + List views), linked to Manager (self-relation),
  Working Schedule, Contracts, Attendance, Allocations, Time Off Requests, Payslips.
- **Contract** — historical records per employee; creating a new `RUNNING` contract
  automatically expires the employee's previous running contract, so payroll always
  resolves a single applicable contract per period.
- **WorkingSchedule / WorkingScheduleLine** — weekly day/start/end/break pattern; weekly
  hours are computed automatically, never entered manually.
- **Attendance** — check-in/check-out widget (for employees) + manual HR entry, with
  auto status detection (Present/Late/Overtime/Missing checkout).
- **TimeOffType / Allocation / TimeOffRequest** — approval workflow; approving a request
  automatically decrements the matching approved Allocation's `taken` balance.
- **SalaryStructure / SalaryRule** — ordered, sequenced rules with FIXED / PERCENTAGE /
  FORMULA computation methods (`backend/src/services/payrollEngine.js`). Nothing is
  hardcoded — every payslip amount is derived from the contract wage and the rule
  definitions at compute time.
- **Payrun / Payslip / PayslipLine** — two-step wizard (define scope+period → select
  eligible employees) creates the Payrun only after employee selection; processing
  actions are Compute → Validate → Mark Paid, plus Send Payslips (bulk-email
  integration point) and a printable Payslip PDF view (`window.print()`).
- **Dashboard** — aggregates live data (no hardcoded numbers) across Employees,
  Attendance, Time Off and Payroll, filterable by Department/Employee Type/Period.

## 7. Seed Data
`backend/prisma/seed.js` generates:
- 3 Working Schedules (Full-time 40h/week, Part-time 20h/week, Flexible)
- 2 Salary Structures ("Regular Salary" with Basic/HRA/Conveyance/Special
  Allowance/PF/Professional Tax/Gross rules, and a simplified "Intern Stipend")
- 4 Time Off Types (Paid Time Off, Sick Leave, Unpaid Leave, Work From Home)
- **200 employees** across 8 departments with realistic job titles, managers,
  contracts (wages vary by role/type), ~30 days of attendance history, leave
  allocations & requests, and login users for every employee (role `EMPLOYEE`)
- 4 staff accounts, one per non-employee role

## 8. Notes on Environment Limitations During Build
This project was scaffolded and validated inside a sandboxed dev container:
- All backend/frontend source files were syntax-checked; `npm run build` for the
  frontend completed successfully with zero errors.
- PostgreSQL was installed and a `peoplepay360` DB/user created matching your
  credentials, to validate the setup path.
- Prisma's `migrate`/`generate` commands need to download engine binaries from
  Prisma's CDN, which this sandbox's network allowlist blocks — this is a
  sandbox-only restriction and will work normally on your machine with standard
  internet access. Run `npx prisma migrate dev --name init` locally to create the
  tables, then `npm run seed`.
