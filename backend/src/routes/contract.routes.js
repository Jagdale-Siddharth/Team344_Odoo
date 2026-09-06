import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, HR_WRITE_ROLES, scopeToOwnEmployee } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const contractSchema = z.object({
  name: z.string().min(1),
  employeeId: z.string().uuid(),
  department: z.string().min(1),
  jobPosition: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  wage: z.number().positive(),
  status: z.enum(['DRAFT', 'RUNNING', 'EXPIRED', 'CANCELLED']).optional(),
  salaryStructureId: z.string().uuid().optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const ownId = scopeToOwnEmployee(req);
    const { employeeId, status } = req.query;
    const where = {
      ...(ownId ? { employeeId: ownId } : {}),
      ...(employeeId ? { employeeId: String(employeeId) } : {}),
      ...(status ? { status } : {}),
    };
    const contracts = await prisma.contract.findMany({
      where,
      include: { employee: { select: { id: true, name: true } }, salaryStructure: { select: { id: true, name: true } } },
      orderBy: { startDate: 'desc' },
    });
    res.json(contracts);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { employee: true, salaryStructure: { include: { rules: true } } },
    });
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    res.json(contract);
  })
);

router.post(
  '/',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = contractSchema.parse(req.body);
    const reference = `CON/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$transaction(async (tx) => {
      if ((data.status || 'RUNNING') === 'RUNNING') {
        // avoid concurrent RUNNING contracts for the same employee (PS 4-A2)
        await tx.contract.updateMany({
          where: { employeeId: data.employeeId, status: 'RUNNING' },
          data: { status: 'EXPIRED' },
        });
      }
      return tx.contract.create({
        data: {
          ...data,
          reference,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status || 'RUNNING',
        },
      });
    });
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  authorize(...HR_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const data = contractSchema.partial().parse(req.body);
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      },
    });
    res.json(contract);
  })
);

router.delete(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER'),
  asyncHandler(async (req, res) => {
    await prisma.contract.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
