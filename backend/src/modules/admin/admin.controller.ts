import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import { logger } from '../../utils/logger';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.createUser(req.body);
    logger.info({ action: 'CREATE_USER', userId: user.id, username: user.username, role: user.role, adminId: (req as any).user.id }, 'Admin created new user');
    res.status(201).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await adminService.getAllUsers();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.getUserById(Number(req.params.id));
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    const user = await adminService.updateUser(userId, req.body);
    logger.info({ action: 'UPDATE_USER', userId: user.id, adminId: (req as any).user.id }, 'Admin updated user');
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    await adminService.deleteUser(userId);
    logger.info({ action: 'DELETE_USER', userId, adminId: (req as any).user.id }, 'Admin deleted user');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
