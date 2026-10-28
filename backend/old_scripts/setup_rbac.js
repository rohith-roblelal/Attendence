const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules', 'rbac');
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

const testsDir = path.join(__dirname, 'tests');

const repoContent = `
import { pool } from '../../db/pool';

export const getTeacherIdByUserId = async (userId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
  return (rows as any[])[0]?.id || null;
};

export const isHodOfDepartment = async (teacherId: number, departmentId: number): Promise<boolean> => {
  const [rows] = await pool.query(
    'SELECT 1 FROM department_hod_assignments WHERE teacher_id = ? AND department_id = ? AND is_active = TRUE',
    [teacherId, departmentId]
  );
  return (rows as any[]).length > 0;
};

export const isTutorOfClass = async (teacherId: number, classId: number): Promise<boolean> => {
  const [rows] = await pool.query(
    'SELECT 1 FROM tutor_assignments WHERE teacher_id = ? AND class_id = ? AND is_active = TRUE',
    [teacherId, classId]
  );
  return (rows as any[]).length > 0;
};

export const getDepartmentOfClass = async (classId: number): Promise<number | null> => {
  const [rows] = await pool.query(
    \`SELECT d.id FROM classes c 
     JOIN semesters s ON c.semester_id = s.id 
     JOIN admission_batches b ON s.batch_id = b.id 
     JOIN specializations sp ON b.specialization_id = sp.id 
     WHERE c.id = ?\`,
    [classId]
  );
  return (rows as any[])[0]?.id || null;
};

export const getDepartmentOfSubject = async (subjectId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT department_id FROM subjects WHERE id = ?', [subjectId]);
  return (rows as any[])[0]?.department_id || null;
};

export const getDepartmentOfClassSubject = async (classSubjectId: number): Promise<number | null> => {
  const [rows] = await pool.query(
    'SELECT s.department_id FROM class_subjects cs JOIN subjects s ON cs.subject_id = s.id WHERE cs.id = ?',
    [classSubjectId]
  );
  return (rows as any[])[0]?.department_id || null;
};

export const getClassOfClassSubject = async (classSubjectId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT class_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0]?.class_id || null;
};

export const getTeacherOfClassSubject = async (classSubjectId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT teacher_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0]?.teacher_id || null;
};

export const getSessionDetails = async (sessionId: number): Promise<any> => {
  const [rows] = await pool.query('SELECT class_id, class_subject_id, assigned_teacher_id, conducted_by_teacher_id FROM class_sessions WHERE id = ?', [sessionId]);
  return (rows as any[])[0] || null;
};

export const getStudentClass = async (studentId: number): Promise<number | null> => {
  // Simplification for reading own data: check if enrolled
  const [rows] = await pool.query('SELECT class_id FROM student_enrollments WHERE student_id = ? AND status = \\'ACTIVE\\'', [studentId]);
  return (rows as any[])[0]?.class_id || null;
};
`;
fs.writeFileSync(path.join(srcDir, 'rbac.repository.ts'), repoContent.trim() + '\n');

const serviceContent = `
import * as repo from './rbac.repository';

// Returns true if user can manage the department
export const canManageDepartment = async (user: any, departmentId: number): Promise<boolean> => {
  if (user.role === 'ADMINISTRATION') return true;
  if (user.role === 'HOD') {
    const teacherId = await repo.getTeacherIdByUserId(user.id);
    if (!teacherId) return false;
    return await repo.isHodOfDepartment(teacherId, departmentId);
  }
  return false;
};

// Returns true if user can manage the class
export const canManageClass = async (user: any, classId: number): Promise<boolean> => {
  if (user.role === 'ADMINISTRATION') return true;
  
  const teacherId = await repo.getTeacherIdByUserId(user.id);
  if (!teacherId) return false;

  if (user.role === 'HOD') {
    const deptId = await repo.getDepartmentOfClass(classId);
    if (deptId && await repo.isHodOfDepartment(teacherId, deptId)) return true;
  }
  
  if (user.role === 'TUTOR') {
    if (await repo.isTutorOfClass(teacherId, classId)) return true;
  }
  
  // Teachers cannot manage classes, only their specific sessions
  return false;
};

export const canManageSubject = async (user: any, subjectId: number): Promise<boolean> => {
  if (user.role === 'ADMINISTRATION') return true;
  if (user.role === 'HOD') {
    const teacherId = await repo.getTeacherIdByUserId(user.id);
    if (!teacherId) return false;
    const deptId = await repo.getDepartmentOfSubject(subjectId);
    if (deptId && await repo.isHodOfDepartment(teacherId, deptId)) return true;
  }
  return false;
};

export const canManageClassSubject = async (user: any, classSubjectId: number): Promise<boolean> => {
  if (user.role === 'ADMINISTRATION') return true;
  if (user.role === 'HOD') {
    const teacherId = await repo.getTeacherIdByUserId(user.id);
    if (!teacherId) return false;
    const deptId = await repo.getDepartmentOfClassSubject(classSubjectId);
    if (deptId && await repo.isHodOfDepartment(teacherId, deptId)) return true;
  }
  return false;
};

// Manage class session (creation, updates, and attendance)
export const canManageSession = async (user: any, sessionId?: number, classId?: number, classSubjectId?: number, conductedTeacherId?: number): Promise<boolean> => {
  if (user.role === 'ADMINISTRATION') return true;
  
  const teacherId = await repo.getTeacherIdByUserId(user.id);
  if (!teacherId) return false;

  // If sessionId is provided, fetch details
  let cId = classId;
  let csId = classSubjectId;
  let aTId = null;
  let cTId = conductedTeacherId;
  
  if (sessionId) {
    const session = await repo.getSessionDetails(sessionId);
    if (!session) return false;
    cId = session.class_id;
    csId = session.class_subject_id;
    aTId = session.assigned_teacher_id;
    cTId = session.conducted_by_teacher_id;
  }

  if (user.role === 'HOD' && cId) {
    const deptId = await repo.getDepartmentOfClass(cId);
    if (deptId && await repo.isHodOfDepartment(teacherId, deptId)) return true;
  }
  
  if (user.role === 'TUTOR' && cId) {
    if (await repo.isTutorOfClass(teacherId, cId)) return true;
  }
  
  if (user.role === 'TEACHER') {
    // Teacher can manage if they are the assigned permanent teacher OR the conducted teacher
    if (cTId === teacherId) return true;
    if (aTId === teacherId) return true;
    
    // Fallback: check permanent assignment if creating a new session without passing assignedTeacherId
    if (csId) {
      const permTId = await repo.getTeacherOfClassSubject(csId);
      if (permTId === teacherId) return true;
    }
  }
  
  return false;
};
`;
fs.writeFileSync(path.join(srcDir, 'rbac.service.ts'), serviceContent.trim() + '\n');
