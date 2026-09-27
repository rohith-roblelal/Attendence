import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { pool } from './db/pool';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import academicRoutes from './modules/academic/academic.routes';
import classesRoutes from './modules/classes/classes.routes';
import studentsRoutes from './modules/students/students.routes';
import teachersRoutes from './modules/teachers/teachers.routes';
import hodAssignmentsRoutes from './modules/hod-assignments/hod-assignments.routes';
import tutorAssignmentsRoutes from './modules/tutor-assignments/tutor-assignments.routes';
import subjectsRoutes from './modules/subjects/subjects.routes';
import classSubjectsRoutes from './modules/class-subjects/class-subjects.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import classSessionsRoutes from './modules/class-sessions/class-sessions.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportsRoutes from './modules/reports/reports.routes';

export const app = express();
app.set('etag', false); // Disable ETag to prevent 304 Not Modified CORS issues

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body Parser
app.use(express.json());
app.use(cookieParser());

// Logging Middleware
app.use(pinoHttp({ logger }));

// Health Check Endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      message: 'Server and Database are healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check database query failed', error);
    res.status(503).json({
      status: 'error',
      message: 'Database connection issue',
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', academicRoutes);
app.use('/api/v1/classes', classesRoutes);
app.use('/api/v1/students', studentsRoutes);
app.use('/api/v1/teachers', teachersRoutes);
app.use('/api/v1/hod-assignments', hodAssignmentsRoutes);
app.use('/api/v1/tutor-assignments', tutorAssignmentsRoutes);
app.use('/api/v1/subjects', subjectsRoutes);
app.use('/api/v1/class-subjects', classSubjectsRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/class-sessions', classSessionsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportsRoutes);

// Error Handling
app.use(errorHandler);
