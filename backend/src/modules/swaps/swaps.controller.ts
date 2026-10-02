import { Request, Response, NextFunction } from 'express';
import * as service from './swaps.service';
import * as rbacRepo from '../rbac/rbac.repository';

export const createSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    
    req.body.requesting_teacher_id = teacherId;
    const swap = await service.createSwapRequest(req.body, teacherId);
    res.status(201).json({ status: 'success', data: swap });
  } catch (error) {
    next(error);
  }
};

export const getMySwaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    
    const swaps = await service.getMySwaps(teacherId);
    res.json({ status: 'success', data: swaps });
  } catch (error) {
    next(error);
  }
};

export const respondToSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await rbacRepo.getTeacherIdByUserId(req.user!.id);
    if (!teacherId) return res.status(403).json({ status: 'error', message: 'Not a teacher' });
    
    const swap = await service.respondToSwap(Number(req.params.id), req.body.status, teacherId, req.user!.id);
    res.json({ status: 'success', data: swap });
  } catch (error) {
    next(error);
  }
};
