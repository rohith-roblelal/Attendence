import { Router } from 'express';
import * as ctrl from './class-subjects.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './class-subjects.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION', 'HOD'), validateRequest(schemas.createClassSubjectSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION', 'HOD'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateClassSubjectSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION', 'HOD'), validateRequest(schemas.idParamSchema), ctrl.deactivate);

export default router;
