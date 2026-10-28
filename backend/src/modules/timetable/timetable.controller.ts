import { Request, Response, NextFunction } from 'express';
import * as service from './timetable.service';

export const getAllRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAllRegular(req.query) }); } catch (err) { next(err); }
};
export const getRegularById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getRegularById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const createRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.createRegular(req.body) }); } catch (err) { next(err); }
};
export const updateRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.updateRegular(Number(req.params.id), req.body) }); } catch (err) { next(err); }
};
export const deactivateRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deactivateRegular(Number(req.params.id)); res.status(204).send(); } catch (err) { next(err); }
};

export const getAllDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAllDaily(req.query) }); } catch (err) { next(err); }
};
export const getDailyById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getDailyById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const createDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.createDaily(req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const updateDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.updateDaily(Number(req.params.id), req.body) }); } catch (err) { next(err); }
};
export const deleteDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteDaily(Number(req.params.id)); res.status(204).send(); } catch (err) { next(err); }
};
