// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-simple';
import { logger } from '../utils/logger';

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  logger.info("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn("No valid Authorization Header found.");
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Missing or invalid Authorization header' 
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  logger.info("Extracted ID Token:", idToken);

  try {
    const decoded = await AuthService.verifyIdToken(idToken);
    (req as any).user = decoded;
    logger.info("Token Verified Successfully:", decoded);
    next();
  } catch (err: any) {
    logger.error("Token Verification Failed:", err);
    logger.error("Error Code:", err.code);
    logger.error("Error Message:", err.message);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: err.message, 
      code: err.code 
    });
  }
}
