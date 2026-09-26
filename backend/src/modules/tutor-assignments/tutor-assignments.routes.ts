import { Router } from 'express';
import * as ctrl from './tutor-assignments.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './tutor-assignments.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createTutorAssignmentSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateTutorAssignmentSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deactivate);

export default router;
