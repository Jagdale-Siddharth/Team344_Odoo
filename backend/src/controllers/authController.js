import { z } from 'zod';
import { prisma } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().trim().min(1, 'Name cannot be empty').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

const normalizeRole = (roleName) => {
  if (roleName === 'ADMIN') return 'SYSTEM_ADMIN';
  if (roleName === 'HR_MANAGER') return 'HR_ADMIN';
  if (roleName === 'PAYROLL_MANAGER' || roleName === 'PAYROLL_USER') return 'PAYROLL_OFFICER';
  return roleName || 'EMPLOYEE';
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await hashPassword(password);

    // Default to EMPLOYEE role
    const employeeRole = await prisma.roles.findFirst({
      where: { role_name: 'EMPLOYEE' },
    });

    const user = await prisma.users.create({
      data: {
        email,
        password_hash: hashedPassword,
        role_id: employeeRole ? employeeRole.role_id : 1,
      },
      include: {
        roles: true,
      },
    });

    // Check if an employee record exists with matching work_email and link if unlinked
    let linkedEmployee = await prisma.employees.findFirst({
      where: { work_email: email },
    });

    if (linkedEmployee && !linkedEmployee.user_id) {
      linkedEmployee = await prisma.employees.update({
        where: { employee_id: linkedEmployee.employee_id },
        data: { user_id: user.user_id },
      });
    }

    const roleName = normalizeRole(user.roles ? user.roles.role_name : 'EMPLOYEE');
    const token = signToken({ id: user.user_id.toString(), email: user.email, role: roleName });

    const safeUser = {
      id: user.user_id.toString(),
      email: user.email,
      role: roleName,
      name: name || (linkedEmployee ? `${linkedEmployee.first_name} ${linkedEmployee.last_name}` : null),
      employee: linkedEmployee ? {
        id: linkedEmployee.employee_id.toString(),
        code: linkedEmployee.employee_code,
        firstName: linkedEmployee.first_name,
        lastName: linkedEmployee.last_name,
      } : null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        roles: true,
        employees: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Auto-link matching employee if unlinked
    let employeeData = user.employees;
    if (!employeeData) {
      const existingEmployee = await prisma.employees.findFirst({
        where: { work_email: email },
      });
      if (existingEmployee && !existingEmployee.user_id) {
        employeeData = await prisma.employees.update({
          where: { employee_id: existingEmployee.employee_id },
          data: { user_id: user.user_id },
        });
      }
    }

    const roleName = normalizeRole(user.roles ? user.roles.role_name : 'EMPLOYEE');
    const token = signToken({ id: user.user_id.toString(), email: user.email, role: roleName });

    const safeUser = {
      id: user.user_id.toString(),
      email: user.email,
      role: roleName,
      name: employeeData ? `${employeeData.first_name} ${employeeData.last_name}` : null,
      employee: employeeData ? {
        id: employeeData.employee_id.toString(),
        code: employeeData.employee_code,
        firstName: employeeData.first_name,
        lastName: employeeData.last_name,
      } : null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
