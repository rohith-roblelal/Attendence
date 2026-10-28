import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './swaps.schemas';
import * as ctrl from './swaps.controller';

const router = Router();

router.post('/', authorize('TEACHER', 'HOD', 'TUTOR'), validateRequest(schemas.createSwapSchema), ctrl.createSwap);
router.get('/me', authorize('TEACHER', 'HOD', 'TUTOR'), ctrl.getMySwaps);
router.patch('/:id/respond', authorize('TEACHER', 'HOD', 'TUTOR'), validateRequest(schemas.idParamSchema), validateRequest(schemas.respondSwapSchema), ctrl.respondToSwap);

export { router as swapsRouter };
