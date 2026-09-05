# Feature F4: Working Schedules — Technical & Architecture Documentation

## 1. Feature Overview
**Working Schedules** (Phase 1 Feature F4) introduces working schedule and shift template management for the **PeoplePay360** HR & Payroll system. It allows administrative users to configure weekly shift patterns (Monday through Sunday), specify start/end times and break durations, and view database-calculated total weekly working hours.

---

## 2. Business Workflow
```
[ Login as SYSTEM_ADMIN or HR_ADMIN ]
                ↓
  [ Access /working-schedules Route ]
                ↓
    [ Working Schedules Overview ]
   ├── View Summary Metric Cards (Total, Active, Avg Weekly Hours)
   ├── Search & Filter Schedules
   └── View Schedule Table with PostgreSQL Weekly Hours Badges
                ↓
┌───────────────────────┬───────────────────────┬───────────────────────┐
│    Create Schedule    │     Edit Schedule     │     View Details      │
├───────────────────────┼───────────────────────┼───────────────────────┤
│ 1. Enter Schedule Name│ 1. Modify Name/Status │ 1. Click "Eye" icon   │
│ 2. Set Active Status  │ 2. Update Mon-Sun     │ 2. View day-by-day    │
│ 3. Toggle Mon-Sun Days│    shift timings      │    timings & breaks   │
│ 4. Set Start/End/Break│ 3. Save updates       │ 3. View PostgreSQL    │
│ 5. Save Schedule      │                       │    weekly hours badge │
└───────────────────────┴───────────────────────┴───────────────────────┘
```

---

## 3. Database Tables Used
Feature F4 reuses the pre-existing PostgreSQL tables in the PeoplePay360 database without any schema changes or migrations:

- **`working_schedules`**:
  - `schedule_id` (BigInt, PK, Autoincrement)
  - `schedule_name` (VarChar, Unique)
  - `schedule_type` (VarChar, Default `'WEEKLY'`)
  - `weekly_hours` (Decimal(6,2), Default `0`, updated by PostgreSQL trigger `trg_recalc_weekly_hours`)
  - `is_active` (Boolean, Default `true`)
  - `created_at` & `updated_at` (Timestamptz)

- **`working_schedule_lines`**:
  - `schedule_line_id` (BigInt, PK, Autoincrement)
  - `schedule_id` (BigInt, FK -> `working_schedules.schedule_id`)
  - `day_of_week` (SmallInt, `1` = Monday ... `7` = Sunday)
  - `start_time` & `end_time` (Time(6))
  - `break_minutes` (Integer, Default `0`)
  - `worked_hours` (Decimal(6,2), generated column in PostgreSQL: `GREATEST(0, (end_time - start_time - break_minutes))`)

---

## 4. API Endpoints

### 4.1 List Working Schedules
- **Endpoint**: `GET /api/working-schedules`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`)
- **Query Params**: `search` (string), `is_active` (boolean string)
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "schedules": [
      {
        "id": "1",
        "schedule_name": "Standard 40 Hours",
        "schedule_type": "WEEKLY",
        "weekly_hours": 40,
        "is_active": true,
        "working_days_count": 5,
        "lines": [...]
      }
    ]
  }
  ```

### 4.2 Get Schedule Details by ID
- **Endpoint**: `GET /api/working-schedules/:id`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`, `PAYROLL_OFFICER`)
- **Response** (`200 OK`): Returns full schedule details including formatted daily shift lines.

### 4.3 Create Working Schedule
- **Endpoint**: `POST /api/working-schedules`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`)
- **Request Body**:
  ```json
  {
    "schedule_name": "Standard 40 Hours Shift",
    "schedule_type": "WEEKLY",
    "is_active": true,
    "lines": [
      { "day_of_week": 1, "is_working": true, "start_time": "09:00", "end_time": "18:00", "break_minutes": 60 },
      { "day_of_week": 2, "is_working": true, "start_time": "09:00", "end_time": "18:00", "break_minutes": 60 },
      { "day_of_week": 3, "is_working": true, "start_time": "09:00", "end_time": "18:00", "break_minutes": 60 },
      { "day_of_week": 4, "is_working": true, "start_time": "09:00", "end_time": "18:00", "break_minutes": 60 },
      { "day_of_week": 5, "is_working": true, "start_time": "09:00", "end_time": "18:00", "break_minutes": 60 }
    ]
  }
  ```
- **Response** (`201 Created`): Returns newly created schedule with PostgreSQL-calculated `weekly_hours`.

### 4.4 Update Working Schedule
- **Endpoint**: `PUT /api/working-schedules/:id`
- **Auth**: Required (`SYSTEM_ADMIN`, `HR_ADMIN`)
- **Response** (`200 OK`): Returns updated schedule object with re-calculated `weekly_hours`.

---

## 5. RBAC Matrix

| Role | View Schedules | Create Schedule | Edit Schedule | Access UI Route |
| :--- | :---: | :---: | :---: | :---: |
| **SYSTEM_ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **HR_ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **PAYROLL_OFFICER** | ✅ | ❌ | ❌ | ✅ (Read-Only) |
| **EMPLOYEE** | ❌ | ❌ | ❌ | ❌ (403 Forbidden) |

---

## 6. Backend Weekly-Hours Calculation Flow
Weekly working hours are **100% computed in PostgreSQL** via database triggers and generated columns, guaranteeing total data integrity:

```
[ Express API Request (POST/PUT) ]
                ↓
    [ Zod Validation & Controller ]
                ↓
[ Prisma Transaction: Save Schedule & Lines ]
                ↓
┌─────────────────────────────────────────────────────────────┐
│                 POSTGRESQL DATABASE ENGINE                  │
├─────────────────────────────────────────────────────────────┤
│ 1. working_schedule_lines computes worked_hours column:    │
│    GREATEST(0, (end_time - start_time) - break_minutes)    │
│                                                             │
│ 2. PostgreSQL trigger trg_recalc_weekly_hours executes:    │
│    UPDATE working_schedules SET weekly_hours = SUM(...)    │
└─────────────────────────────────────────────────────────────┘
                ↓
[ Controller Re-fetches Schedule & Returns JSON with weekly_hours ]
                ↓
[ React Frontend displays database-calculated weekly_hours badge ]
```

> **Reviewer Note**: React collects the schedule configuration and displays the value returned by the backend. The source of truth for weekly working hours is the PostgreSQL calculation, preventing the frontend from fabricating business-critical values.

---

## 7. Validation Rules
- `schedule_name`: Required non-empty string, max 100 chars, unique across schedules.
- `lines`: Must contain at least one enabled working day.
- `start_time` & `end_time`: Must be valid `HH:mm` 24-hour strings. `end_time` must be chronologically after `start_time`.
- `break_minutes`: Non-negative integer, must be strictly less than total shift duration.
- `day_of_week`: Integer between 1 (Monday) and 7 (Sunday); duplicate day entries in submission rejected.

---

## 8. Security Considerations
- All routes protected by `authenticate` JWT bearer token middleware.
- Role authorization strictly enforced by `authorize(...)` middleware on the backend.
- BigInt values serialized as safe string primitives to prevent 64-bit precision truncation in JavaScript runtimes.
- Database errors handled gracefully without leaking internal stack traces.

---

## 9. Testing Performed
- **Automated E2E Suite**: Extended `backend/test-e2e.js` with 16 new test cases (Tests 43–58).
- **Result**: `58 Passed, 0 Failed`.
- **Frontend Build**: Verified with `npm run build` using Vite (`13.10s`, 0 errors).

---

## 10. Reviewer / Interview Q&A

### Q1: What does Feature F4 implement?
**A**: Feature F4 implements Working Schedules management, allowing HR and System Administrators to create and edit weekly shift patterns (Mon–Sun) with automatic PostgreSQL weekly-hour calculations.

### Q2: Why are weekly hours calculated in PostgreSQL instead of React?
**A**: React collects the schedule configuration and displays the value returned by the backend. The source of truth for weekly working hours is the PostgreSQL calculation, preventing the frontend from fabricating business-critical values.

### Q3: How does PostgreSQL calculate weekly hours?
**A**: `working_schedule_lines` uses a generated column for daily worked hours: `GREATEST(0, (end_time - start_time) - break_minutes)`. The `trg_recalc_weekly_hours` trigger fires on line inserts/updates/deletes to calculate `SUM(worked_hours)` and update `weekly_hours` on `working_schedules`.

### Q4: Which roles can view working schedules?
**A**: `SYSTEM_ADMIN`, `HR_ADMIN`, and `PAYROLL_OFFICER` can view schedules. `EMPLOYEE` users receive a 403 Forbidden.

### Q5: Which roles can create or edit working schedules?
**A**: Only `SYSTEM_ADMIN` and `HR_ADMIN`. `PAYROLL_OFFICER` has read-only access.

### Q6: What schema changes were made for F4?
**A**: Zero schema changes. F4 reuses the existing `working_schedules` and `working_schedule_lines` tables in PostgreSQL.

---

## 11. 60-Second Elevator Summary
> "Feature F4 introduces Working Schedules to PeoplePay360. HR and System Admins can configure weekly shift patterns across Monday through Sunday. The core technical highlight is that weekly working hours are calculated entirely inside the PostgreSQL database engine via triggers (`recalc_weekly_hours()`), guaranteeing absolute financial and operational accuracy without relying on frontend calculations. We built full Zod schema validation, safe BigInt JSON serialization, and robust RBAC checks across four RESTful endpoints and a responsive React UI, validated by 58 automated E2E tests and a production build."
