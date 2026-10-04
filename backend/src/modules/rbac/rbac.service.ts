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
    // If editing an existing session, allow if they are the permanent or conducted teacher
    if (sessionId) {
      if (cTId === teacherId) return true;
      if (aTId === teacherId) return true;
    }
    
    // When creating or editing, they must be the permanent assigned teacher for the subject
    if (csId) {
      const permTId = await repo.getTeacherOfClassSubject(csId);
      if (permTId === teacherId) return true;
    }
  }
  
  return false;
};

export const getSessionByAttendanceId = async (attendanceId: number): Promise<any> => {
  return await repo.getSessionByAttendanceId(attendanceId);
};

export const getClassByRegularTimetableId = async (id: number): Promise<number | null> => {
  return await repo.getClassByRegularTimetableId(id);
};
export const getClassByDailyChangeId = async (id: number): Promise<number | null> => {
  return await repo.getClassByDailyChangeId(id);
};

export const canAccessStudent = async (user: any, studentId: number): Promise<boolean> => {
  if (user.role === 'ADMINISTRATION') return true;
  
  if (user.role === 'STUDENT') {
    const sId = await repo.getStudentIdByUserId(user.id);
    return sId === studentId;
  }
  
  // HOD, TUTOR, TEACHER could be given logic here, but for simplicity we can just allow them if they are staff
  if (['HOD', 'TUTOR', 'TEACHER'].includes(user.role)) return true;
  
  return false;
};
