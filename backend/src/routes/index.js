import { Router } from 'express';
import authRoutes from './authRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import jobPositionRoutes from './jobPositionRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import { getHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/departments', departmentRoutes);
router.use('/job-positions', jobPositionRoutes);
router.use('/employees', employeeRoutes);

export default router;
