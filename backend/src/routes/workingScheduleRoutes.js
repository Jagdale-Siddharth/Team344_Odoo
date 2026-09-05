import { Router } from 'express';
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  createScheduleSchema,
  updateScheduleSchema,
} from '../controllers/workingScheduleController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// SYSTEM_ADMIN, HR_ADMIN, and PAYROLL_OFFICER can view working schedules
router.get('/', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER'), getSchedules);
router.get('/:id', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER'), getScheduleById);

// Only SYSTEM_ADMIN and HR_ADMIN can create or update working schedules
router.post('/', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(createScheduleSchema), createSchedule);
router.put('/:id', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(updateScheduleSchema), updateSchedule);

export default router;
