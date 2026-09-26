import { Router } from 'express';
import * as ctrl from './classes.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './classes.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Read routes (All authenticated users)
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes (ADMINISTRATION only)
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createClassSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateClassSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteClass);

export default router;