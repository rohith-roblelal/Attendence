import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.utils';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      throw { status: 401, message: 'Authentication required' };
    }

    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (error) {
    next({ status: 401, message: 'Invalid or expired token' });
  }
};
