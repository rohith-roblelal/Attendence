import { Router } from 'express';
import * as authController from './auth.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { loginSchema } from './auth.schemas';
import { authenticate } from '../../middleware/authenticate';

import rateLimit from 'express-rate-limit';

const router = Router();

import { env } from '../../config/env';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 10 : 100, // Limit each IP to 10 login requests in production, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts, please try again later.' }
});

router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
