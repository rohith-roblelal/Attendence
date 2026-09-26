import { Request, Response, NextFunction } from 'express';
import * as service from './attendance.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAll(req.query) }); } catch (err) { next(err); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.update(Number(req.params.id), req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const createBulk = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.createBulk(req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const getStudentSummary = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getStudentSummary(Number(req.params.studentId)) }); } catch (err) { next(err); }
};
