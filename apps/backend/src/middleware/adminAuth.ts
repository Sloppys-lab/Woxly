import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminAuthRequest extends Request {
  adminId?: number;
}

export const adminAuthMiddleware = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'admin-secret'
    ) as {
      adminId: number;
      type?: string;
    };

    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

