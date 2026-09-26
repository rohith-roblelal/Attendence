import { Request, Response, NextFunction } from 'express';
import * as repo from './reports.repository';
import * as rbacRepo from '../rbac/rbac.repository';
import * as rbacService from '../rbac/rbac.service';

export const getStudentAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    // Student can view their own report. Others might view it if they have permission, but for simplicity let's rely on authorizeScope or specific checks.
    // Actually, authorizeScope doesn't have STUDENT scope yet. Let's do a simple check.
    if (req.user!.role === 'STUDENT') {
      const [studentRows] = await rbacRepo.pool.query('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
      const reqStudentId = (studentRows as any[])[0]?.id;
      if (reqStudentId !== studentId) {
        return res.status(403).json({ status: 'error', message: 'Not authorized' });
      }
    }
    const report = await repo.getStudentAttendanceReport(studentId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getClassAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = parseInt(req.params.id, 10);
    const report = await repo.getClassAttendanceReport(classId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getSubjectAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = parseInt(req.params.id, 10);
    const report = await repo.getSubjectAttendanceReport(subjectId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = parseInt(req.params.id, 10);
    const report = await repo.getDepartmentAttendanceReport(departmentId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};
