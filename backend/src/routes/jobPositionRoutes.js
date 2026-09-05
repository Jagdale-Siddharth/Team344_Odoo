import { Router } from 'express';
import {
  getJobPositions,
  getJobPositionById,
  createJobPosition,
  updateJobPosition,
  createJobPositionSchema,
  updateJobPositionSchema,
} from '../controllers/jobPositionController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// All authenticated users can view/list job positions
router.get('/', authenticate, getJobPositions);
router.get('/:id', authenticate, getJobPositionById);

// Only HR_ADMIN and SYSTEM_ADMIN can create or edit job positions
router.post('/', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(createJobPositionSchema), createJobPosition);
router.put('/:id', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(updateJobPositionSchema), updateJobPosition);

export default router;
