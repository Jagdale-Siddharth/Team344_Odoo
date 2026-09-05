import { z } from 'zod';
import { prisma } from '../config/db.js';

export const createDepartmentSchema = z.object({
  department_name: z.string().trim().min(1, 'Department name is required').max(100, 'Department name cannot exceed 100 characters'),
  description: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z.object({
  department_name: z.string().trim().min(1, 'Department name is required').max(100, 'Department name cannot exceed 100 characters').optional(),
  description: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

// Format department object for BigInt safety
const formatDepartment = (dept) => ({
  id: dept.department_id.toString(),
  department_id: dept.department_id.toString(),
  department_name: dept.department_name,
  description: dept.description,
  is_active: dept.is_active,
  created_at: dept.created_at,
  positionsCount: dept._count ? dept._count.job_positions : undefined,
});

export const getDepartments = async (req, res, next) => {
  try {
    const { is_active } = req.query;

    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    }

    const depts = await prisma.departments.findMany({
      where,
      orderBy: { department_name: 'asc' },
      include: {
        _count: {
          select: { job_positions: true, employees: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      departments: depts.map(formatDepartment),
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let deptId;
    try {
      deptId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    const dept = await prisma.departments.findUnique({
      where: { department_id: deptId },
      include: {
        _count: {
          select: { job_positions: true, employees: true },
        },
      },
    });

    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    res.status(200).json({
      success: true,
      department: formatDepartment(dept),
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { department_name, description, is_active } = req.body;

    const existing = await prisma.departments.findUnique({
      where: { department_name },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name already exists.',
      });
    }

    const newDept = await prisma.departments.create({
      data: {
        department_name,
        description: description || null,
        is_active: is_active ?? true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department: formatDepartment(newDept),
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    let deptId;
    try {
      deptId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    const { department_name, description, is_active } = req.body;

    const existingDept = await prisma.departments.findUnique({
      where: { department_id: deptId },
    });

    if (!existingDept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    if (department_name && department_name !== existingDept.department_name) {
      const duplicate = await prisma.departments.findUnique({
        where: { department_name },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'A department with this name already exists.',
        });
      }
    }

    const updated = await prisma.departments.update({
      where: { department_id: deptId },
      data: {
        ...(department_name !== undefined && { department_name }),
        ...(description !== undefined && { description: description || null }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department: formatDepartment(updated),
    });
  } catch (error) {
    next(error);
  }
};
