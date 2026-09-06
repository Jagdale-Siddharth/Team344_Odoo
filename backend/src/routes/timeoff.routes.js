import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, HR_WRITE_ROLES, scopeToOwnEmployee } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ---------------- Time Off Types ----------------
const typeSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(['DAYS', 'HOURS']).optional(),
  requiresAllocation: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
  affectsPayroll: z.boolean().optional(),
  color: z.string().optional(),
});

router.get(
  '/types',
  asyncHandler(async (req, res) => {
    const types = await prisma.timeOffType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  })
);

router.post(
  '/types',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = typeSchema.parse(req.body);
    const type = await prisma.timeOffType.create({ data });
    res.status(201).json(type);
  })
);

router.put(
  '/types/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = typeSchema.partial().parse(req.body);
    const type = await prisma.timeOffType.update({ where: { id: req.params.id }, data });
    res.json(type);
  })
);

router.delete(
  '/types/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.timeOffType.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// ---------------- Allocations ----------------
const allocationSchema = z.object({
  employeeId: z.string().uuid(),
  timeOffTypeId: z.string().uuid(),
  allocated: z.number().positive(),
  validFrom: z.string(),
  validTo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REFUSED']).optional(),
});

router.get(
  '/allocations',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    const { employeeId } = req.query;
    const where = {
      ...(ownId ? { employeeId: ownId } : {}),
      ...(employeeId ? { employeeId: String(employeeId) } : {}),
    };
    const allocations = await prisma.allocation.findMany({
      where,
      include: { employee: { select: { id: true, name: true } }, timeOffType: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(allocations.map((a) => ({ ...a, remaining: a.allocated - a.taken })));
  })
);

router.post(
  '/allocations',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = allocationSchema.parse(req.body);
    const allocation = await prisma.allocation.create({
      data: {
        ...data,
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
        status: data.status || 'PENDING',
      },
    });
    res.status(201).json(allocation);
  })
);

router.put(
  '/allocations/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = allocationSchema.partial().parse(req.body);
    const allocation = await prisma.allocation.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.validFrom ? { validFrom: new Date(data.validFrom) } : {}),
        ...(data.validTo ? { validTo: new Date(data.validTo) } : {}),
      },
    });
    res.json(allocation);
  })
);

router.delete(
  '/allocations/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.allocation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// ---------------- Requests ----------------
const requestSchema = z.object({
  employeeId: z.string().uuid(),
  timeOffTypeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional().nullable(),
});

function durationInDays(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.max(Math.round(ms / 86400000) + 1, 1);
}

router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    const { employeeId, status } = req.query;
    const where = {
      ...(ownId ? { employeeId: ownId } : {}),
      ...(employeeId ? { employeeId: String(employeeId) } : {}),
      ...(status ? { status } : {}),
    };
    const requests = await prisma.timeOffRequest.findMany({
      where,
      include: { employee: { select: { id: true, name: true } }, timeOffType: true },
      orderBy: { createdAt: 'desc' },
    });

    // Remaining Allocation = allocated - taken on the employee's latest
    // APPROVED allocation for that time off type. Fetched in one batch
    // query and matched in memory rather than hardcoded on the frontend.
    const pairs = [...new Set(requests.map((r) => `${r.employeeId}::${r.timeOffTypeId}`))];
    const allocations = pairs.length
      ? await prisma.allocation.findMany({
          where: {
            status: 'APPROVED',
            OR: pairs.map((p) => {
              const [employeeId, timeOffTypeId] = p.split('::');
              return { employeeId, timeOffTypeId };
            }),
          },
          orderBy: { validFrom: 'desc' },
        })
      : [];

    const latestByPair = {};
    for (const a of allocations) {
      const key = `${a.employeeId}::${a.timeOffTypeId}`;
      if (!latestByPair[key]) latestByPair[key] = a; // first hit wins (already sorted desc)
    }

    const result = requests.map((r) => {
      const allocation = latestByPair[`${r.employeeId}::${r.timeOffTypeId}`];
      return {
        ...r,
        remainingAllocation: allocation ? allocation.allocated - allocation.taken : null,
      };
    });

    res.json(result);
  })
);

// Any authenticated user (incl. plain EMPLOYEE) may create their own request
router.post(
  '/requests',
  asyncHandler(async (req, res) => {
    const data = requestSchema.parse(req.body);
    const ownId = scopeToOwnEmployee(req);
    if (ownId && ownId !== data.employeeId) return res.status(403).json({ message: 'Not allowed' });

    const duration = durationInDays(data.startDate, data.endDate);
    const request = await prisma.timeOffRequest.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        duration,
        status: 'SUBMITTED',
      },
    });
    res.status(201).json(request);
  })
);

// Approve / Refuse — HR Manager and above (PS 4-B4 / 3)
router.put(
  '/requests/:id/decision',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const { decision } = z.object({ decision: z.enum(['APPROVED', 'REFUSED']) }).parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({ where: { id: req.params.id }, include: { timeOffType: true } });
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });

      const updated = await tx.timeOffRequest.update({
        where: { id: req.params.id },
        data: { status: decision, approvedById: req.user.id },
      });

      if (decision === 'APPROVED' && request.timeOffType.requiresAllocation) {
        const allocation = await tx.allocation.findFirst({
          where: { employeeId: request.employeeId, timeOffTypeId: request.timeOffTypeId, status: 'APPROVED' },
          orderBy: { validFrom: 'desc' },
        });
        if (allocation) {
          await tx.allocation.update({
            where: { id: allocation.id },
            data: { taken: allocation.taken + request.duration },
          });
        }
      }
      return updated;
    });
    res.json(result);
  })
);

router.delete(
  '/requests/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.timeOffRequest.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
