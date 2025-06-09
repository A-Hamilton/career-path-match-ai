// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';
import { logger } from '../utils/logger';

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Missing or invalid Authorization header' 
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await AuthService.verifyIdToken(idToken);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    logger.error("Token Verification Failed:", err);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: err.message, 
      code: err.code 
    });
  }
}
