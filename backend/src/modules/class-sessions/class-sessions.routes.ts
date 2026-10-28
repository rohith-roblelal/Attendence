import { Router } from 'express';
import * as ctrl from './class-sessions.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './class-sessions.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authorizeScope } from '../../middleware/authorizeScope';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('SESSION'), validateRequest(schemas.createSessionSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('SESSION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateSessionSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER'), authorizeScope('SESSION'), validateRequest(schemas.idParamSchema), ctrl.cancel);

export default router;
