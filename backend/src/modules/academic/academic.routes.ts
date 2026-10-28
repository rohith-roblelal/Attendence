import { Router } from 'express';
import * as ctrl from './academic.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './academic.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Require auth for all
router.use(authenticate);

// Generate routes helper
const buildRoutes = (path: string, controller: any, createSchema: any, updateSchema: any) => {
  // Read routes (All authenticated users)
  router.get(`/${path}`, controller.getAll);
  router.get(`/${path}/:id`, validateRequest(schemas.idParamSchema), controller.getById);
  
  // Write routes (ADMINISTRATION only)
  router.post(`/${path}`, authorize('ADMINISTRATION'), validateRequest(createSchema), controller.create);
  router.patch(`/${path}/:id`, authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(updateSchema), controller.update);
  router.delete(`/${path}/:id`, authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), controller.delete);
};

buildRoutes('academic-years', ctrl.academicYears, schemas.createAcademicYearSchema, schemas.updateAcademicYearSchema);
buildRoutes('departments', ctrl.departments, schemas.createDepartmentSchema, schemas.updateDepartmentSchema);
buildRoutes('specializations', ctrl.specializations, schemas.createSpecializationSchema, schemas.updateSpecializationSchema);
buildRoutes('admission-batches', ctrl.admissionBatches, schemas.createAdmissionBatchSchema, schemas.updateAdmissionBatchSchema);
buildRoutes('semesters', ctrl.semesters, schemas.createSemesterSchema, schemas.updateSemesterSchema);

export default router;
