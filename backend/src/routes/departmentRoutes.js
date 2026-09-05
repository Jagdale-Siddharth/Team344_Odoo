import { Router } from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  createDepartmentSchema,
  updateDepartmentSchema,
} from '../controllers/departmentController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// All authenticated users can view/list departments
router.get('/', authenticate, getDepartments);
router.get('/:id', authenticate, getDepartmentById);

// Only HR_ADMIN and SYSTEM_ADMIN can create or edit departments
router.post('/', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(createDepartmentSchema), createDepartment);
router.put('/:id', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(updateDepartmentSchema), updateDepartment);

export default router;
