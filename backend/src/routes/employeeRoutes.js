import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  createEmployeeSchema,
  updateEmployeeSchema,
} from '../controllers/employeeController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// SYSTEM_ADMIN, HR_ADMIN, and PAYROLL_OFFICER can view employees
router.get('/', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER'), getEmployees);
router.get('/:id', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER'), getEmployeeById);

// Only SYSTEM_ADMIN and HR_ADMIN can create or update employees
router.post('/', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(createEmployeeSchema), createEmployee);
router.put('/:id', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), validateBody(updateEmployeeSchema), updateEmployee);

export default router;
