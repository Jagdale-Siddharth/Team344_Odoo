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
  password: z.string().min(1, 'Password is required'),
});

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

    const roleName = user.roles ? user.roles.role_name : 'EMPLOYEE';
    const token = signToken({ id: user.user_id.toString(), email: user.email, role: roleName });

    const safeUser = {
      id: user.user_id.toString(),
      email: user.email,
      role: roleName,
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

    const roleName = user.roles ? user.roles.role_name : 'EMPLOYEE';
    const token = signToken({ id: user.user_id.toString(), email: user.email, role: roleName });

    const safeUser = {
      id: user.user_id.toString(),
      email: user.email,
      role: roleName,
      employee: user.employees ? {
        id: user.employees.employee_id.toString(),
        code: user.employees.employee_code,
        firstName: user.employees.first_name,
        lastName: user.employees.last_name,
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
