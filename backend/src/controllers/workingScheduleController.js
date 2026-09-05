import { z } from 'zod';
import { prisma } from '../config/db.js';

// Schema for individual schedule line (day configuration)
const scheduleLineSchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  is_working: z.boolean().optional().default(true),
  start_time: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm format'),
  end_time: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:mm format'),
  break_minutes: z.number().int().min(0, 'Break duration cannot be negative').default(0),
});

export const createScheduleSchema = z.object({
  schedule_name: z.string().trim().min(1, 'Schedule name is required').max(100, 'Schedule name cannot exceed 100 characters'),
  schedule_type: z.string().trim().max(30).optional().default('WEEKLY'),
  is_active: z.boolean().optional().default(true),
  lines: z.array(scheduleLineSchema).min(1, 'At least one working day line must be configured'),
});

export const updateScheduleSchema = z.object({
  schedule_name: z.string().trim().min(1, 'Schedule name is required').max(100, 'Schedule name cannot exceed 100 characters').optional(),
  schedule_type: z.string().trim().max(30).optional(),
  is_active: z.boolean().optional(),
  lines: z.array(scheduleLineSchema).optional(),
});

// Helper: Format Time object/string to "HH:mm"
const formatTimeHHMM = (timeVal) => {
  if (!timeVal) return '00:00';
  if (typeof timeVal === 'string') {
    if (timeVal.includes('T')) {
      const date = new Date(timeVal);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const mins = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${mins}`;
    }
    return timeVal.substring(0, 5);
  }
  if (timeVal instanceof Date) {
    const hours = timeVal.getUTCHours().toString().padStart(2, '0');
    const mins = timeVal.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  }
  return '00:00';
};

// Helper: Convert "HH:mm" string to UTC Date object for Prisma Time column
const parseHHMMToDate = (timeStr) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  const d = new Date(Date.UTC(1970, 0, 1, hours, mins, 0, 0));
  return d;
};

// Helper: BigInt & Decimal safe schedule formatter
const formatSchedule = (sched) => {
  const lines = (sched.working_schedule_lines || [])
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((line) => ({
      id: line.schedule_line_id.toString(),
      schedule_line_id: line.schedule_line_id.toString(),
      schedule_id: line.schedule_id.toString(),
      day_of_week: line.day_of_week,
      start_time: formatTimeHHMM(line.start_time),
      end_time: formatTimeHHMM(line.end_time),
      break_minutes: line.break_minutes,
      worked_hours: line.worked_hours !== null && line.worked_hours !== undefined ? parseFloat(line.worked_hours.toString()) : 0,
      created_at: line.created_at,
    }));

  return {
    id: sched.schedule_id.toString(),
    schedule_id: sched.schedule_id.toString(),
    schedule_name: sched.schedule_name,
    schedule_type: sched.schedule_type,
    weekly_hours: parseFloat(sched.weekly_hours?.toString() || '0'),
    is_active: sched.is_active,
    created_at: sched.created_at,
    updated_at: sched.updated_at,
    working_days_count: lines.length,
    lines,
  };
};

// GET /api/working-schedules
export const getSchedules = async (req, res, next) => {
  try {
    const { search, is_active } = req.query;

    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    }

    if (search) {
      where.schedule_name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const schedulesList = await prisma.working_schedules.findMany({
      where,
      orderBy: { schedule_id: 'asc' },
      include: {
        working_schedule_lines: true,
      },
    });

    res.status(200).json({
      success: true,
      schedules: schedulesList.map(formatSchedule),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/working-schedules/:id
export const getScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let schedId;
    try {
      schedId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID format',
      });
    }

    const sched = await prisma.working_schedules.findUnique({
      where: { schedule_id: schedId },
      include: {
        working_schedule_lines: true,
      },
    });

    if (!sched) {
      return res.status(404).json({
        success: false,
        message: 'Working schedule not found',
      });
    }

    res.status(200).json({
      success: true,
      schedule: formatSchedule(sched),
    });
  } catch (error) {
    next(error);
  }
};

// Validate line timing logic
const validateLineTimings = (lines) => {
  const seenDays = new Set();

  for (const line of lines) {
    if (seenDays.has(line.day_of_week)) {
      return `Duplicate day of week entry (${line.day_of_week}) configured.`;
    }
    seenDays.add(line.day_of_week);

    if (line.is_working !== false) {
      const [sH, sM] = line.start_time.split(':').map(Number);
      const [eH, eM] = line.end_time.split(':').map(Number);
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;

      if (endMins <= startMins) {
        return `End time (${line.end_time}) must be after start time (${line.start_time}) for day ${line.day_of_week}.`;
      }

      const totalWorkMins = endMins - startMins;
      if (line.break_minutes >= totalWorkMins) {
        return `Break duration (${line.break_minutes} mins) must be less than working duration (${totalWorkMins} mins) for day ${line.day_of_week}.`;
      }
    }
  }
  return null;
};

// POST /api/working-schedules
export const createSchedule = async (req, res, next) => {
  try {
    const { schedule_name, schedule_type, is_active, lines } = req.body;

    const timingError = validateLineTimings(lines);
    if (timingError) {
      return res.status(400).json({
        success: false,
        message: timingError,
      });
    }

    // Check duplicate name
    const existing = await prisma.working_schedules.findUnique({
      where: { schedule_name },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A working schedule named "${schedule_name}" already exists.`,
      });
    }

    // Filter only active working lines
    const activeLines = lines.filter((l) => l.is_working !== false);

    if (activeLines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one working day line must be enabled.',
      });
    }

    // Create schedule and lines inside transaction
    const newSchedId = await prisma.$transaction(async (tx) => {
      const createdSched = await tx.working_schedules.create({
        data: {
          schedule_name,
          schedule_type: schedule_type || 'WEEKLY',
          is_active: is_active !== undefined ? is_active : true,
        },
      });

      const lineData = activeLines.map((l) => ({
        schedule_id: createdSched.schedule_id,
        day_of_week: l.day_of_week,
        start_time: parseHHMMToDate(l.start_time),
        end_time: parseHHMMToDate(l.end_time),
        break_minutes: l.break_minutes || 0,
      }));

      await tx.working_schedule_lines.createMany({
        data: lineData,
      });

      return createdSched.schedule_id;
    });

    // Re-fetch to retrieve PostgreSQL trigger-calculated weekly_hours!
    const finalSched = await prisma.working_schedules.findUnique({
      where: { schedule_id: newSchedId },
      include: {
        working_schedule_lines: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Working schedule created successfully',
      schedule: formatSchedule(finalSched),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/working-schedules/:id
export const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    let schedId;
    try {
      schedId = BigInt(id);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID format',
      });
    }

    const existingSched = await prisma.working_schedules.findUnique({
      where: { schedule_id: schedId },
    });

    if (!existingSched) {
      return res.status(404).json({
        success: false,
        message: 'Working schedule not found',
      });
    }

    const { schedule_name, schedule_type, is_active, lines } = req.body;

    if (schedule_name && schedule_name !== existingSched.schedule_name) {
      const duplicate = await prisma.working_schedules.findUnique({
        where: { schedule_name },
      });
      if (duplicate && duplicate.schedule_id !== schedId) {
        return res.status(409).json({
          success: false,
          message: `A working schedule named "${schedule_name}" already exists.`,
        });
      }
    }

    if (lines && lines.length > 0) {
      const timingError = validateLineTimings(lines);
      if (timingError) {
        return res.status(400).json({
          success: false,
          message: timingError,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      // Update schedule details
      await tx.working_schedules.update({
        where: { schedule_id: schedId },
        data: {
          ...(schedule_name !== undefined && { schedule_name }),
          ...(schedule_type !== undefined && { schedule_type }),
          ...(is_active !== undefined && { is_active }),
          updated_at: new Date(),
        },
      });

      // Update lines if provided
      if (lines) {
        const activeLines = lines.filter((l) => l.is_working !== false);

        // Delete existing lines
        await tx.working_schedule_lines.deleteMany({
          where: { schedule_id: schedId },
        });

        if (activeLines.length > 0) {
          const lineData = activeLines.map((l) => ({
            schedule_id: schedId,
            day_of_week: l.day_of_week,
            start_time: parseHHMMToDate(l.start_time),
            end_time: parseHHMMToDate(l.end_time),
            break_minutes: l.break_minutes || 0,
          }));

          await tx.working_schedule_lines.createMany({
            data: lineData,
          });
        }
      }
    });

    // Re-fetch to get PostgreSQL trigger-recalculated weekly_hours!
    const updatedSched = await prisma.working_schedules.findUnique({
      where: { schedule_id: schedId },
      include: {
        working_schedule_lines: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Working schedule updated successfully',
      schedule: formatSchedule(updatedSched),
    });
  } catch (error) {
    next(error);
  }
};
