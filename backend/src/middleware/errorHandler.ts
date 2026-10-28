import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ err }, 'Unhandled Error');
  
  const status = err.status || 500;
  
  // Sanitize 500 messages in production to prevent SQL or path leaks
  let message = err.message || 'Internal Server Error';
  if (status === 500 && env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }

  res.status(status).json({
    status: 'error',
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
