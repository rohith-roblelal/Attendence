import { Router } from 'express';
import * as ctrl from './teachers.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './teachers.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createTeacherSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateTeacherSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteTeacher);

export default router;
