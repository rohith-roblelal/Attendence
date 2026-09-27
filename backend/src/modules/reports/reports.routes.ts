import { Router } from 'express';
import * as ctrl from './reports.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeScope } from '../../middleware/authorizeScope';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Reports APIs are protected by the same scope logic
router.get('/students/:id/attendance', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT'), ctrl.getStudentAttendanceReport);

router.get('/classes/:id/attendance', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('CLASS'), ctrl.getClassAttendanceReport);

router.get('/subjects/:id/attendance', authorize('ADMINISTRATION', 'HOD', 'TEACHER'), authorizeScope('SUBJECT'), ctrl.getSubjectAttendanceReport);

router.get('/department/:id/attendance', authorize('ADMINISTRATION', 'HOD'), authorizeScope('DEPARTMENT'), ctrl.getDepartmentAttendanceReport);

router.get('/hod/department', authorize('HOD'), ctrl.getHodReport);

export default router;
