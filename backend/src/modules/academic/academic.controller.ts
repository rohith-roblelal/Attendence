import { Request, Response, NextFunction } from 'express';
import * as service from './academic.service';

const createHandlers = (serviceModule: any) => ({
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.getAll(req.query);
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.getById(Number(req.params.id));
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.create(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.update(Number(req.params.id), req.body);
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await serviceModule.delete(Number(req.params.id));
      res.status(204).send();
    } catch (err) { next(err); }
  }
});

export const academicYears = createHandlers(service.academicYears);
export const departments = createHandlers(service.departments);
export const specializations = createHandlers(service.specializations);
export const admissionBatches = createHandlers(service.admissionBatches);
export const semesters = createHandlers(service.semesters);
