import { Router } from 'express';
import * as adminController from './admin.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './admin.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes here are protected and require ADMINISTRATION role
router.use(authenticate);
router.use(authorize('ADMINISTRATION'));

router.post('/users', validateRequest(createUserSchema), adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', validateRequest(userIdParamSchema), adminController.getUserById);
router.patch('/users/:id', validateRequest(userIdParamSchema), validateRequest(updateUserSchema), adminController.updateUser);
router.delete('/users/:id', validateRequest(userIdParamSchema), adminController.deactivateUser);

export default router;
