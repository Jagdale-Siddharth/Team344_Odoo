import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'];

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  employeeId: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  employeeId: z.string().uuid().optional().nullable(),
});

function sanitize(u) {
  const { password, ...rest } = u;
  return rest;
}

// Only Admin manages users/roles (PS: "User management, role assignment ... Admin")
router.get(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      include: { employee: { select: { id: true, name: true, department: true, jobPosition: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(sanitize));
  })
);

router.post(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role,
        ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
      },
    });
    res.status(201).json(sanitize(user));
  })
);

router.put(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const updateData = { ...data };
    delete updateData.password;
    delete updateData.employeeId;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.employeeId !== undefined) {
      updateData.employee = data.employeeId
        ? { connect: { id: data.employeeId } }
        : { disconnect: true };
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    res.json(sanitize(user));
  })
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
