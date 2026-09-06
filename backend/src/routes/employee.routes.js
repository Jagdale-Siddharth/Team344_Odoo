import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, HR_WRITE_ROLES, scopeToOwnEmployee } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const employeeSchema = z.object({
  name: z.string().min(1),
  workEmail: z.string().email(),
  phone: z.string().optional().nullable(),
  department: z.string().min(1),
  jobPosition: z.string().min(1),
  employeeType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).optional(),
  managerId: z.string().uuid().optional().nullable(),
  workingScheduleId: z.string().uuid().optional().nullable(),
  dateJoined: z.string().optional(),
});

const EMPLOYEE_LIST_SELECT = {
  id: true,
  name: true,
  workEmail: true,
  phone: true,
  department: true,
  jobPosition: true,
  employeeType: true,
  status: true,
  dateJoined: true,
  avatarColor: true,
  manager: { select: { id: true, name: true } },
  workingSchedule: { select: { id: true, name: true } },
};

// GET /api/employees  (list + search + filters)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    const { search, department, status, employeeType, page = 1, pageSize = 50 } = req.query;

    const where = {
      ...(ownId ? { id: ownId } : {}),
      ...(department ? { department } : {}),
      ...(status ? { status } : {}),
      ...(employeeType ? { employeeType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: String(search), mode: 'insensitive' } },
              { workEmail: { contains: String(search), mode: 'insensitive' } },
              { department: { contains: String(search), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const take = Math.min(Number(pageSize) || 50, 200);
    const skip = (Number(page) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.employee.findMany({ where, select: EMPLOYEE_LIST_SELECT, orderBy: { name: 'asc' }, take, skip }),
      prisma.employee.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const rows = await prisma.employee.findMany({ select: { department: true }, distinct: ['department'] });
    res.json(rows.map((r) => r.department).sort());
  })
);

// GET /api/employees/managers
// Returns only employees who actually hold a manager/lead designation
// (jobPosition contains "Manager" or "Lead") OR already have direct
// reports. Used to populate the "Select Manager" dropdown so HR doesn't
// have to pick a manager out of the entire employee list.
router.get(
  '/managers',
  asyncHandler(async (req, res) => {
    const managers = await prisma.employee.findMany({
      where: {
        status: { not: 'INACTIVE' },
        OR: [
          { jobPosition: { contains: 'Manager', mode: 'insensitive' } },
          { jobPosition: { contains: 'Lead', mode: 'insensitive' } },
          { reports: { some: {} } },
        ],
      },
      select: { id: true, name: true, department: true, jobPosition: true },
      orderBy: { name: 'asc' },
    });
    res.json(managers);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    if (ownId && ownId !== req.params.id) return res.status(403).json({ message: 'Not allowed' });

    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        manager: { select: { id: true, name: true } },
        workingSchedule: { include: { lines: true } },
        contracts: { orderBy: { startDate: 'desc' } },
        _count: { select: { attendances: true, timeOffRequests: true, allocations: true, contracts: true } },
      },
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  })
);

router.post(
  '/',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = employeeSchema.parse(req.body);
    const employee = await prisma.employee.create({
      data: {
        ...data,
        dateJoined: data.dateJoined ? new Date(data.dateJoined) : new Date(),
        avatarColor: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
      },
    });
    res.status(201).json(employee);
  })
);

router.put(
  '/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = employeeSchema.partial().parse(req.body);
    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.dateJoined ? { dateJoined: new Date(data.dateJoined) } : {}) },
    });
    res.json(employee);
  })
);

router.delete(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER'),
  asyncHandler(async (req, res) => {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
