import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const { user, token } = await authService.login(username, password);

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'No token provided' });
    }

    // Usually you'd check a refresh token instead of the same access token, 
    // but for this simple JWT implementation we'll decode and issue a new one.
    // In production, consider a separate refresh token stored in DB.
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
    
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (e) {
      return res.status(401).json({ status: 'error', message: 'Invalid token' });
    }

    const newPayload = { id: payload.id, username: payload.username, role: payload.role };
    const newToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000,
    });

    res.status(200).json({ status: 'success', message: 'Token refreshed' });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is populated by the authenticate middleware
    res.status(200).json({ status: 'success', data: { user: (req as any).user } });
  } catch (error) {
    next(error);
  }
};
