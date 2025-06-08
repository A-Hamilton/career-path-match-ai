// Authentication service
import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}

export class AuthService {
  static async verifyIdToken(idToken: string) {
    return await db.getAuth().verifyIdToken(idToken);
  }
}

class AuthMiddleware {
  /**
   * Verify Firebase ID token middleware
   */
  async verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid Authorization header' 
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decoded = await db.getAuth().verifyIdToken(idToken);
      req.user = decoded;
      next();
    } catch (err: any) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: err.message || 'Invalid token',
        code: err.code 
      });
    }
  }

  /**
   * Optional authentication middleware - continues even if no token provided
   */
  async optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decoded = await db.getAuth().verifyIdToken(idToken);
      req.user = decoded;
    } catch (err: any) {
      // Continue without user rather than failing
    }

    next();
  }
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware();

// Export individual middleware functions for convenience
export const verifyToken = authMiddleware.verifyToken.bind(authMiddleware);
export const optionalAuth = authMiddleware.optionalAuth.bind(authMiddleware);
