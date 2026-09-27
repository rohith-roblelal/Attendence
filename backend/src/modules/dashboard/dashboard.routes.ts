import { Router } from 'express';
import * as ctrl from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/administration', authorize('ADMINISTRATION'), ctrl.getAdministrationStats);
router.get('/hod', authorize('HOD'), ctrl.getHodStats);
router.get('/hod/people', authorize('HOD'), ctrl.getHodPeople);
router.get('/tutor', authorize('TUTOR'), ctrl.getTutorStats);
router.get('/tutor/students', authorize('TUTOR'), ctrl.getTutorStudents);
router.get('/teacher', authorize('TEACHER', 'TUTOR', 'HOD'), ctrl.getTeacherStats);
router.get('/teacher/timetable', authorize('TEACHER', 'TUTOR', 'HOD'), ctrl.getTeacherTimetable);
router.get('/teacher/sessions', authorize('TEACHER', 'TUTOR', 'HOD'), ctrl.getTeacherSessions);
router.get('/student', authorize('STUDENT'), ctrl.getStudentStats);
router.get('/student/timetable', authorize('STUDENT'), ctrl.getStudentTimetable);

export default router;
