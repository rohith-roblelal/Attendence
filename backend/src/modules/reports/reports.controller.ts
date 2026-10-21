import { Request, Response, NextFunction } from 'express';
import * as repo from './reports.repository';
import * as rbacRepo from '../rbac/rbac.repository';
import * as rbacService from '../rbac/rbac.service';
import { pool } from '../../db/pool';

export const getStudentAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = parseInt(req.params.id as string, 10);
    // Student can view their own report. Others might view it if they have permission, but for simplicity let's rely on authorizeScope or specific checks.
    // Actually, authorizeScope doesn't have STUDENT scope yet. Let's do a simple check.
    if (req.user!.role === 'STUDENT') {
      const [studentRows] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
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
    const classId = parseInt(req.params.id as string, 10);
    const report = await repo.getClassAttendanceReport(classId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getSubjectAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = parseInt(req.params.id as string, 10);
    const report = await repo.getSubjectAttendanceReport(subjectId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = parseInt(req.params.id as string, 10);
    const report = await repo.getDepartmentAttendanceReport(departmentId);
    res.json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getHodReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });

    const [hodRows] = await pool.query(
      'SELECT department_id, academic_year_id FROM department_hod_assignments WHERE teacher_id = ? AND is_active = TRUE AND start_date <= CURDATE() AND (end_date IS NULL OR end_date >= CURDATE()) LIMIT 1',
      [teacherId]
    );
    const assignment = (hodRows as any[])[0];
    if (!assignment) return res.status(403).json({ status: 'error', message: 'No active HOD assignment found' });

    const { department_id: departmentId, academic_year_id: assignedAcademicYearId } = assignment;
    let academicYearId = req.query.academic_year_id ? parseInt(req.query.academic_year_id as string, 10) : assignedAcademicYearId;
    if (!academicYearId) {
      const [latestYearRows] = await pool.query('SELECT id FROM academic_years ORDER BY is_active DESC, id DESC LIMIT 1');
      academicYearId = (latestYearRows as any[])[0]?.id;
    }

    const [allAcademicYears] = await pool.query('SELECT id, name FROM academic_years ORDER BY id DESC');
    const report = await repo.getHodDepartmentReport(departmentId, academicYearId);
    res.json({ status: 'success', data: { ...report, academic_years: allAcademicYears } });
  } catch (error) {
    next(error);
  }
};
