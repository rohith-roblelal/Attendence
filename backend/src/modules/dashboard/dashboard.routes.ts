import { Router } from 'express';
import * as ctrl from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/administration', authorize('ADMINISTRATION'), ctrl.getAdministrationStats);
router.get('/hod', authorize('HOD'), ctrl.getHodStats);
router.get('/tutor', authorize('TUTOR'), ctrl.getTutorStats);
router.get('/teacher', authorize('TEACHER'), ctrl.getTeacherStats);
router.get('/student', authorize('STUDENT'), ctrl.getStudentStats);

export default router;
