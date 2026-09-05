import { Router } from 'express';
import { register, login, getMe, registerSchema, loginSchema } from '../controllers/authController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getMe);
router.get('/rbac-test', authenticate, authorize('SYSTEM_ADMIN', 'HR_ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to admin route.',
    user: req.user,
  });
});

export default router;
