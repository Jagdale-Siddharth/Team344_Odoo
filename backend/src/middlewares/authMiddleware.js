import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(decoded.id) },
      include: {
        roles: true,
        employees: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User no longer exists.',
      });
    }

    req.user = {
      id: user.user_id.toString(),
      email: user.email,
      role: user.roles ? user.roles.role_name : 'EMPLOYEE',
      employee: user.employees ? {
        id: user.employees.employee_id.toString(),
        code: user.employees.employee_code,
        firstName: user.employees.first_name,
        lastName: user.employees.last_name,
      } : null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};
