import { Request, Response, NextFunction } from 'express';
import * as repo from './dashboard.repository';
import * as rbacRepo from '../rbac/rbac.repository';
import { pool } from '../../db/pool';

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

    // Resolve Active HOD Assignment -> Assigned Department -> Assigned Academic Year
    // Checks is_active AND strict date lifecycle boundaries (start_date <= today <= end_date)
    const [hodRows] = await pool.query(
      'SELECT department_id, academic_year_id FROM department_hod_assignments WHERE teacher_id = ? AND is_active = TRUE AND start_date <= CURDATE() AND (end_date IS NULL OR end_date >= CURDATE()) LIMIT 1',
      [teacherId]
    );
    const assignment = (hodRows as any[])[0];

    if (!assignment) {
      return res.status(403).json({ status: 'error', message: 'No active HOD assignment found' });
    }

    const { department_id: departmentId, academic_year_id: assignedAcademicYearId } = assignment;
    const academicYearId = req.query.academic_year_id ? parseInt(req.query.academic_year_id as string, 10) : assignedAcademicYearId;
    
    // Fetch dashboard stats scoped by securely resolved department and selected academic year
    const stats = await repo.getHodStats(departmentId, academicYearId);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const getHodPeople = async (req: Request, res: Response, next: NextFunction) => {
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
    const academicYearId = req.query.academic_year_id ? parseInt(req.query.academic_year_id as string, 10) : assignedAcademicYearId;

    const data = await repo.getHodTeachersByClass(departmentId, academicYearId);
    const [allAcademicYears] = await pool.query('SELECT id, name FROM academic_years ORDER BY id DESC');
    res.json({ status: 'success', data: { ...data, academic_years: allAcademicYears } });
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
    const [tutorRows] = await pool.query('SELECT class_id FROM tutor_assignments WHERE teacher_id = ? AND is_active = TRUE', [teacherId]);
    const classId = (tutorRows as any[])[0]?.class_id;
    if (!classId) {
      return res.status(403).json({ status: 'error', message: 'Not assigned as a tutor' });
    }
    
    const stats = await repo.getTutorStats(classId);
    res.json({ 
      status: 'success', 
      data: {
        ...stats,
        classInfo: { id: classId }
      } 
    });
  } catch (error) {
    next(error);
  }
};

export const getTutorStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) {
      return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    }
    const [tutorRows] = await pool.query('SELECT class_id FROM tutor_assignments WHERE teacher_id = ? AND is_active = TRUE', [teacherId]);
    const classId = (tutorRows as any[])[0]?.class_id;
    if (!classId) {
      return res.status(403).json({ status: 'error', message: 'Not assigned as a tutor' });
    }
    
    const data = await repo.getTutorStudents(classId);
    res.json({ status: 'success', data });
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

export const getTeacherTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    
    const data = await repo.getTeacherTimetable(teacherId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getTeacherSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    
    const data = await repo.getTeacherSessions(teacherId);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};


export const getTutorStudentStatsById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });

    const [tutorRows] = await pool.query('SELECT class_id FROM tutor_assignments WHERE teacher_id = ? AND is_active = TRUE', [teacherId]);
    const classId = (tutorRows as any[])[0]?.class_id;
    if (!classId) return res.status(403).json({ status: 'error', message: 'Not assigned as a tutor' });

    const studentId = parseInt(req.params.id, 10);
    
    // Ensure the student is actually in the tutor's assigned class
    const [enrollment] = await pool.query(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND class_id = ? AND status = ?',
      [studentId, classId, 'ACTIVE']
    );
    
    if ((enrollment as any[]).length === 0) {
      return res.status(403).json({ status: 'error', message: 'Student is not assigned to your class' });
    }

    const stats = await repo.getStudentStats(studentId);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
};

export const getStudentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [studentRows] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
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

export const getStudentTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [studentRows] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
    const studentId = (studentRows as any[])[0]?.id;
    if (!studentId) return res.status(403).json({ status: 'error', message: 'Not a student' });

    // Get the student's active enrolled class
    const [enrollmentRows] = await pool.query(
      'SELECT class_id FROM student_enrollments WHERE student_id = ? AND status = ? ORDER BY start_date DESC LIMIT 1',
      [studentId, 'ACTIVE']
    );
    const classId = (enrollmentRows as any[])[0]?.class_id;
    if (!classId) return res.status(404).json({ status: 'error', message: 'No active class enrollment found' });

    const timetable = await repo.getStudentTimetable(classId);
    res.json({ status: 'success', data: timetable });
  } catch (error) {
    next(error);
  }
};
