import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: ZodSchema<any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
};
