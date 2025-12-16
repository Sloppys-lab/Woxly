import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('Auth middleware: No token provided', {
        path: req.path,
        method: req.method,
        headers: Object.keys(req.headers),
      });
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: number;
    };

    req.userId = decoded.userId;
    console.log('Auth middleware: Token verified', { userId: decoded.userId, path: req.path, method: req.method });
    console.log('Auth middleware: Calling next()');
    next();
  } catch (error: any) {
    console.log('Auth middleware: Token verification failed', {
      error: error.message,
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

