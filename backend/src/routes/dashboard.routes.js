import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, PAYROLL_ROLES } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Dashboard is a staff-facing (payroll/HR) view; scope by department/employeeType/period.
router.get(
  '/',
  authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'),
  asyncHandler(async (req, res) => {
    const { department, employeeType, periodStart, periodEnd } = req.query;
    const canSeePayroll = PAYROLL_ROLES.includes(req.user.role);

    const empWhere = {
      ...(department ? { department: String(department) } : {}),
      ...(employeeType ? { employeeType: String(employeeType) } : {}),
    };

    const payslipWhere = {
      ...(periodStart || periodEnd
        ? {
            periodStart: periodStart ? { gte: new Date(String(periodStart)) } : undefined,
            periodEnd: periodEnd ? { lte: new Date(String(periodEnd)) } : undefined,
          }
        : {}),
      ...(department || employeeType ? { employee: empWhere } : {}),
    };

    const [totalEmployees, departments, employeeTypes] = await Promise.all([
      prisma.employee.count({ where: empWhere }),
      prisma.employee.findMany({ where: empWhere, select: { department: true }, distinct: ['department'] }),
      prisma.employee.groupBy({ by: ['employeeType'], where: empWhere, _count: true }),
    ]);

    let payrollData = null;
    if (canSeePayroll) {
      const [netAgg, payslipCountByStatus, payslips] = await Promise.all([
        prisma.payslip.aggregate({ where: payslipWhere, _sum: { net: true }, _avg: { net: true }, _count: true }),
        prisma.payslip.groupBy({ by: ['status'], where: payslipWhere, _count: true }),
        prisma.payslip.findMany({
          where: payslipWhere,
          include: { employee: { select: { department: true } } },
        }),
      ]);

      const salaryByDept = {};
      const netByMonth = {};
      for (const p of payslips) {
        const dept = p.employee.department;
        salaryByDept[dept] = (salaryByDept[dept] || 0) + p.net;
        const monthKey = `${p.periodStart.getFullYear()}-${String(p.periodStart.getMonth() + 1).padStart(2, '0')}`;
        netByMonth[monthKey] = (netByMonth[monthKey] || 0) + p.net;
      }

      const warningsCount = payslips.filter((p) => Array.isArray(p.warnings) && p.warnings.length > 0).length;

      payrollData = {
        totalNetSalaryPaid: netAgg._sum.net || 0,
        averageSalary: netAgg._avg.net || 0,
        payslipsGenerated: netAgg._count || 0,
        payslipStatusBreakdown: payslipCountByStatus.map((s) => ({ status: s.status, count: s._count })),
        salaryCostByDepartment: Object.entries(salaryByDept).map(([department, total]) => ({ department, total })),
        monthlyNetSalaryTrend: Object.entries(netByMonth)
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([month, total]) => ({ month, total })),
        payrollWarnings: warningsCount,
      };
    }

    // Attendance overview
    const attendanceWhere = {
      ...(periodStart || periodEnd
        ? {
            checkIn: {
              ...(periodStart ? { gte: new Date(String(periodStart)) } : {}),
              ...(periodEnd ? { lte: new Date(String(periodEnd)) } : {}),
            },
          }
        : {}),
      ...(department || employeeType ? { employee: empWhere } : {}),
    };
    const attendanceByStatus = await prisma.attendance.groupBy({
      by: ['status'],
      where: attendanceWhere,
      _count: true,
    });
    const totalAttendance = attendanceByStatus.reduce((s, a) => s + a._count, 0);
    const presentLike = attendanceByStatus
      .filter((a) => a.status === 'PRESENT' || a.status === 'OVERTIME' || a.status === 'LATE')
      .reduce((s, a) => s + a._count, 0);
    const attendanceHealth = totalAttendance ? Math.round((presentLike / totalAttendance) * 100) : 0;

    // Time off overview
    const timeOffWhere = department || employeeType ? { employee: empWhere } : {};
    const timeOffByStatus = await prisma.timeOffRequest.groupBy({ by: ['status'], where: timeOffWhere, _count: true, _sum: { duration: true } });
    const allocations = await prisma.allocation.findMany({ where: timeOffWhere, select: { allocated: true, taken: true } });
    const remainingBalance = allocations.reduce((s, a) => s + (a.allocated - a.taken), 0);

    res.json({
      totalEmployees,
      departmentCount: departments.length,
      employeeTypeBreakdown: employeeTypes.map((e) => ({ type: e.employeeType, count: e._count })),
      departmentBreakdown: await Promise.all(
        departments.map(async (d) => {
          const count = await prisma.employee.count({ where: { ...empWhere, department: d.department } });
          return { department: d.department, headcount: count };
        })
      ),
      payroll: payrollData,
      attendance: {
        health: attendanceHealth,
        byStatus: attendanceByStatus.map((a) => ({ status: a.status, count: a._count })),
      },
      timeOff: {
        byStatus: timeOffByStatus.map((t) => ({ status: t.status, count: t._count, totalDays: t._sum.duration || 0 })),
        remainingBalance,
      },
    });
  })
);

export default router;
