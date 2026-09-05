import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Role hierarchy / permission notes (see PS section 3 - User Roles):
//   ADMIN               -> full access to everything
//   HR_PAYROLL_MANAGER  -> full CRUD on HR + Payroll + Salary Structures/Rules
//   HR_PAYROLL_USER     -> full HR Manager perms + CRU on Payruns/Payslips,
//                          read-only Salary Structures/Rules
//   HR_MANAGER          -> full CRUD Employees/Attendance/Contracts/Schedules/
//                          TimeOff, approve/refuse TimeOff, NO payroll access
//   EMPLOYEE            -> view own employee/attendance/time-off data only,
//                          create own attendance + time off requests
// ---------------------------------------------------------------------------

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { employee: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// authorize(['ADMIN','HR_MANAGER']) -> only these roles may proceed
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (roles.length === 0 || roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Insufficient permissions for this action' });
};

// Roles allowed to touch payroll (payruns/payslips) at all
export const PAYROLL_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
// Roles allowed full CRUD on salary structures/rules
export const PAYROLL_CONFIG_WRITE_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER'];
// Roles allowed general HR CRUD (employees, contracts, schedules, attendance, time off admin)
export const HR_WRITE_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];
// Everyone who is not a plain employee (i.e. "staff" side of the app)
export const STAFF_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];

// Helper: employee can only read their own linked employee record;
// staff roles can read anyone's. Use inside route handlers.
export const scopeToOwnEmployee = (req) => {
  if (STAFF_ROLES.includes(req.user.role)) return null; // no scoping needed
  return req.user.employee?.id || null;
};
