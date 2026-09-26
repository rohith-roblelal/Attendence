import { Request, Response, NextFunction } from 'express';
import * as repo from './dashboard.repository';
import * as rbacRepo from '../rbac/rbac.repository';

export const getAdministrationStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await repo.getAdministrationStats();
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const getHodStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) {
      return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    }
    // A teacher might be HOD of multiple departments, but the rules assume one primarily,
    // let's just fetch the department they are HOD of.
    // For this simple implementation, we'll get their assigned department from their teacher record
    const [teacherRows] = await rbacRepo.pool.query('SELECT department_id FROM teachers WHERE id = ?', [teacherId]);
    const departmentId = (teacherRows as any[])[0]?.department_id;
    if (!departmentId) {
      return res.status(403).json({ status: 'error', message: 'No department assigned' });
    }
    const isHod = await rbacRepo.isHodOfDepartment(teacherId, departmentId);
    if (!isHod) {
      return res.status(403).json({ status: 'error', message: 'Not HOD of this department' });
    }
    
    const stats = await repo.getHodStats(departmentId);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const getTutorStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) {
      return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    }
    const [tutorRows] = await rbacRepo.pool.query('SELECT class_id FROM tutor_assignments WHERE teacher_id = ? AND status = "ACTIVE"', [teacherId]);
    const classId = (tutorRows as any[])[0]?.class_id;
    if (!classId) {
      return res.status(403).json({ status: 'error', message: 'Not assigned as a tutor' });
    }
    
    const stats = await repo.getTutorStats(classId);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const getTeacherStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) {
      return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    }
    const stats = await repo.getTeacherStats(teacherId);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const getStudentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [studentRows] = await rbacRepo.pool.query('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
    const studentId = (studentRows as any[])[0]?.id;
    if (!studentId) {
      return res.status(403).json({ status: 'error', message: 'Not a student' });
    }
    const stats = await repo.getStudentStats(studentId);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};
