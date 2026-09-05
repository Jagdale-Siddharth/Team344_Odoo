import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  authenticate,
  authorize,
  PAYROLL_ROLES,
  PAYROLL_CONFIG_WRITE_ROLES,
  scopeToOwnEmployee,
} from '../middleware/auth.js';
import { computePayslip, detectWarnings } from '../services/payrollEngine.js';

const router = Router();
router.use(authenticate);

// =========================================================================
// SALARY STRUCTURES
// =========================================================================
const structureSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

router.get(
  '/structures',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const structures = await prisma.salaryStructure.findMany({
      include: { _count: { select: { rules: true, contracts: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(structures);
  })
);

router.get(
  '/structures/:id',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: { rules: { orderBy: { sequence: 'asc' } } },
    });
    if (!structure) return res.status(404).json({ message: 'Structure not found' });
    res.json(structure);
  })
);

router.post(
  '/structures',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = structureSchema.parse(req.body);
    const structure = await prisma.salaryStructure.create({ data });
    res.status(201).json(structure);
  })
);

router.put(
  '/structures/:id',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = structureSchema.partial().parse(req.body);
    const structure = await prisma.salaryStructure.update({ where: { id: req.params.id }, data });
    res.json(structure);
  })
);

router.delete(
  '/structures/:id',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.salaryStructure.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// =========================================================================
// SALARY RULES
// =========================================================================
const ruleSchema = z.object({
  structureId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  category: z.enum(['BASIC', 'ALLOWANCE', 'DEDUCTION', 'GROSS', 'NET']),
  sequence: z.number().int().default(10),
  computationMethod: z.enum(['FIXED', 'PERCENTAGE', 'FORMULA']),
  amount: z.number().optional().nullable(),
  percentage: z.number().optional().nullable(),
  percentageBase: z.string().optional().nullable(),
  formula: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

router.get(
  '/rules',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const { structureId } = req.query;
    const rules = await prisma.salaryRule.findMany({
      where: structureId ? { structureId: String(structureId) } : {},
      orderBy: { sequence: 'asc' },
    });
    res.json(rules);
  })
);

router.post(
  '/rules',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = ruleSchema.parse(req.body);
    const rule = await prisma.salaryRule.create({ data });
    res.status(201).json(rule);
  })
);

router.put(
  '/rules/:id',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = ruleSchema.partial().parse(req.body);
    const rule = await prisma.salaryRule.update({ where: { id: req.params.id }, data });
    res.json(rule);
  })
);

router.delete(
  '/rules/:id',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.salaryRule.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// =========================================================================
// PAYRUN WIZARD
// =========================================================================

// Step 2 helper: eligible employees for a given scope (active + running contract)
router.get(
  '/eligible-employees',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const { employeeType, department, periodStart, periodEnd } = req.query;
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        ...(employeeType ? { employeeType: String(employeeType) } : {}),
        ...(department ? { department: String(department) } : {}),
        contracts: { some: { status: 'RUNNING' } },
      },
      include: {
        contracts: {
          where: { status: 'RUNNING' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const attendanceWhere = periodStart && periodEnd
      ? { checkIn: { gte: new Date(String(periodStart)), lte: new Date(String(periodEnd)) } }
      : null;

    const result = [];
    for (const emp of employees) {
      const contract = emp.contracts[0];
      if (!contract) continue;
      let workedHours = null;
      if (attendanceWhere) {
        const agg = await prisma.attendance.aggregate({
          where: { employeeId: emp.id, ...attendanceWhere },
          _sum: { workedHours: true },
        });
        workedHours = agg._sum.workedHours || 0;
      }
      result.push({
        id: emp.id,
        name: emp.name,
        department: emp.department,
        jobPosition: emp.jobPosition,
        employeeType: emp.employeeType,
        contractId: contract.id,
        wage: contract.wage,
        workedHours,
      });
    }
    res.json(result);
  })
);

const createPayrunSchema = z.object({
  name: z.string().min(1),
  periodStart: z.string(),
  periodEnd: z.string(),
  employeeType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional().nullable(),
  salaryStructureId: z.string().uuid(),
  employeeIds: z.array(z.string().uuid()).min(1),
});

// Create Payrun ONLY after employee selection (PS 4-B5 / 5)
router.post(
  '/payruns',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const data = createPayrunSchema.parse(req.body);

    const employees = await prisma.employee.findMany({
      where: { id: { in: data.employeeIds } },
      include: { contracts: { where: { status: 'RUNNING' }, orderBy: { startDate: 'desc' }, take: 1 } },
    });

    const payrun = await prisma.$transaction(async (tx) => {
      const created = await tx.payrun.create({
        data: {
          name: data.name,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          employeeType: data.employeeType || null,
          salaryStructureId: data.salaryStructureId,
          status: 'DRAFT',
        },
      });

      for (const emp of employees) {
        const contract = emp.contracts[0] || null;
        const existingCount = await tx.payslip.count({ where: { employeeId: emp.id, payrun: { periodStart: created.periodStart, periodEnd: created.periodEnd } } });
        const warnings = detectWarnings({ employee: emp, contract, existingPayslipCount: existingCount });
        await tx.payslip.create({
          data: {
            payrunId: created.id,
            employeeId: emp.id,
            contractId: contract?.id || null,
            salaryStructureId: data.salaryStructureId,
            periodStart: created.periodStart,
            periodEnd: created.periodEnd,
            status: 'DRAFT',
            warnings,
          },
        });
      }
      return created;
    });

    res.status(201).json(payrun);
  })
);

router.get(
  '/payruns',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const payruns = await prisma.payrun.findMany({
      include: { salaryStructure: { select: { id: true, name: true } }, _count: { select: { payslips: true } } },
      orderBy: { periodStart: 'desc' },
    });
    res.json(payruns);
  })
);

router.get(
  '/payruns/:id',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: {
        salaryStructure: true,
        payslips: {
          include: { employee: { select: { id: true, name: true, department: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
    res.json(payrun);
  })
);

// ---- Processing actions: Compute -> Validate -> Mark Paid ----

router.post(
  '/payruns/:id/compute',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: {
        salaryStructure: { include: { rules: true } },
        payslips: { include: { contract: true, employee: true } },
      },
    });
    if (!payrun) return res.status(404).json({ message: 'Payrun not found' });

    const totalDays = Math.max(
      Math.round((payrun.periodEnd - payrun.periodStart) / 86400000) + 1,
      1
    );

    for (const payslip of payrun.payslips) {
      const wage = payslip.contract?.wage ?? 0;

      let workedDays = totalDays;
      const agg = await prisma.attendance.aggregate({
        where: {
          employeeId: payslip.employeeId,
          checkIn: { gte: payrun.periodStart, lte: payrun.periodEnd },
        },
        _sum: { workedHours: true },
      });
      if (agg._sum.workedHours != null) {
        workedDays = Math.min(Math.round((agg._sum.workedHours / 8) * 100) / 100, totalDays);
      }

      const { lines, basic, allowances, deductions, gross, net } = computePayslip({
        wage,
        workedDays,
        totalDays,
        rules: payslip.contract ? payrun.salaryStructure.rules : [],
      });

      const warnings = detectWarnings({
        employee: payslip.employee,
        contract: payslip.contract,
        existingPayslipCount: 0,
      });

      await prisma.$transaction(async (tx) => {
        await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            workedDays,
            basic,
            allowances,
            deductions,
            gross,
            net,
            status: 'COMPUTED',
            warnings,
            lines: { create: lines },
          },
        });
      });
    }

    const updated = await prisma.payrun.update({ where: { id: req.params.id }, data: { status: 'COMPUTED' } });
    res.json(updated);
  })
);

router.post(
  '/payruns/:id/validate',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.payslip.updateMany({ where: { payrunId: req.params.id }, data: { status: 'VALIDATED' } });
    const payrun = await prisma.payrun.update({ where: { id: req.params.id }, data: { status: 'VALIDATED' } });
    res.json(payrun);
  })
);

router.post(
  '/payruns/:id/mark-paid',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.payslip.updateMany({ where: { payrunId: req.params.id }, data: { status: 'PAID' } });
    const payrun = await prisma.payrun.update({ where: { id: req.params.id }, data: { status: 'PAID' } });
    res.json(payrun);
  })
);

// Bulk "send payslips" - integration point for a real mailer (e.g. nodemailer/SES).
router.post(
  '/payruns/:id/send-payslips',
  authorize(...PAYROLL_ROLES),
  asyncHandler(async (req, res) => {
    const payslips = await prisma.payslip.findMany({
      where: { payrunId: req.params.id },
      include: { employee: { select: { name: true, workEmail: true } } },
    });
    // NOTE: plug an actual email provider here. For now we simulate delivery.
    const sent = payslips.map((p) => ({ employee: p.employee.name, email: p.employee.workEmail, sent: true }));
    res.json({ message: `Payslips queued for ${sent.length} employees`, sent });
  })
);

router.delete(
  '/payruns/:id',
  authorize(...PAYROLL_CONFIG_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.payrun.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// =========================================================================
// PAYSLIPS
// =========================================================================

router.get(
  '/payslips',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    if (ownId === null && !PAYROLL_ROLES.includes(req.user.role) && req.user.role !== 'HR_MANAGER') {
      // HR_MANAGER has no payroll access per spec; only payroll roles or own employee see payslips
    }
    const isPayrollRole = PAYROLL_ROLES.includes(req.user.role);
    if (!isPayrollRole && !ownId) return res.status(403).json({ message: 'Not allowed' });

    const { employeeId, status, payrunId } = req.query;
    const where = {
      ...(ownId ? { employeeId: ownId } : {}),
      ...(employeeId && isPayrollRole ? { employeeId: String(employeeId) } : {}),
      ...(status ? { status } : {}),
      ...(payrunId ? { payrunId: String(payrunId) } : {}),
    };
    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true } },
        payrun: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payslips);
  })
);

router.get(
  '/payslips/:id',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: true,
        contract: true,
        salaryStructure: true,
        payrun: true,
        lines: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    if (ownId && ownId !== payslip.employeeId) return res.status(403).json({ message: 'Not allowed' });
    res.json(payslip);
  })
);

export default router;
