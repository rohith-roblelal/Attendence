import { Request, Response, NextFunction } from 'express';
import * as service from './classes.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getAll(req.query);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getById(Number(req.params.id));
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const deleteClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteClass(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};