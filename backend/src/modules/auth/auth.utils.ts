import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserPayload } from './auth.types';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
};
