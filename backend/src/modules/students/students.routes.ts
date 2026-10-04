import { Router } from 'express';
import * as ctrl from './students.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './students.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as attendanceCtrl from '../attendance/attendance.controller';

import { authorizeScope } from '../../middleware/authorizeScope';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), authorizeScope('STUDENT'), ctrl.getById);
router.get('/:id/attendance', validateRequest(schemas.idParamSchema), authorizeScope('STUDENT'), (req: any, res: any, next: any) => {
  req.params.studentId = req.params.id;
  attendanceCtrl.getStudentSummary(req, res, next);
});

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createStudentSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateStudentSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteStudent);

export default router;
