import { Router } from 'express';
import * as ctrl from './attendance.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './attendance.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authorizeScope } from '../../middleware/authorizeScope';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION', 'TUTOR', 'TEACHER', 'HOD'), authorizeScope('SESSION'), validateRequest(schemas.createAttendanceSchema), ctrl.create);
router.post('/bulk', authorize('ADMINISTRATION', 'TUTOR', 'TEACHER', 'HOD'), authorizeScope('SESSION'), validateRequest(schemas.bulkAttendanceSchema), ctrl.createBulk);
router.patch('/:id', authorize('ADMINISTRATION', 'TUTOR', 'TEACHER', 'HOD'), authorizeScope('ATTENDANCE'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateAttendanceSchema), ctrl.update);

export default router;
