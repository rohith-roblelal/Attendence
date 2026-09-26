import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserPayload } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const JWT_EXPIRES_IN = '1h';

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
};
