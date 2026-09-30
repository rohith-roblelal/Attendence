import { Router } from 'express';
import * as ctrl from './subjects.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './subjects.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createSubjectSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateSubjectSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.remove);

export default router;
