import { Request, Response, NextFunction } from 'express';
import * as service from './class-sessions.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAll(req.query) }); } catch (err) { next(err); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body) }); } catch (err) { next(err); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.update(Number(req.params.id), req.body) }); } catch (err) { next(err); }
};
export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.cancelSession(Number(req.params.id)); res.status(204).send(); } catch (err) { next(err); }
};
