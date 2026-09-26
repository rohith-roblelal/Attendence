import { Router } from 'express';
import * as ctrl from './timetable.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './timetable.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authorizeScope } from '../../middleware/authorizeScope';

const router = Router();
router.use(authenticate);

// Regular Routes
router.get('/', ctrl.getAllRegular);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getRegularById);
router.post('/', authorize('ADMINISTRATION', 'HOD', 'TUTOR'), authorizeScope('TIMETABLE'), validateRequest(schemas.createRegularSchema), ctrl.createRegular);
router.patch('/:id', authorize('ADMINISTRATION', 'HOD', 'TUTOR'), authorizeScope('TIMETABLE'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateRegularSchema), ctrl.updateRegular);
router.delete('/:id', authorize('ADMINISTRATION', 'HOD', 'TUTOR'), authorizeScope('TIMETABLE'), validateRequest(schemas.idParamSchema), ctrl.deactivateRegular);

// Daily Routes
router.get('/daily-changes', ctrl.getAllDaily);
router.get('/daily-changes/:id', validateRequest(schemas.idParamSchema), ctrl.getDailyById);
router.post('/daily-changes', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('TIMETABLE'), validateRequest(schemas.createDailySchema), ctrl.createDaily);
router.patch('/daily-changes/:id', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('TIMETABLE'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateDailySchema), ctrl.updateDaily);
router.delete('/daily-changes/:id', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('TIMETABLE'), validateRequest(schemas.idParamSchema), ctrl.deleteDaily);

export default router;
