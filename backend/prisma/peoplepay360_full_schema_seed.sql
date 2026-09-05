
-- ================================================================
-- PeoplePay360 - PostgreSQL schema + synthetic real-world seed data
-- PostgreSQL 14+ / tested for modern PostgreSQL syntax
-- Creates 100 users/employees and data in every core table.
--
-- IMPORTANT:
-- This script creates LOWERCASE table `users`.
-- If your starter already has Prisma's quoted table "User", it can
-- coexist. Do not delete _prisma_migrations manually.
-- ================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ================================================================
-- CLEAN RE-RUN SECTION
-- Drops only PeoplePay360 tables/views/functions created by this file.
-- It DOES NOT drop Prisma's "_prisma_migrations" or quoted "User".
-- ================================================================

DROP VIEW IF EXISTS v_monthly_salary_trend CASCADE;
DROP VIEW IF EXISTS v_department_salary_costs CASCADE;
DROP VIEW IF EXISTS v_dashboard_summary CASCADE;
DROP VIEW IF EXISTS v_attendance_overview CASCADE;
DROP VIEW IF EXISTS v_leave_balances CASCADE;
DROP VIEW IF EXISTS v_current_contracts CASCADE;

DROP TABLE IF EXISTS payroll_warnings CASCADE;
DROP TABLE IF EXISTS payslip_lines CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payrun_employees CASCADE;
DROP TABLE IF EXISTS payruns CASCADE;
DROP TABLE IF EXISTS salary_structure_rules CASCADE;
DROP TABLE IF EXISTS salary_rules CASCADE;
DROP TABLE IF EXISTS salary_structures CASCADE;
DROP TABLE IF EXISTS time_off_requests CASCADE;
DROP TABLE IF EXISTS time_off_allocations CASCADE;
DROP TABLE IF EXISTS time_off_types CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS working_schedule_lines CASCADE;
DROP TABLE IF EXISTS working_schedules CASCADE;
DROP TABLE IF EXISTS job_positions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Clean old starter kit objects
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- ================================================================
-- 1. RBAC
-- ================================================================

CREATE TABLE roles (
    role_id       SMALLSERIAL PRIMARY KEY,
    role_name     VARCHAR(40) NOT NULL UNIQUE,
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    user_id        BIGSERIAL PRIMARY KEY,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    role_id        SMALLINT NOT NULL REFERENCES roles(role_id),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. HR MASTER DATA
-- ================================================================

CREATE TABLE departments (
    department_id    BIGSERIAL PRIMARY KEY,
    department_name  VARCHAR(100) NOT NULL UNIQUE,
    description      TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_positions (
    job_position_id  BIGSERIAL PRIMARY KEY,
    department_id    BIGINT NOT NULL REFERENCES departments(department_id),
    title            VARCHAR(120) NOT NULL,
    description      TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (department_id, title)
);

CREATE TABLE working_schedules (
    schedule_id     BIGSERIAL PRIMARY KEY,
    schedule_name   VARCHAR(100) NOT NULL UNIQUE,
    schedule_type   VARCHAR(30) NOT NULL DEFAULT 'WEEKLY'
        CHECK (schedule_type IN ('WEEKLY')),
    weekly_hours    NUMERIC(6,2) NOT NULL DEFAULT 0
        CHECK (weekly_hours >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE working_schedule_lines (
    schedule_line_id BIGSERIAL PRIMARY KEY,
    schedule_id      BIGINT NOT NULL REFERENCES working_schedules(schedule_id) ON DELETE CASCADE,
    day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    break_minutes    INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
    worked_hours     NUMERIC(6,2) GENERATED ALWAYS AS (
        GREATEST(
            0,
            EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
            - (break_minutes / 60.0)
        )
    ) STORED,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(schedule_id, day_of_week),
    CHECK (end_time > start_time)
);

CREATE TABLE salary_structures (
    salary_structure_id BIGSERIAL PRIMARY KEY,
    structure_name      VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE salary_rules (
    salary_rule_id    BIGSERIAL PRIMARY KEY,
    rule_name         VARCHAR(120) NOT NULL,
    rule_code         VARCHAR(40) NOT NULL UNIQUE,
    category          VARCHAR(30) NOT NULL
        CHECK (category IN ('BASIC','ALLOWANCE','GROSS','DEDUCTION','NET')),
    sequence          INTEGER NOT NULL CHECK (sequence > 0),
    calculation_type  VARCHAR(20) NOT NULL
        CHECK (calculation_type IN ('FIXED','PERCENTAGE','FORMULA')),
    fixed_amount      NUMERIC(14,2),
    percentage        NUMERIC(7,4),
    base_code         VARCHAR(40),
    formula_code      VARCHAR(60),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (calculation_type = 'FIXED' AND fixed_amount IS NOT NULL)
        OR
        (calculation_type = 'PERCENTAGE' AND percentage IS NOT NULL AND base_code IS NOT NULL)
        OR
        (calculation_type = 'FORMULA' AND formula_code IS NOT NULL)
    )
);

CREATE TABLE salary_structure_rules (
    salary_structure_rule_id BIGSERIAL PRIMARY KEY,
    salary_structure_id      BIGINT NOT NULL REFERENCES salary_structures(salary_structure_id) ON DELETE CASCADE,
    salary_rule_id           BIGINT NOT NULL REFERENCES salary_rules(salary_rule_id) ON DELETE CASCADE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(salary_structure_id, salary_rule_id)
);

CREATE TABLE employees (
    employee_id         BIGSERIAL PRIMARY KEY,
    user_id             BIGINT UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
    employee_code       VARCHAR(20) NOT NULL UNIQUE,
    first_name          VARCHAR(80) NOT NULL,
    last_name           VARCHAR(80) NOT NULL,
    work_email          VARCHAR(150) NOT NULL UNIQUE,
    personal_email      VARCHAR(150),
    phone               VARCHAR(20),
    department_id       BIGINT NOT NULL REFERENCES departments(department_id),
    job_position_id     BIGINT NOT NULL REFERENCES job_positions(job_position_id),
    manager_id          BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
    schedule_id         BIGINT REFERENCES working_schedules(schedule_id),
    employment_type     VARCHAR(30) NOT NULL
        CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN')),
    joining_date        DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','INACTIVE','TERMINATED')),
    bank_name           VARCHAR(120),
    bank_account_number VARCHAR(40),
    bank_ifsc_code      VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contracts (
    contract_id         BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    contract_name       VARCHAR(150) NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE,
    department_id       BIGINT NOT NULL REFERENCES departments(department_id),
    job_position_id     BIGINT NOT NULL REFERENCES job_positions(job_position_id),
    wage                NUMERIC(14,2) NOT NULL CHECK (wage > 0),
    schedule_id         BIGINT REFERENCES working_schedules(schedule_id),
    salary_structure_id BIGINT NOT NULL REFERENCES salary_structures(salary_structure_id),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','CANCELLED')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Prevent overlapping ACTIVE contracts for one employee.
ALTER TABLE contracts
ADD CONSTRAINT no_overlapping_active_contracts
EXCLUDE USING gist (
    employee_id WITH =,
    daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
)
WHERE (status = 'ACTIVE');

-- ================================================================
-- 3. ATTENDANCE
-- ================================================================

CREATE TABLE attendance (
    attendance_id      BIGSERIAL PRIMARY KEY,
    employee_id        BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_date    DATE NOT NULL,
    check_in           TIMESTAMPTZ,
    check_out          TIMESTAMPTZ,
    worked_hours       NUMERIC(7,2) GENERATED ALWAYS AS (
        CASE
            WHEN check_in IS NOT NULL AND check_out IS NOT NULL
            THEN ROUND((EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0)::numeric, 2)
            ELSE NULL
        END
    ) STORED,
    status             VARCHAR(30) NOT NULL DEFAULT 'PRESENT'
        CHECK (status IN ('PRESENT','LATE','ABSENT','OVERTIME','MISSING_CHECKOUT','ON_LEAVE')),
    is_manual_edit     BOOLEAN NOT NULL DEFAULT FALSE,
    edited_by_user_id  BIGINT REFERENCES users(user_id),
    edit_reason        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, attendance_date),
    CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in)
);

-- ================================================================
-- 4. TIME OFF
-- ================================================================

CREATE TABLE time_off_types (
    time_off_type_id    BIGSERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    unit                VARCHAR(10) NOT NULL CHECK (unit IN ('DAYS','HOURS')),
    requires_allocation BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval   BOOLEAN NOT NULL DEFAULT TRUE,
    payroll_integration BOOLEAN NOT NULL DEFAULT TRUE,
    is_paid             BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE time_off_allocations (
    allocation_id       BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    time_off_type_id    BIGINT NOT NULL REFERENCES time_off_types(time_off_type_id),
    allocated_amount    NUMERIC(8,2) NOT NULL CHECK (allocated_amount >= 0),
    valid_from          DATE NOT NULL,
    valid_to            DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
        CHECK (status IN ('PENDING','APPROVED','REFUSED')),
    approved_by_user_id BIGINT REFERENCES users(user_id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to >= valid_from),
    UNIQUE(employee_id, time_off_type_id, valid_from, valid_to)
);

CREATE TABLE time_off_requests (
    request_id          BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    time_off_type_id    BIGINT NOT NULL REFERENCES time_off_types(time_off_type_id),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    duration            NUMERIC(8,2) NOT NULL CHECK (duration > 0),
    reason              TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','APPROVED','REFUSED')),
    approved_by_user_id BIGINT REFERENCES users(user_id),
    approved_at         TIMESTAMPTZ,
    refusal_reason      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

-- ================================================================
-- 5. PAYROLL PROCESSING
-- ================================================================

CREATE TABLE payruns (
    payrun_id            BIGSERIAL PRIMARY KEY,
    payrun_name          VARCHAR(150) NOT NULL,
    salary_structure_id  BIGINT NOT NULL REFERENCES salary_structures(salary_structure_id),
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','COMPUTED','VALIDATED','PAID')),
    created_by_user_id   BIGINT NOT NULL REFERENCES users(user_id),
    computed_at          TIMESTAMPTZ,
    validated_at         TIMESTAMPTZ,
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end >= period_start),
    UNIQUE(salary_structure_id, period_start, period_end)
);

CREATE TABLE payrun_employees (
    payrun_employee_id BIGSERIAL PRIMARY KEY,
    payrun_id          BIGINT NOT NULL REFERENCES payruns(payrun_id) ON DELETE CASCADE,
    employee_id        BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payrun_id, employee_id)
);

CREATE TABLE payslips (
    payslip_id          BIGSERIAL PRIMARY KEY,
    payrun_id           BIGINT NOT NULL REFERENCES payruns(payrun_id) ON DELETE CASCADE,
    employee_id         BIGINT NOT NULL REFERENCES employees(employee_id),
    contract_id         BIGINT NOT NULL REFERENCES contracts(contract_id),
    salary_structure_id BIGINT NOT NULL REFERENCES salary_structures(salary_structure_id),
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    worked_days         NUMERIC(7,2) NOT NULL DEFAULT 0,
    worked_hours        NUMERIC(8,2) NOT NULL DEFAULT 0,
    gross_salary        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_deductions    NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_salary          NUMERIC(14,2) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','COMPUTED','VALIDATED','PAID')),
    generated_at        TIMESTAMPTZ,
    validated_at        TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,
    pdf_path            TEXT,
    email_sent_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payrun_id, employee_id),
    CHECK (period_end >= period_start)
);

CREATE TABLE payslip_lines (
    payslip_line_id BIGSERIAL PRIMARY KEY,
    payslip_id      BIGINT NOT NULL REFERENCES payslips(payslip_id) ON DELETE CASCADE,
    salary_rule_id  BIGINT NOT NULL REFERENCES salary_rules(salary_rule_id),
    rule_name       VARCHAR(120) NOT NULL,
    rule_code       VARCHAR(40) NOT NULL,
    category        VARCHAR(30) NOT NULL,
    sequence        INTEGER NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payslip_id, salary_rule_id)
);

CREATE TABLE payroll_warnings (
    warning_id             BIGSERIAL PRIMARY KEY,
    payrun_id              BIGINT NOT NULL REFERENCES payruns(payrun_id) ON DELETE CASCADE,
    payslip_id             BIGINT REFERENCES payslips(payslip_id) ON DELETE CASCADE,
    employee_id            BIGINT NOT NULL REFERENCES employees(employee_id),
    warning_type           VARCHAR(50) NOT NULL,
    warning_message        TEXT NOT NULL,
    severity               VARCHAR(15) NOT NULL DEFAULT 'WARNING'
        CHECK (severity IN ('INFO','WARNING','BLOCKER')),
    is_resolved            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at            TIMESTAMPTZ,
    resolved_by_user_id    BIGINT REFERENCES users(user_id)
);

-- ================================================================
-- 6. INDEXES
-- ================================================================

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_contracts_employee_dates ON contracts(employee_id, start_date, end_date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX idx_timeoff_request_employee_status ON time_off_requests(employee_id, status);
CREATE INDEX idx_timeoff_allocation_employee_type ON time_off_allocations(employee_id, time_off_type_id);
CREATE INDEX idx_structure_rules_structure ON salary_structure_rules(salary_structure_id);
CREATE INDEX idx_payrun_period ON payruns(period_start, period_end);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_payrun ON payslips(payrun_id);

-- ================================================================
-- 7. REAL-TIME BUSINESS LOGIC
-- ================================================================

-- Recalculate weekly hours whenever schedule lines change.
CREATE OR REPLACE FUNCTION recalc_weekly_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule_id BIGINT;
BEGIN
    v_schedule_id := COALESCE(NEW.schedule_id, OLD.schedule_id);

    UPDATE working_schedules ws
       SET weekly_hours = COALESCE((
           SELECT SUM(wsl.worked_hours)
             FROM working_schedule_lines wsl
            WHERE wsl.schedule_id = v_schedule_id
       ), 0),
       updated_at = now()
     WHERE ws.schedule_id = v_schedule_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_weekly_hours
AFTER INSERT OR UPDATE OR DELETE ON working_schedule_lines
FOR EACH ROW EXECUTE FUNCTION recalc_weekly_hours();

-- Dynamic leave balance: approved allocations minus approved requests.
CREATE VIEW v_leave_balances AS
SELECT
    a.allocation_id,
    a.employee_id,
    a.time_off_type_id,
    t.name AS time_off_type,
    a.valid_from,
    a.valid_to,
    a.allocated_amount,
    COALESCE(SUM(r.duration) FILTER (
        WHERE r.status = 'APPROVED'
          AND r.start_date >= a.valid_from
          AND r.end_date <= a.valid_to
    ), 0) AS taken_amount,
    a.allocated_amount -
    COALESCE(SUM(r.duration) FILTER (
        WHERE r.status = 'APPROVED'
          AND r.start_date >= a.valid_from
          AND r.end_date <= a.valid_to
    ), 0) AS remaining_amount
FROM time_off_allocations a
JOIN time_off_types t ON t.time_off_type_id = a.time_off_type_id
LEFT JOIN time_off_requests r
       ON r.employee_id = a.employee_id
      AND r.time_off_type_id = a.time_off_type_id
WHERE a.status = 'APPROVED'
GROUP BY a.allocation_id, a.employee_id, a.time_off_type_id,
         t.name, a.valid_from, a.valid_to, a.allocated_amount;

-- Validate leave requests before approval.
CREATE OR REPLACE FUNCTION validate_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_requires_allocation BOOLEAN;
    v_remaining NUMERIC(8,2);
BEGIN
    IF NEW.status = 'APPROVED' AND (OLD.status IS DISTINCT FROM 'APPROVED') THEN
        SELECT requires_allocation
          INTO v_requires_allocation
          FROM time_off_types
         WHERE time_off_type_id = NEW.time_off_type_id;

        IF v_requires_allocation THEN
            SELECT remaining_amount
              INTO v_remaining
              FROM v_leave_balances
             WHERE employee_id = NEW.employee_id
               AND time_off_type_id = NEW.time_off_type_id
               AND NEW.start_date >= valid_from
               AND NEW.end_date <= valid_to
             ORDER BY valid_from DESC
             LIMIT 1;

            IF v_remaining IS NULL THEN
                RAISE EXCEPTION 'No approved leave allocation exists for this employee and leave type.';
            END IF;

            IF NEW.duration > v_remaining THEN
                RAISE EXCEPTION 'Insufficient leave balance. Requested: %, Remaining: %',
                    NEW.duration, v_remaining;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_leave_request
BEFORE UPDATE OF status ON time_off_requests
FOR EACH ROW EXECUTE FUNCTION validate_leave_request();

-- Current applicable contract view.
CREATE VIEW v_current_contracts AS
SELECT DISTINCT ON (c.employee_id)
    c.*
FROM contracts c
WHERE c.status = 'ACTIVE'
  AND c.start_date <= CURRENT_DATE
  AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
ORDER BY c.employee_id, c.start_date DESC;

-- Helper: count weekdays in a date range.
CREATE OR REPLACE FUNCTION weekdays_between(p_start DATE, p_end DATE)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM generate_series(p_start, p_end, interval '1 day') d
    WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5;
$$;

-- Payroll warning generator.
CREATE OR REPLACE FUNCTION refresh_payroll_warnings(p_payrun_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_start DATE;
    v_end DATE;
BEGIN
    SELECT period_start, period_end
      INTO v_start, v_end
      FROM payruns
     WHERE payrun_id = p_payrun_id;

    DELETE FROM payroll_warnings WHERE payrun_id = p_payrun_id;

    -- Missing bank details
    INSERT INTO payroll_warnings
        (payrun_id, employee_id, warning_type, warning_message, severity)
    SELECT p_payrun_id, e.employee_id,
           'MISSING_BANK_DETAILS',
           'Bank account details are incomplete for ' || e.first_name || ' ' || e.last_name,
           'WARNING'
    FROM payrun_employees pe
    JOIN employees e ON e.employee_id = pe.employee_id
    WHERE pe.payrun_id = p_payrun_id
      AND (
          NULLIF(BTRIM(e.bank_name), '') IS NULL OR
          NULLIF(BTRIM(e.bank_account_number), '') IS NULL OR
          NULLIF(BTRIM(e.bank_ifsc_code), '') IS NULL
      );

    -- Missing applicable contract
    INSERT INTO payroll_warnings
        (payrun_id, employee_id, warning_type, warning_message, severity)
    SELECT p_payrun_id, e.employee_id,
           'NO_APPLICABLE_CONTRACT',
           'No applicable active contract exists for payroll period.',
           'BLOCKER'
    FROM payrun_employees pe
    JOIN employees e ON e.employee_id = pe.employee_id
    WHERE pe.payrun_id = p_payrun_id
      AND NOT EXISTS (
          SELECT 1
          FROM contracts c
          WHERE c.employee_id = e.employee_id
            AND c.status = 'ACTIVE'
            AND c.start_date <= v_start
            AND (c.end_date IS NULL OR c.end_date >= v_end)
      );

    -- Missing checkout inside payroll period
    INSERT INTO payroll_warnings
        (payrun_id, employee_id, warning_type, warning_message, severity)
    SELECT DISTINCT p_payrun_id, a.employee_id,
           'MISSING_CHECKOUT',
           'One or more attendance records have a missing checkout in the payroll period.',
           'WARNING'
    FROM attendance a
    JOIN payrun_employees pe ON pe.employee_id = a.employee_id
    WHERE pe.payrun_id = p_payrun_id
      AND a.attendance_date BETWEEN v_start AND v_end
      AND a.check_in IS NOT NULL
      AND a.check_out IS NULL;
END;
$$;

-- Compute one employee payslip from contract + salary structure + salary rules.
CREATE OR REPLACE FUNCTION compute_employee_payslip(
    p_payrun_id BIGINT,
    p_employee_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_period_start DATE;
    v_period_end DATE;
    v_structure_id BIGINT;
    v_contract contracts%ROWTYPE;
    v_payslip_id BIGINT;

    v_scheduled_days INTEGER;
    v_worked_days NUMERIC(7,2);
    v_worked_hours NUMERIC(8,2);
    v_unpaid_days NUMERIC(8,2);

    v_wage NUMERIC(14,2);
    v_basic NUMERIC(14,2) := 0;
    v_gross NUMERIC(14,2) := 0;
    v_deductions NUMERIC(14,2) := 0;
    v_net NUMERIC(14,2) := 0;
    v_allowances NUMERIC(14,2) := 0;
    v_amount NUMERIC(14,2);

    r RECORD;
BEGIN
    SELECT period_start, period_end, salary_structure_id
      INTO v_period_start, v_period_end, v_structure_id
      FROM payruns
     WHERE payrun_id = p_payrun_id;

    SELECT *
      INTO v_contract
      FROM contracts
     WHERE employee_id = p_employee_id
       AND status = 'ACTIVE'
       AND start_date <= v_period_start
       AND (end_date IS NULL OR end_date >= v_period_end)
     ORDER BY start_date DESC
     LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No applicable contract for employee % and payroll period.', p_employee_id;
    END IF;

    IF v_contract.salary_structure_id <> v_structure_id THEN
        RAISE EXCEPTION 'Employee % contract salary structure does not match payrun structure.', p_employee_id;
    END IF;

    v_wage := v_contract.wage;
    v_scheduled_days := weekdays_between(v_period_start, v_period_end);

    SELECT
        COUNT(*) FILTER (WHERE status IN ('PRESENT','LATE','OVERTIME'))::NUMERIC,
        COALESCE(SUM(worked_hours) FILTER (WHERE status IN ('PRESENT','LATE','OVERTIME')),0)
      INTO v_worked_days, v_worked_hours
      FROM attendance
     WHERE employee_id = p_employee_id
       AND attendance_date BETWEEN v_period_start AND v_period_end;

    SELECT COALESCE(SUM(rq.duration),0)
      INTO v_unpaid_days
      FROM time_off_requests rq
      JOIN time_off_types tt ON tt.time_off_type_id = rq.time_off_type_id
     WHERE rq.employee_id = p_employee_id
       AND rq.status = 'APPROVED'
       AND tt.is_paid = FALSE
       AND rq.start_date <= v_period_end
       AND rq.end_date >= v_period_start;

    INSERT INTO payslips (
        payrun_id, employee_id, contract_id, salary_structure_id,
        period_start, period_end, worked_days, worked_hours, status, generated_at
    )
    VALUES (
        p_payrun_id, p_employee_id, v_contract.contract_id, v_structure_id,
        v_period_start, v_period_end, v_worked_days, v_worked_hours,
        'COMPUTED', now()
    )
    ON CONFLICT (payrun_id, employee_id)
    DO UPDATE SET
        contract_id = EXCLUDED.contract_id,
        salary_structure_id = EXCLUDED.salary_structure_id,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        worked_days = EXCLUDED.worked_days,
        worked_hours = EXCLUDED.worked_hours,
        gross_salary = 0,
        total_deductions = 0,
        net_salary = 0,
        status = 'COMPUTED',
        generated_at = now(),
        updated_at = now()
    RETURNING payslip_id INTO v_payslip_id;

    DELETE FROM payslip_lines WHERE payslip_id = v_payslip_id;

    FOR r IN
        SELECT sr.*
        FROM salary_structure_rules ssr
        JOIN salary_rules sr ON sr.salary_rule_id = ssr.salary_rule_id
        WHERE ssr.salary_structure_id = v_structure_id
          AND sr.is_active = TRUE
        ORDER BY sr.sequence
    LOOP
        v_amount := 0;

        IF r.calculation_type = 'FIXED' THEN
            v_amount := r.fixed_amount;

        ELSIF r.calculation_type = 'PERCENTAGE' THEN
            v_amount :=
                CASE r.base_code
                    WHEN 'WAGE'  THEN v_wage * r.percentage / 100.0
                    WHEN 'BASIC' THEN v_basic * r.percentage / 100.0
                    WHEN 'GROSS' THEN v_gross * r.percentage / 100.0
                    ELSE 0
                END;

        ELSIF r.calculation_type = 'FORMULA' THEN
            v_amount :=
                CASE r.formula_code
                    WHEN 'GROSS_EARNINGS' THEN v_basic + v_allowances
                    WHEN 'UNPAID_LEAVE_DEDUCTION' THEN
                        CASE
                            WHEN v_scheduled_days > 0
                            THEN (v_wage / v_scheduled_days) * v_unpaid_days
                            ELSE 0
                        END
                    WHEN 'NET_PAY' THEN v_gross - v_deductions
                    ELSE 0
                END;
        END IF;

        v_amount := ROUND(COALESCE(v_amount,0),2);

        IF r.category = 'BASIC' THEN
            v_basic := v_amount;
        ELSIF r.category = 'ALLOWANCE' THEN
            v_allowances := v_allowances + v_amount;
        ELSIF r.category = 'GROSS' THEN
            v_gross := v_amount;
        ELSIF r.category = 'DEDUCTION' THEN
            v_deductions := v_deductions + v_amount;
        ELSIF r.category = 'NET' THEN
            v_net := v_amount;
        END IF;

        INSERT INTO payslip_lines (
            payslip_id, salary_rule_id, rule_name, rule_code, category, sequence, amount
        )
        VALUES (
            v_payslip_id, r.salary_rule_id, r.rule_name, r.rule_code,
            r.category, r.sequence, v_amount
        );
    END LOOP;

    UPDATE payslips
       SET gross_salary = ROUND(v_gross,2),
           total_deductions = ROUND(v_deductions,2),
           net_salary = ROUND(v_net,2),
           updated_at = now()
     WHERE payslip_id = v_payslip_id;

    RETURN v_payslip_id;
END;
$$;

-- Compute all employees in a payrun.
CREATE OR REPLACE FUNCTION compute_payrun(p_payrun_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
BEGIN
    PERFORM refresh_payroll_warnings(p_payrun_id);

    IF EXISTS (
        SELECT 1 FROM payroll_warnings
        WHERE payrun_id = p_payrun_id
          AND severity = 'BLOCKER'
          AND is_resolved = FALSE
    ) THEN
        RAISE EXCEPTION 'Payrun has blocking warnings. Resolve them before computation.';
    END IF;

    FOR rec IN
        SELECT employee_id
        FROM payrun_employees
        WHERE payrun_id = p_payrun_id
        ORDER BY employee_id
    LOOP
        PERFORM compute_employee_payslip(p_payrun_id, rec.employee_id);
    END LOOP;

    UPDATE payruns
       SET status = 'COMPUTED',
           computed_at = now(),
           updated_at = now()
     WHERE payrun_id = p_payrun_id;
END;
$$;

-- Validate a payrun.
CREATE OR REPLACE FUNCTION validate_payrun(p_payrun_id BIGINT, p_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM refresh_payroll_warnings(p_payrun_id);

    IF EXISTS (
        SELECT 1 FROM payroll_warnings
        WHERE payrun_id = p_payrun_id
          AND severity = 'BLOCKER'
          AND is_resolved = FALSE
    ) THEN
        RAISE EXCEPTION 'Cannot validate payrun while blocking warnings exist.';
    END IF;

    UPDATE payslips
       SET status = 'VALIDATED',
           validated_at = now(),
           updated_at = now()
     WHERE payrun_id = p_payrun_id
       AND status = 'COMPUTED';

    UPDATE payruns
       SET status = 'VALIDATED',
           validated_at = now(),
           updated_at = now()
     WHERE payrun_id = p_payrun_id
       AND status = 'COMPUTED';
END;
$$;

-- Mark a validated payrun paid.
CREATE OR REPLACE FUNCTION mark_payrun_paid(p_payrun_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM payruns WHERE payrun_id = p_payrun_id AND status = 'VALIDATED'
    ) THEN
        RAISE EXCEPTION 'Only a VALIDATED payrun can be marked PAID.';
    END IF;

    UPDATE payslips
       SET status = 'PAID',
           paid_at = now(),
           updated_at = now()
     WHERE payrun_id = p_payrun_id
       AND status = 'VALIDATED';

    UPDATE payruns
       SET status = 'PAID',
           paid_at = now(),
           updated_at = now()
     WHERE payrun_id = p_payrun_id;
END;
$$;

-- ================================================================
-- 8. DASHBOARD / LIVE VIEWS
-- ================================================================

CREATE VIEW v_attendance_overview AS
SELECT
    attendance_date,
    COUNT(*) FILTER (WHERE status = 'PRESENT') AS present_count,
    COUNT(*) FILTER (WHERE status = 'LATE') AS late_count,
    COUNT(*) FILTER (WHERE status = 'ABSENT') AS absent_count,
    COUNT(*) FILTER (WHERE status = 'OVERTIME') AS overtime_count,
    COUNT(*) FILTER (WHERE status = 'MISSING_CHECKOUT') AS missing_checkout_count,
    COUNT(*) FILTER (WHERE is_manual_edit) AS manual_edit_count
FROM attendance
GROUP BY attendance_date;

CREATE VIEW v_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE') AS active_employees,
    (SELECT COUNT(*) FROM payslips) AS payslips_generated,
    (SELECT COALESCE(SUM(net_salary),0) FROM payslips WHERE status = 'PAID') AS total_net_salary_paid,
    (SELECT COALESCE(AVG(net_salary),0) FROM payslips WHERE status IN ('VALIDATED','PAID')) AS average_net_salary,
    (SELECT COALESCE(SUM(duration),0) FROM time_off_requests WHERE status = 'APPROVED') AS approved_time_off,
    (
        SELECT ROUND(
            100.0 * COUNT(*) FILTER (WHERE status IN ('PRESENT','LATE','OVERTIME'))
            / NULLIF(COUNT(*),0), 2
        )
        FROM attendance
        WHERE attendance_date >= date_trunc('month', CURRENT_DATE)::date
    ) AS attendance_health_percent;

CREATE VIEW v_department_salary_costs AS
SELECT
    d.department_id,
    d.department_name,
    DATE_TRUNC('month', p.period_end)::date AS payroll_month,
    SUM(p.net_salary) AS total_net_salary
FROM payslips p
JOIN employees e ON e.employee_id = p.employee_id
JOIN departments d ON d.department_id = e.department_id
WHERE p.status IN ('VALIDATED','PAID')
GROUP BY d.department_id, d.department_name, DATE_TRUNC('month', p.period_end)::date;

CREATE VIEW v_monthly_salary_trend AS
SELECT
    DATE_TRUNC('month', period_end)::date AS payroll_month,
    SUM(net_salary) AS total_net_salary,
    AVG(net_salary) AS average_net_salary,
    COUNT(*) AS payslip_count
FROM payslips
WHERE status IN ('VALIDATED','PAID')
GROUP BY DATE_TRUNC('month', period_end)::date
ORDER BY payroll_month;

-- ================================================================
-- 9. SEED MASTER DATA
-- ================================================================

INSERT INTO roles(role_name, description) VALUES
('EMPLOYEE', 'Employee self-service access'),
('HR_MANAGER', 'HR workforce management'),
('PAYROLL_USER', 'Can run payruns and manage payslips'),
('PAYROLL_MANAGER', 'Can run payroll and configure salary structures/rules'),
('ADMIN', 'Full system access');

INSERT INTO departments(department_name, description) VALUES
('Information Technology', 'Software, infrastructure and technical operations'),
('Human Resources', 'People operations and employee management'),
('Finance', 'Finance, accounting and payroll operations'),
('Sales', 'Revenue generation and customer acquisition'),
('Operations', 'Day-to-day business operations'),
('Marketing', 'Brand, content and market growth');

INSERT INTO job_positions(department_id, title)
SELECT d.department_id, x.title
FROM departments d
JOIN (
    VALUES
    ('Information Technology','Software Engineer'),
    ('Information Technology','Senior Software Engineer'),
    ('Information Technology','IT Support Engineer'),
    ('Human Resources','HR Executive'),
    ('Human Resources','HR Manager'),
    ('Finance','Payroll Executive'),
    ('Finance','Payroll Manager'),
    ('Finance','Finance Analyst'),
    ('Sales','Sales Executive'),
    ('Sales','Sales Manager'),
    ('Operations','Operations Executive'),
    ('Operations','Operations Manager'),
    ('Marketing','Marketing Executive'),
    ('Marketing','Marketing Manager')
) AS x(dept, title)
ON x.dept = d.department_name;

INSERT INTO working_schedules(schedule_name, schedule_type) VALUES
('Standard 40 Hours', 'WEEKLY'),
('Early Shift 40 Hours', 'WEEKLY'),
('Part Time 25 Hours', 'WEEKLY');

-- Standard 40h: Mon-Fri 09:00-18:00, 60m break
INSERT INTO working_schedule_lines(schedule_id, day_of_week, start_time, end_time, break_minutes)
SELECT ws.schedule_id, d, '09:00', '18:00', 60
FROM working_schedules ws
CROSS JOIN generate_series(1,5) d
WHERE ws.schedule_name = 'Standard 40 Hours';

-- Early shift: Mon-Fri 08:00-17:00, 60m break
INSERT INTO working_schedule_lines(schedule_id, day_of_week, start_time, end_time, break_minutes)
SELECT ws.schedule_id, d, '08:00', '17:00', 60
FROM working_schedules ws
CROSS JOIN generate_series(1,5) d
WHERE ws.schedule_name = 'Early Shift 40 Hours';

-- Part-time: Mon-Fri 09:00-14:00
INSERT INTO working_schedule_lines(schedule_id, day_of_week, start_time, end_time, break_minutes)
SELECT ws.schedule_id, d, '09:00', '14:00', 0
FROM working_schedules ws
CROSS JOIN generate_series(1,5) d
WHERE ws.schedule_name = 'Part Time 25 Hours';

INSERT INTO salary_structures(structure_name, description) VALUES
('Regular Salary', 'Standard full-time employee salary structure'),
('Contract Salary', 'Salary structure for contract staff'),
('Intern Salary', 'Salary structure for interns');

INSERT INTO salary_rules(rule_name, rule_code, category, sequence, calculation_type, fixed_amount, percentage, base_code, formula_code) VALUES
('Basic Salary', 'BASIC', 'BASIC', 10, 'PERCENTAGE', NULL, 60, 'WAGE', NULL),
('House Rent Allowance', 'HRA', 'ALLOWANCE', 20, 'PERCENTAGE', NULL, 30, 'BASIC', NULL),
('Travel Allowance', 'TRAVEL', 'ALLOWANCE', 30, 'FIXED', 2000, NULL, NULL, NULL),
('Special Allowance', 'SPECIAL', 'ALLOWANCE', 40, 'PERCENTAGE', NULL, 10, 'BASIC', NULL),
('Gross Salary', 'GROSS', 'GROSS', 50, 'FORMULA', NULL, NULL, NULL, 'GROSS_EARNINGS'),
('Provident Fund', 'PF', 'DEDUCTION', 60, 'PERCENTAGE', NULL, 12, 'BASIC', NULL),
('Professional Tax', 'PT', 'DEDUCTION', 70, 'FIXED', 200, NULL, NULL, NULL),
('Income Tax', 'TAX', 'DEDUCTION', 80, 'PERCENTAGE', NULL, 5, 'GROSS', NULL),
('Unpaid Leave Deduction', 'LOP', 'DEDUCTION', 90, 'FORMULA', NULL, NULL, NULL, 'UNPAID_LEAVE_DEDUCTION'),
('Net Salary', 'NET', 'NET', 100, 'FORMULA', NULL, NULL, NULL, 'NET_PAY');

-- Regular: all rules
INSERT INTO salary_structure_rules(salary_structure_id, salary_rule_id)
SELECT ss.salary_structure_id, sr.salary_rule_id
FROM salary_structures ss
CROSS JOIN salary_rules sr
WHERE ss.structure_name = 'Regular Salary';

-- Contract: BASIC, HRA, TRAVEL, GROSS, TAX, LOP, NET
INSERT INTO salary_structure_rules(salary_structure_id, salary_rule_id)
SELECT ss.salary_structure_id, sr.salary_rule_id
FROM salary_structures ss
JOIN salary_rules sr ON sr.rule_code IN ('BASIC','HRA','TRAVEL','GROSS','TAX','LOP','NET')
WHERE ss.structure_name = 'Contract Salary';

-- Intern: BASIC, TRAVEL, GROSS, LOP, NET
INSERT INTO salary_structure_rules(salary_structure_id, salary_rule_id)
SELECT ss.salary_structure_id, sr.salary_rule_id
FROM salary_structures ss
JOIN salary_rules sr ON sr.rule_code IN ('BASIC','TRAVEL','GROSS','LOP','NET')
WHERE ss.structure_name = 'Intern Salary';

INSERT INTO time_off_types(name, unit, requires_allocation, requires_approval, payroll_integration, is_paid) VALUES
('Casual Leave', 'DAYS', TRUE, TRUE, TRUE, TRUE),
('Sick Leave', 'DAYS', TRUE, TRUE, TRUE, TRUE),
('Paid Leave', 'DAYS', TRUE, TRUE, TRUE, TRUE),
('Unpaid Leave', 'DAYS', FALSE, TRUE, TRUE, FALSE);

-- ================================================================
-- 10. SEED EXACTLY 100 USERS
-- Password for every seeded account: Password@123
-- Roles:
-- 1 Admin, 4 Payroll Managers, 8 Payroll Users, 7 HR Managers, 80 Employees
-- ================================================================

INSERT INTO users(email, password_hash, role_id)
SELECT
    CASE
        WHEN gs = 1 THEN 'admin@peoplepay360.demo'
        ELSE 'employee' || LPAD(gs::text,3,'0') || '@peoplepay360.demo'
    END,
    crypt('Password@123', gen_salt('bf', 10)),
    CASE
        WHEN gs = 1 THEN (SELECT role_id FROM roles WHERE role_name='ADMIN')
        WHEN gs BETWEEN 2 AND 5 THEN (SELECT role_id FROM roles WHERE role_name='PAYROLL_MANAGER')
        WHEN gs BETWEEN 6 AND 13 THEN (SELECT role_id FROM roles WHERE role_name='PAYROLL_USER')
        WHEN gs BETWEEN 14 AND 20 THEN (SELECT role_id FROM roles WHERE role_name='HR_MANAGER')
        ELSE (SELECT role_id FROM roles WHERE role_name='EMPLOYEE')
    END
FROM generate_series(1,100) gs;

-- ================================================================
-- 11. SEED 100 EMPLOYEES
-- ================================================================

WITH name_data AS (
    SELECT
        gs,
        (ARRAY['Aarav','Vivaan','Aditya','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan','Shaurya',
               'Diya','Ananya','Aadhya','Myra','Sara','Ira','Kiara','Riya','Meera','Anika'])[((gs-1)%20)+1] AS first_name,
        (ARRAY['Sharma','Patel','Nair','Singh','Mehta','Shah','Kulkarni','Iyer','Joshi','Verma',
               'Desai','Rao','Kapoor','Mishra','Jain','Menon','Agarwal','Bhat','Malhotra','Reddy'])[((gs*3-1)%20)+1] AS last_name
    FROM generate_series(1,100) gs
),
base AS (
    SELECT
        nd.*,
        u.user_id,
        CASE
            WHEN nd.gs BETWEEN 1 AND 20 THEN 'Human Resources'
            WHEN nd.gs BETWEEN 21 AND 40 THEN 'Information Technology'
            WHEN nd.gs BETWEEN 41 AND 55 THEN 'Finance'
            WHEN nd.gs BETWEEN 56 AND 72 THEN 'Sales'
            WHEN nd.gs BETWEEN 73 AND 87 THEN 'Operations'
            ELSE 'Marketing'
        END AS dept_name
    FROM name_data nd
    JOIN users u ON u.user_id = nd.gs
)
INSERT INTO employees(
    user_id, employee_code, first_name, last_name, work_email, personal_email, phone,
    department_id, job_position_id, schedule_id, employment_type, joining_date, status,
    bank_name, bank_account_number, bank_ifsc_code
)
SELECT
    b.user_id,
    'EMP' || LPAD(b.gs::text,4,'0'),
    b.first_name,
    b.last_name,
    u.email,
    LOWER(b.first_name || '.' || b.last_name || b.gs || '@mail.demo'),
    '+91' || (9000000000 + b.gs)::text,
    d.department_id,
    (
        SELECT jp.job_position_id
        FROM job_positions jp
        WHERE jp.department_id = d.department_id
        ORDER BY jp.job_position_id
        OFFSET ((b.gs - 1) % GREATEST((SELECT COUNT(*) FROM job_positions j2 WHERE j2.department_id=d.department_id),1))
        LIMIT 1
    ),
    CASE
        WHEN b.gs % 10 = 0 THEN (SELECT schedule_id FROM working_schedules WHERE schedule_name='Part Time 25 Hours')
        WHEN b.gs % 7 = 0 THEN (SELECT schedule_id FROM working_schedules WHERE schedule_name='Early Shift 40 Hours')
        ELSE (SELECT schedule_id FROM working_schedules WHERE schedule_name='Standard 40 Hours')
    END,
    CASE
        WHEN b.gs % 10 = 0 THEN 'INTERN'
        WHEN b.gs % 6 = 0 THEN 'CONTRACT'
        WHEN b.gs % 9 = 0 THEN 'PART_TIME'
        ELSE 'FULL_TIME'
    END,
    (CURRENT_DATE - ((200 + b.gs * 7) || ' days')::interval)::date,
    'ACTIVE',
    CASE WHEN b.gs IN (33,44,55,66,77) THEN NULL ELSE (ARRAY['HDFC Bank','ICICI Bank','State Bank of India','Axis Bank','Kotak Mahindra Bank'])[((b.gs-1)%5)+1] END,
    CASE WHEN b.gs IN (33,44,55,66,77) THEN NULL ELSE 'AC' || LPAD((100000000000 + b.gs)::text,12,'0') END,
    CASE WHEN b.gs IN (33,44,55,66,77) THEN NULL ELSE 'DEMO000' || LPAD((b.gs%1000)::text,3,'0') END
FROM base b
JOIN users u ON u.user_id = b.user_id
JOIN departments d ON d.department_name = b.dept_name;

-- Managers: first employee in each department manages others; no circular manager links.
UPDATE employees e
SET manager_id = m.manager_id
FROM (
    SELECT
        e2.employee_id,
        MIN(e2.employee_id) OVER (PARTITION BY e2.department_id) AS manager_id
    FROM employees e2
) m
WHERE e.employee_id = m.employee_id
  AND e.employee_id <> m.manager_id;

-- ================================================================
-- 12. CONTRACTS FOR ALL 100 EMPLOYEES
-- ================================================================

INSERT INTO contracts(
    employee_id, contract_name, start_date, end_date, department_id, job_position_id,
    wage, schedule_id, salary_structure_id, status
)
SELECT
    e.employee_id,
    e.first_name || ' ' || e.last_name || ' - Current Contract',
    GREATEST(e.joining_date, (CURRENT_DATE - INTERVAL '11 months')::date),
    NULL,
    e.department_id,
    e.job_position_id,
    CASE
        WHEN e.employment_type = 'INTERN' THEN 18000 + (e.employee_id % 5) * 1500
        WHEN e.employment_type = 'CONTRACT' THEN 38000 + (e.employee_id % 8) * 3500
        WHEN e.employment_type = 'PART_TIME' THEN 30000 + (e.employee_id % 6) * 2500
        ELSE
            CASE
                WHEN d.department_name = 'Information Technology' THEN 55000 + (e.employee_id % 10) * 4000
                WHEN d.department_name = 'Finance' THEN 50000 + (e.employee_id % 8) * 3500
                WHEN d.department_name = 'Sales' THEN 42000 + (e.employee_id % 8) * 3000
                WHEN d.department_name = 'Human Resources' THEN 45000 + (e.employee_id % 8) * 3000
                WHEN d.department_name = 'Operations' THEN 40000 + (e.employee_id % 8) * 2800
                ELSE 43000 + (e.employee_id % 8) * 3000
            END
    END,
    e.schedule_id,
    CASE
        WHEN e.employment_type = 'INTERN'
            THEN (SELECT salary_structure_id FROM salary_structures WHERE structure_name='Intern Salary')
        WHEN e.employment_type = 'CONTRACT'
            THEN (SELECT salary_structure_id FROM salary_structures WHERE structure_name='Contract Salary')
        ELSE
            (SELECT salary_structure_id FROM salary_structures WHERE structure_name='Regular Salary')
    END,
    'ACTIVE'
FROM employees e
JOIN departments d ON d.department_id = e.department_id;

-- Add historical contracts for 20 employees to demonstrate employment history.
INSERT INTO contracts(
    employee_id, contract_name, start_date, end_date, department_id, job_position_id,
    wage, schedule_id, salary_structure_id, status
)
SELECT
    c.employee_id,
    e.first_name || ' ' || e.last_name || ' - Previous Contract',
    c.start_date - INTERVAL '12 months',
    c.start_date - INTERVAL '1 day',
    c.department_id,
    c.job_position_id,
    ROUND(c.wage * 0.85, 2),
    c.schedule_id,
    c.salary_structure_id,
    'EXPIRED'
FROM contracts c
JOIN employees e ON e.employee_id = c.employee_id
WHERE c.status='ACTIVE'
  AND c.employee_id BETWEEN 21 AND 40;

-- ================================================================
-- 13. TIME OFF ALLOCATIONS
-- ================================================================

INSERT INTO time_off_allocations(
    employee_id, time_off_type_id, allocated_amount, valid_from, valid_to,
    status, approved_by_user_id, approved_at
)
SELECT
    e.employee_id,
    t.time_off_type_id,
    CASE t.name
        WHEN 'Casual Leave' THEN 12
        WHEN 'Sick Leave' THEN 10
        WHEN 'Paid Leave' THEN 15
    END,
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,1,1),
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,12,31),
    'APPROVED',
    (SELECT u.user_id
     FROM users u JOIN roles r ON r.role_id=u.role_id
     WHERE r.role_name='HR_MANAGER'
     ORDER BY u.user_id LIMIT 1),
    now()
FROM employees e
CROSS JOIN time_off_types t
WHERE t.requires_allocation = TRUE;

-- Create realistic leave requests for 30 employees.
INSERT INTO time_off_requests(
    employee_id, time_off_type_id, start_date, end_date, duration,
    reason, status, approved_by_user_id, approved_at, refusal_reason
)
SELECT
    e.employee_id,
    CASE
        WHEN e.employee_id % 4 = 0 THEN (SELECT time_off_type_id FROM time_off_types WHERE name='Unpaid Leave')
        WHEN e.employee_id % 3 = 0 THEN (SELECT time_off_type_id FROM time_off_types WHERE name='Sick Leave')
        ELSE (SELECT time_off_type_id FROM time_off_types WHERE name='Casual Leave')
    END,
    (date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month' + ((e.employee_id % 15)+1) * INTERVAL '1 day')::date,
    (date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month' + ((e.employee_id % 15)+1) * INTERVAL '1 day')::date,
    1,
    CASE
        WHEN e.employee_id % 4 = 0 THEN 'Personal emergency'
        WHEN e.employee_id % 3 = 0 THEN 'Medical recovery'
        ELSE 'Personal work'
    END,
    CASE
        WHEN e.employee_id % 10 = 0 THEN 'REFUSED'
        WHEN e.employee_id % 7 = 0 THEN 'PENDING'
        ELSE 'APPROVED'
    END,
    CASE
        WHEN e.employee_id % 7 = 0 THEN NULL
        ELSE (SELECT u.user_id
              FROM users u JOIN roles r ON r.role_id=u.role_id
              WHERE r.role_name='HR_MANAGER'
              ORDER BY u.user_id LIMIT 1)
    END,
    CASE WHEN e.employee_id % 7 = 0 THEN NULL ELSE now() END,
    CASE WHEN e.employee_id % 10 = 0 THEN 'Peak business workload' ELSE NULL END
FROM employees e
WHERE e.employee_id <= 30;

-- ================================================================
-- 14. ATTENDANCE
-- Previous month + current month through yesterday.
-- ================================================================

WITH dates AS (
    SELECT d::date AS work_date
    FROM generate_series(
        (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date,
        GREATEST((CURRENT_DATE - INTERVAL '1 day')::date,
                 (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date),
        INTERVAL '1 day'
    ) d
    WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5
)
INSERT INTO attendance(
    employee_id, attendance_date, check_in, check_out, status, is_manual_edit
)
SELECT
    e.employee_id,
    d.work_date,
    (d.work_date::timestamp
       + CASE
           WHEN e.schedule_id = (SELECT schedule_id FROM working_schedules WHERE schedule_name='Early Shift 40 Hours')
             THEN TIME '08:00'
           ELSE TIME '09:00'
         END
       + ((e.employee_id + EXTRACT(DAY FROM d.work_date)::int) % 35) * INTERVAL '1 minute'
    ) AT TIME ZONE 'Asia/Kolkata',
    CASE
        -- a few deliberately missing checkout rows for warning/demo
        WHEN e.employee_id IN (12,24,36) AND d.work_date = (CURRENT_DATE - INTERVAL '2 day')::date
            THEN NULL
        ELSE
            (d.work_date::timestamp
               + CASE
                   WHEN e.schedule_id = (SELECT schedule_id FROM working_schedules WHERE schedule_name='Part Time 25 Hours')
                     THEN TIME '14:00'
                   WHEN e.schedule_id = (SELECT schedule_id FROM working_schedules WHERE schedule_name='Early Shift 40 Hours')
                     THEN TIME '17:00'
                   ELSE TIME '18:00'
                 END
               + ((e.employee_id + EXTRACT(DAY FROM d.work_date)::int) % 45) * INTERVAL '1 minute'
            ) AT TIME ZONE 'Asia/Kolkata'
    END,
    CASE
        WHEN e.employee_id IN (12,24,36) AND d.work_date = (CURRENT_DATE - INTERVAL '2 day')::date
            THEN 'MISSING_CHECKOUT'
        WHEN ((e.employee_id + EXTRACT(DAY FROM d.work_date)::int) % 11) = 0
            THEN 'LATE'
        WHEN ((e.employee_id + EXTRACT(DAY FROM d.work_date)::int) % 13) = 0
            THEN 'OVERTIME'
        ELSE 'PRESENT'
    END,
    FALSE
FROM employees e
CROSS JOIN dates d;

-- Mark approved leave days as ON_LEAVE and clear punches where applicable.
UPDATE attendance a
SET status='ON_LEAVE',
    check_in=NULL,
    check_out=NULL,
    updated_at=now()
FROM time_off_requests r
WHERE r.employee_id=a.employee_id
  AND r.status='APPROVED'
  AND a.attendance_date BETWEEN r.start_date AND r.end_date;

-- ================================================================
-- 15. PAYRUNS FOR PREVIOUS MONTH
-- One per salary structure.
-- ================================================================

INSERT INTO payruns(
    payrun_name, salary_structure_id, period_start, period_end, created_by_user_id
)
SELECT
    to_char((date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date,'Mon YYYY')
      || ' - ' || ss.structure_name,
    ss.salary_structure_id,
    (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date,
    (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date,
    (SELECT u.user_id
     FROM users u JOIN roles r ON r.role_id=u.role_id
     WHERE r.role_name='PAYROLL_MANAGER'
     ORDER BY u.user_id LIMIT 1)
FROM salary_structures ss;

-- Add eligible employees to matching structure payrun.
INSERT INTO payrun_employees(payrun_id, employee_id)
SELECT p.payrun_id, c.employee_id
FROM payruns p
JOIN contracts c
  ON c.salary_structure_id = p.salary_structure_id
 AND c.status='ACTIVE'
 AND c.start_date <= p.period_start
 AND (c.end_date IS NULL OR c.end_date >= p.period_end);

-- Compute each payrun.
DO $$
DECLARE
    pr RECORD;
BEGIN
    FOR pr IN SELECT payrun_id FROM payruns ORDER BY payrun_id LOOP
        PERFORM compute_payrun(pr.payrun_id);
    END LOOP;
END $$;

-- Warnings from missing bank details are warnings, not blockers.
-- Validate + mark paid so dashboard has realistic history.
DO $$
DECLARE
    pr RECORD;
    v_pm BIGINT;
BEGIN
    SELECT u.user_id INTO v_pm
    FROM users u JOIN roles r ON r.role_id=u.role_id
    WHERE r.role_name='PAYROLL_MANAGER'
    ORDER BY u.user_id LIMIT 1;

    FOR pr IN SELECT payrun_id FROM payruns WHERE status='COMPUTED' ORDER BY payrun_id LOOP
        PERFORM validate_payrun(pr.payrun_id, v_pm);
        PERFORM mark_payrun_paid(pr.payrun_id);
    END LOOP;
END $$;

-- Simulate PDFs/emails for paid payslips.
UPDATE payslips p
SET pdf_path = '/payslips/' || p.payslip_id || '.pdf',
    email_sent_at = now()
WHERE p.status='PAID';

-- Refresh warnings after payroll state is created.
DO $$
DECLARE pr RECORD;
BEGIN
    FOR pr IN SELECT payrun_id FROM payruns LOOP
        PERFORM refresh_payroll_warnings(pr.payrun_id);
    END LOOP;
END $$;

COMMIT;

-- ================================================================
-- 16. VERIFICATION QUERIES
-- Run these after the script.
-- ================================================================

SELECT 'roles' AS table_name, COUNT(*) AS rows FROM roles
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'job_positions', COUNT(*) FROM job_positions
UNION ALL SELECT 'working_schedules', COUNT(*) FROM working_schedules
UNION ALL SELECT 'working_schedule_lines', COUNT(*) FROM working_schedule_lines
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'time_off_types', COUNT(*) FROM time_off_types
UNION ALL SELECT 'time_off_allocations', COUNT(*) FROM time_off_allocations
UNION ALL SELECT 'time_off_requests', COUNT(*) FROM time_off_requests
UNION ALL SELECT 'salary_structures', COUNT(*) FROM salary_structures
UNION ALL SELECT 'salary_rules', COUNT(*) FROM salary_rules
UNION ALL SELECT 'salary_structure_rules', COUNT(*) FROM salary_structure_rules
UNION ALL SELECT 'payruns', COUNT(*) FROM payruns
UNION ALL SELECT 'payrun_employees', COUNT(*) FROM payrun_employees
UNION ALL SELECT 'payslips', COUNT(*) FROM payslips
UNION ALL SELECT 'payslip_lines', COUNT(*) FROM payslip_lines
UNION ALL SELECT 'payroll_warnings', COUNT(*) FROM payroll_warnings
ORDER BY table_name;

SELECT * FROM v_dashboard_summary;
SELECT * FROM v_leave_balances ORDER BY employee_id, time_off_type_id LIMIT 20;
SELECT * FROM v_department_salary_costs ORDER BY payroll_month, department_name;
SELECT * FROM v_monthly_salary_trend;
SELECT * FROM payroll_warnings ORDER BY severity DESC, employee_id LIMIT 30;

-- Login credentials for demo:
-- admin@peoplepay360.demo / Password@123
-- employee002@peoplepay360.demo / Password@123
