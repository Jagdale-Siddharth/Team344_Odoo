import { Router } from 'express';
import authRoutes from './authRoutes.js';
import { getHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);

export default router;
