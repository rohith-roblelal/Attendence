import { Request, Response, NextFunction } from 'express';
import * as rbacService from '../modules/rbac/rbac.service';

export const authorizeScope = (scopeType: 'DEPARTMENT' | 'CLASS' | 'SUBJECT' | 'CLASS_SUBJECT' | 'SESSION' | 'TIMETABLE' | 'ATTENDANCE') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) return next({ status: 401, message: 'User not authenticated' });
      
      // ADMINISTRATION always has access
      if (user.role === 'ADMINISTRATION') return next();

      let hasAccess = false;
      
      if (scopeType === 'DEPARTMENT') {
        const departmentId = Number(req.params.id) || Number(req.body.department_id);
        if (departmentId) hasAccess = await rbacService.canManageDepartment(user, departmentId);
      } 
      else if (scopeType === 'TIMETABLE') {
        let classId = Number(req.body.class_id) || Number(req.query.class_id);
        const recordId = Number(req.params.id);
        if (!classId && recordId) {
          // If the route has /daily-changes in it, use daily change id, else regular timetable id
          if (req.originalUrl.includes('/daily-changes')) {
            classId = await rbacService.getClassByDailyChangeId(recordId);
          } else {
            classId = await rbacService.getClassByRegularTimetableId(recordId);
          }
        }
        if (classId) hasAccess = await rbacService.canManageClass(user, classId);
      }
      else if (scopeType === 'CLASS') {
        const classId = Number(req.params.id) || Number(req.body.class_id) || Number(req.query.class_id);
        if (classId) hasAccess = await rbacService.canManageClass(user, classId);
      }
      else if (scopeType === 'SUBJECT') {
        const subjectId = Number(req.params.id) || Number(req.body.subject_id);
        if (subjectId) hasAccess = await rbacService.canManageSubject(user, subjectId);
      }
      else if (scopeType === 'CLASS_SUBJECT') {
        const classSubjectId = Number(req.params.id) || Number(req.body.class_subject_id);
        if (classSubjectId) hasAccess = await rbacService.canManageClassSubject(user, classSubjectId);
      }
      else if (scopeType === 'SESSION') {
        const sessionId = Number(req.params.id) || Number(req.body.class_session_id);
        const classId = Number(req.body.class_id);
        const classSubjectId = Number(req.body.class_subject_id);
        const conductedTeacherId = Number(req.body.conducted_by_teacher_id);
        
        hasAccess = await rbacService.canManageSession(user, sessionId, classId, classSubjectId, conductedTeacherId);
      }
      else if (scopeType === 'ATTENDANCE') {
        const attendanceId = Number(req.params.id);
        if (attendanceId) {
          const session = await rbacService.getSessionByAttendanceId(attendanceId);
          if (session) {
            hasAccess = await rbacService.canManageSession(user, session.id, session.class_id, session.class_subject_id, session.conducted_by_teacher_id);
          }
        }
      }

      if (!hasAccess) {
        return next({ status: 403, message: 'Forbidden: Insufficient permissions for this scope' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
