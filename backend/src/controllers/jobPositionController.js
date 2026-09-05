import { z } from 'zod';
import { prisma } from '../config/db.js';

export const createJobPositionSchema = z.object({
  department_id: z.union([z.string(), z.number()]).transform((val) => val.toString()),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateJobPositionSchema = z.object({
  department_id: z.union([z.string(), z.number()]).transform((val) => val.toString()).optional(),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters').optional(),
  description: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

// Format job position object for BigInt safety
const formatJobPosition = (job) => ({
  id: job.job_position_id.toString(),
  job_position_id: job.job_position_id.toString(),
  department_id: job.department_id.toString(),
  title: job.title,
  description: job.description,
  is_active: job.is_active,
  created_at: job.created_at,
  department: job.departments ? {
    id: job.departments.department_id.toString(),
    department_id: job.departments.department_id.toString(),
    department_name: job.departments.department_name,
    is_active: job.departments.is_active,
  } : null,
});

export const getJobPositions = async (req, res, next) => {
  try {
    const { department_id, is_active } = req.query;

    const where = {};

    if (department_id) {
      try {
        where.department_id = BigInt(department_id);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID filter',
        });
      }
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    }

    const jobs = await prisma.job_positions.findMany({
      where,
      orderBy: { title: 'asc' },
      include: {
        departments: true,
      },
    });

    res.status(200).json({
      success: true,
      jobPositions: jobs.map(formatJobPosition),
    });
  } catch (error) {
    next(error);
  }
};

export const getJobPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let jobId;
    try {
      jobId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid job position ID format',
      });
    }

    const job = await prisma.job_positions.findUnique({
      where: { job_position_id: jobId },
      include: {
        departments: true,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job position not found',
      });
    }

    res.status(200).json({
      success: true,
      jobPosition: formatJobPosition(job),
    });
  } catch (error) {
    next(error);
  }
};

export const createJobPosition = async (req, res, next) => {
  try {
    const { department_id, title, description, is_active } = req.body;

    let deptId;
    try {
      deptId = BigInt(department_id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    // Verify department exists
    const departmentExists = await prisma.departments.findUnique({
      where: { department_id: deptId },
    });

    if (!departmentExists) {
      return res.status(404).json({
        success: false,
        message: 'Referenced department does not exist',
      });
    }

    // Check unique (department_id, title)
    const duplicate = await prisma.job_positions.findUnique({
      where: {
        department_id_title: {
          department_id: deptId,
          title,
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `A position titled "${title}" already exists in the selected department.`,
      });
    }

    const newJob = await prisma.job_positions.create({
      data: {
        department_id: deptId,
        title,
        description: description || null,
        is_active: is_active ?? true,
      },
      include: {
        departments: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Job position created successfully',
      jobPosition: formatJobPosition(newJob),
    });
  } catch (error) {
    next(error);
  }
};

export const updateJobPosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    let jobId;
    try {
      jobId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid job position ID format',
      });
    }

    const { department_id, title, description, is_active } = req.body;

    const existingJob = await prisma.job_positions.findUnique({
      where: { job_position_id: jobId },
    });

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job position not found',
      });
    }

    let targetDeptId = existingJob.department_id;
    if (department_id !== undefined) {
      try {
        targetDeptId = BigInt(department_id);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID format',
        });
      }

      const departmentExists = await prisma.departments.findUnique({
        where: { department_id: targetDeptId },
      });

      if (!departmentExists) {
        return res.status(404).json({
          success: false,
          message: 'Referenced department does not exist',
        });
      }
    }

    const targetTitle = title !== undefined ? title : existingJob.title;

    if (targetDeptId !== existingJob.department_id || targetTitle !== existingJob.title) {
      const duplicate = await prisma.job_positions.findUnique({
        where: {
          department_id_title: {
            department_id: targetDeptId,
            title: targetTitle,
          },
        },
      });

      if (duplicate && duplicate.job_position_id !== jobId) {
        return res.status(409).json({
          success: false,
          message: `A position titled "${targetTitle}" already exists in the target department.`,
        });
      }
    }

    const updated = await prisma.job_positions.update({
      where: { job_position_id: jobId },
      data: {
        ...(department_id !== undefined && { department_id: targetDeptId }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(is_active !== undefined && { is_active }),
      },
      include: {
        departments: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Job position updated successfully',
      jobPosition: formatJobPosition(updated),
    });
  } catch (error) {
    next(error);
  }
};
