import { prisma } from '../config/db.js';
import { config } from '../config/env.js';

export const getHealth = async (req, res, next) => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbErr) {
      dbStatus = `error: ${dbErr.message}`;
    }

    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: dbStatus,
      uptime: process.uptime(),
    });
  } catch (error) {
    next(error);
  }
};
