import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, HR_WRITE_ROLES, scopeToOwnEmployee } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  employeeId: z.string().uuid(),
  checkIn: z.string(),
  checkOut: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const updateSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional().nullable(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'OVERTIME', 'MISSING_CHECKOUT']).optional(),
  note: z.string().optional().nullable(),
});

function computeStatus(checkIn, checkOut) {
  if (!checkOut) return 'MISSING_CHECKOUT';
  const hours = (new Date(checkOut) - new Date(checkIn)) / 3600000;
  const hour = new Date(checkIn).getHours();
  if (hours > 9) return 'OVERTIME';
  if (hour >= 10) return 'LATE';
  return 'PRESENT';
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    const { employeeId, from, to } = req.query;
    const where = {
      ...(ownId ? { employeeId: ownId } : {}),
      ...(employeeId ? { employeeId: String(employeeId) } : {}),
      ...(from || to
        ? { checkIn: { ...(from ? { gte: new Date(String(from)) } : {}), ...(to ? { lte: new Date(String(to)) } : {}) } }
        : {}),
    };
    const attendances = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, department: true } } },
      orderBy: { checkIn: 'desc' },
      take: 500,
    });
    res.json(attendances);
  })
);

// currently "open" attendance (checked-in, no checkout) for the widget
router.get(
  '/open/:employeeId',
  asyncHandler(async (req, res) => {
    const open = await prisma.attendance.findFirst({
      where: { employeeId: req.params.employeeId, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
    res.json(open);
  })
);

router.post(
  '/check-in',
  asyncHandler(async (req, res) => {
    const { employeeId } = z.object({ employeeId: z.string().uuid() }).parse(req.body);
    const existingOpen = await prisma.attendance.findFirst({ where: { employeeId, checkOut: null } });
    if (existingOpen) return res.status(400).json({ message: 'Already checked in' });
    const attendance = await prisma.attendance.create({
      data: { employeeId, checkIn: new Date(), status: 'PRESENT' },
    });
    res.status(201).json(attendance);
  })
);

router.post(
  '/check-out',
  asyncHandler(async (req, res) => {
    const { employeeId } = z.object({ employeeId: z.string().uuid() }).parse(req.body);
    const open = await prisma.attendance.findFirst({ where: { employeeId, checkOut: null }, orderBy: { checkIn: 'desc' } });
    if (!open) return res.status(400).json({ message: 'No open check-in found' });
    const checkOut = new Date();
    const workedHours = Math.round(((checkOut - open.checkIn) / 3600000) * 100) / 100;
    const attendance = await prisma.attendance.update({
      where: { id: open.id },
      data: { checkOut, workedHours, status: computeStatus(open.checkIn, checkOut) },
    });
    res.json(attendance);
  })
);

router.post(
  '/',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const checkIn = new Date(data.checkIn);
    const checkOut = data.checkOut ? new Date(data.checkOut) : null;
    const workedHours = checkOut ? Math.round(((checkOut - checkIn) / 3600000) * 100) / 100 : null;
    const attendance = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        checkIn,
        checkOut,
        workedHours,
        note: data.note,
        isManualEdit: true,
        status: computeStatus(checkIn, checkOut),
      },
    });
    res.status(201).json(attendance);
  })
);

router.put(
  '/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.attendance.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Attendance not found' });

    const checkIn = data.checkIn ? new Date(data.checkIn) : existing.checkIn;
    const checkOut = data.checkOut !== undefined ? (data.checkOut ? new Date(data.checkOut) : null) : existing.checkOut;
    const workedHours = checkOut ? Math.round(((checkOut - checkIn) / 3600000) * 100) / 100 : null;

    const attendance = await prisma.attendance.update({
      where: { id: req.params.id },
      data: {
        checkIn,
        checkOut,
        workedHours,
        note: data.note ?? existing.note,
        isManualEdit: true,
        status: data.status || computeStatus(checkIn, checkOut),
      },
    });
    res.json(attendance);
  })
);

router.delete(
  '/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.attendance.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
