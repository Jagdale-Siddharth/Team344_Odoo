import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, HR_WRITE_ROLES } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const lineSchema = z.object({
  day: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().int().min(0).default(60),
});

const scheduleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'FLEXIBLE', 'SHIFT']).optional(),
  company: z.string().optional(),
  lines: z.array(lineSchema).default([]),
});

function timeToHours(t) {
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}

function weeklyHours(lines) {
  return lines.reduce((sum, l) => {
    const span = timeToHours(l.endTime) - timeToHours(l.startTime) - (l.breakMinutes || 0) / 60;
    return sum + Math.max(span, 0);
  }, 0);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const schedules = await prisma.workingSchedule.findMany({
      include: { lines: true, _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(
      schedules.map((s) => ({ ...s, weeklyHours: Math.round(weeklyHours(s.lines) * 100) / 100 }))
    );
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json({ ...schedule, weeklyHours: Math.round(weeklyHours(schedule.lines) * 100) / 100 });
  })
);

router.post(
  '/',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = scheduleSchema.parse(req.body);
    const schedule = await prisma.workingSchedule.create({
      data: {
        name: data.name,
        type: data.type || 'FULL_TIME',
        company: data.company || 'My Company',
        lines: { create: data.lines },
      },
      include: { lines: true },
    });
    res.status(201).json(schedule);
  })
);

router.put(
  '/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = scheduleSchema.partial().parse(req.body);
    const schedule = await prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.workingScheduleLine.deleteMany({ where: { scheduleId: req.params.id } });
      }
      return tx.workingSchedule.update({
        where: { id: req.params.id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.type ? { type: data.type } : {}),
          ...(data.company ? { company: data.company } : {}),
          ...(data.lines ? { lines: { create: data.lines } } : {}),
        },
        include: { lines: true },
      });
    });
    res.json(schedule);
  })
);

router.delete(
  '/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    await prisma.workingSchedule.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
