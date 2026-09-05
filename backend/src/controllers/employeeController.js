import { z } from 'zod';
import { prisma } from '../config/db.js';

export const createEmployeeSchema = z.object({
  employee_code: z.string().trim().min(1, 'Employee code is required').max(20, 'Employee code cannot exceed 20 characters').optional(),
  first_name: z.string().trim().min(1, 'First name is required').max(80, 'First name cannot exceed 80 characters'),
  last_name: z.string().trim().min(1, 'Last name is required').max(80, 'Last name cannot exceed 80 characters'),
  work_email: z.string().trim().email('Invalid work email address').max(150, 'Work email cannot exceed 150 characters'),
  personal_email: z.string().trim().email('Invalid personal email address').max(150, 'Personal email cannot exceed 150 characters').optional().nullable(),
  phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().nullable(),
  department_id: z.union([z.string(), z.number()]).transform((val) => val.toString()),
  job_position_id: z.union([z.string(), z.number()]).transform((val) => val.toString()),
  employment_type: z.string().trim().max(30).optional().default('FULL_TIME'),
  joining_date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  status: z.string().trim().max(20).optional().default('ACTIVE'),
  bank_name: z.string().trim().max(120).optional().nullable(),
  bank_account_number: z.string().trim().max(40).optional().nullable(),
  bank_ifsc_code: z.string().trim().max(20).optional().nullable(),
});

export const updateEmployeeSchema = z.object({
  employee_code: z.string().trim().min(1, 'Employee code is required').max(20, 'Employee code cannot exceed 20 characters').optional(),
  first_name: z.string().trim().min(1, 'First name is required').max(80, 'First name cannot exceed 80 characters').optional(),
  last_name: z.string().trim().min(1, 'Last name is required').max(80, 'Last name cannot exceed 80 characters').optional(),
  work_email: z.string().trim().email('Invalid work email address').max(150, 'Work email cannot exceed 150 characters').optional(),
  personal_email: z.string().trim().email('Invalid personal email address').max(150, 'Personal email cannot exceed 150 characters').optional().nullable(),
  phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().nullable(),
  department_id: z.union([z.string(), z.number()]).transform((val) => val.toString()).optional(),
  job_position_id: z.union([z.string(), z.number()]).transform((val) => val.toString()).optional(),
  employment_type: z.string().trim().max(30).optional(),
  joining_date: z.string().optional(),
  status: z.string().trim().max(20).optional(),
  bank_name: z.string().trim().max(120).optional().nullable(),
  bank_account_number: z.string().trim().max(40).optional().nullable(),
  bank_ifsc_code: z.string().trim().max(20).optional().nullable(),
});

// BigInt safety helper
const formatEmployee = (emp) => ({
  id: emp.employee_id.toString(),
  employee_id: emp.employee_id.toString(),
  user_id: emp.user_id ? emp.user_id.toString() : null,
  employee_code: emp.employee_code,
  first_name: emp.first_name,
  last_name: emp.last_name,
  full_name: `${emp.first_name} ${emp.last_name}`,
  work_email: emp.work_email,
  personal_email: emp.personal_email,
  phone: emp.phone,
  department_id: emp.department_id.toString(),
  job_position_id: emp.job_position_id.toString(),
  manager_id: emp.manager_id ? emp.manager_id.toString() : null,
  schedule_id: emp.schedule_id ? emp.schedule_id.toString() : null,
  employment_type: emp.employment_type,
  joining_date: emp.joining_date,
  status: emp.status,
  is_active: emp.status === 'ACTIVE',
  bank_name: emp.bank_name,
  bank_account_number: emp.bank_account_number,
  bank_ifsc_code: emp.bank_ifsc_code,
  created_at: emp.created_at,
  updated_at: emp.updated_at,
  department: emp.departments ? {
    id: emp.departments.department_id.toString(),
    department_id: emp.departments.department_id.toString(),
    department_name: emp.departments.department_name,
    is_active: emp.departments.is_active,
  } : null,
  job_position: emp.job_positions ? {
    id: emp.job_positions.job_position_id.toString(),
    job_position_id: emp.job_positions.job_position_id.toString(),
    title: emp.job_positions.title,
    is_active: emp.job_positions.is_active,
  } : null,
});

export const getEmployees = async (req, res, next) => {
  try {
    const { search, department_id, job_position_id, status, is_active } = req.query;

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

    if (job_position_id) {
      try {
        where.job_position_id = BigInt(job_position_id);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid job position ID filter',
        });
      }
    }

    if (status) {
      where.status = status;
    } else if (is_active !== undefined) {
      where.status = (is_active === 'true' || is_active === true) ? 'ACTIVE' : 'INACTIVE';
    }

    if (search) {
      const trimmedSearch = search.trim();
      where.OR = [
        { first_name: { contains: trimmedSearch, mode: 'insensitive' } },
        { last_name: { contains: trimmedSearch, mode: 'insensitive' } },
        { work_email: { contains: trimmedSearch, mode: 'insensitive' } },
        { employee_code: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    const employeesList = await prisma.employees.findMany({
      where,
      orderBy: { employee_id: 'asc' },
      include: {
        departments: true,
        job_positions: true,
      },
    });

    res.status(200).json({
      success: true,
      employees: employeesList.map(formatEmployee),
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let empId;
    try {
      empId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
      });
    }

    const emp = await prisma.employees.findUnique({
      where: { employee_id: empId },
      include: {
        departments: true,
        job_positions: true,
      },
    });

    if (!emp) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      success: true,
      employee: formatEmployee(emp),
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const {
      employee_code,
      first_name,
      last_name,
      work_email,
      personal_email,
      phone,
      department_id,
      job_position_id,
      employment_type,
      joining_date,
      status,
      bank_name,
      bank_account_number,
      bank_ifsc_code,
    } = req.body;

    let deptId, jobId;
    try {
      deptId = BigInt(department_id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format',
      });
    }

    try {
      jobId = BigInt(job_position_id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid job position ID format',
      });
    }

    // Verify department exists
    const deptExists = await prisma.departments.findUnique({
      where: { department_id: deptId },
    });
    if (!deptExists) {
      return res.status(404).json({
        success: false,
        message: 'Referenced department does not exist',
      });
    }

    // Verify job position exists
    const jobExists = await prisma.job_positions.findUnique({
      where: { job_position_id: jobId },
    });
    if (!jobExists) {
      return res.status(404).json({
        success: false,
        message: 'Referenced job position does not exist',
      });
    }

    // Check unique work_email
    const duplicateEmail = await prisma.employees.findUnique({
      where: { work_email },
    });
    if (duplicateEmail) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this work email already exists.',
      });
    }

    // Auto-generate employee_code if not provided
    let finalCode = employee_code;
    if (!finalCode) {
      const count = await prisma.employees.count();
      finalCode = `EMP${(count + 1).toString().padStart(4, '0')}`;
    }

    // Check unique employee_code
    const duplicateCode = await prisma.employees.findUnique({
      where: { employee_code: finalCode },
    });
    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this employee code already exists.',
      });
    }

    // Check if matching user account exists for work_email
    const matchingUser = await prisma.users.findUnique({
      where: { email: work_email },
    });

    const newEmp = await prisma.employees.create({
      data: {
        employee_code: finalCode,
        first_name,
        last_name,
        work_email,
        personal_email: personal_email || null,
        phone: phone || null,
        department_id: deptId,
        job_position_id: jobId,
        user_id: matchingUser ? matchingUser.user_id : null,
        employment_type: employment_type || 'FULL_TIME',
        joining_date: new Date(joining_date),
        status: status || 'ACTIVE',
        bank_name: bank_name || null,
        bank_account_number: bank_account_number || null,
        bank_ifsc_code: bank_ifsc_code || null,
      },
      include: {
        departments: true,
        job_positions: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: formatEmployee(newEmp),
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    let empId;
    try {
      empId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
      });
    }

    const existingEmp = await prisma.employees.findUnique({
      where: { employee_id: empId },
    });

    if (!existingEmp) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const {
      employee_code,
      first_name,
      last_name,
      work_email,
      personal_email,
      phone,
      department_id,
      job_position_id,
      employment_type,
      joining_date,
      status,
      bank_name,
      bank_account_number,
      bank_ifsc_code,
    } = req.body;

    let targetDeptId = existingEmp.department_id;
    if (department_id !== undefined) {
      try {
        targetDeptId = BigInt(department_id);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID format',
        });
      }

      const deptExists = await prisma.departments.findUnique({
        where: { department_id: targetDeptId },
      });
      if (!deptExists) {
        return res.status(404).json({
          success: false,
          message: 'Referenced department does not exist',
        });
      }
    }

    let targetJobId = existingEmp.job_position_id;
    if (job_position_id !== undefined) {
      try {
        targetJobId = BigInt(job_position_id);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid job position ID format',
        });
      }

      const jobExists = await prisma.job_positions.findUnique({
        where: { job_position_id: targetJobId },
      });
      if (!jobExists) {
        return res.status(404).json({
          success: false,
          message: 'Referenced job position does not exist',
        });
      }
    }

    if (work_email && work_email !== existingEmp.work_email) {
      const duplicateEmail = await prisma.employees.findUnique({
        where: { work_email },
      });
      if (duplicateEmail && duplicateEmail.employee_id !== empId) {
        return res.status(409).json({
          success: false,
          message: 'An employee with this work email already exists.',
        });
      }
    }

    if (employee_code && employee_code !== existingEmp.employee_code) {
      const duplicateCode = await prisma.employees.findUnique({
        where: { employee_code },
      });
      if (duplicateCode && duplicateCode.employee_id !== empId) {
        return res.status(409).json({
          success: false,
          message: 'An employee with this employee code already exists.',
        });
      }
    }

    const updated = await prisma.employees.update({
      where: { employee_id: empId },
      data: {
        ...(employee_code !== undefined && { employee_code }),
        ...(first_name !== undefined && { first_name }),
        ...(last_name !== undefined && { last_name }),
        ...(work_email !== undefined && { work_email }),
        ...(personal_email !== undefined && { personal_email: personal_email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(department_id !== undefined && { department_id: targetDeptId }),
        ...(job_position_id !== undefined && { job_position_id: targetJobId }),
        ...(employment_type !== undefined && { employment_type }),
        ...(joining_date !== undefined && { joining_date: new Date(joining_date) }),
        ...(status !== undefined && { status }),
        ...(bank_name !== undefined && { bank_name: bank_name || null }),
        ...(bank_account_number !== undefined && { bank_account_number: bank_account_number || null }),
        ...(bank_ifsc_code !== undefined && { bank_ifsc_code: bank_ifsc_code || null }),
        updated_at: new Date(),
      },
      include: {
        departments: true,
        job_positions: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      employee: formatEmployee(updated),
    });
  } catch (error) {
    next(error);
  }
};
