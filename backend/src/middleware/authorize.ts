import { Request, Response, NextFunction } from 'express';

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return next({ status: 401, message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(user.role)) {
      return next({ status: 403, message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
