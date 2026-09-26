import { Router } from 'express';
import * as authController from './auth.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { loginSchema } from './auth.schemas';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
