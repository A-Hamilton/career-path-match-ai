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
    console.log("Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No valid Authorization Header found.");
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid Authorization header' 
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    console.log("Extracted ID Token:", idToken ? "Present" : "Missing");    try {
      const decoded = await db.getAuth().verifyIdToken(idToken);
      req.user = decoded;
      console.log("Token Verified Successfully for user:", decoded.uid);
      next();
    } catch (err: any) {
      console.error("Token Verification Failed:", err.code || err.message);
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
      // No auth provided, continue without user
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];    try {
      const decoded = await db.getAuth().verifyIdToken(idToken);
      req.user = decoded;
      console.log("Optional auth verified for user:", decoded.uid);
    } catch (err: any) {
      console.warn("Optional auth failed:", err.code || err.message);
      // Continue without user rather than failing
    }

    next();
  }

  /**
   * Role-based access control middleware
   */
  requireRole(allowedRoles: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Authentication required' 
        });
        return;
      }      try {
        // Get user's custom claims to check roles
        const userRecord = await db.getAuth().getUser(req.user.uid);
        const customClaims = userRecord.customClaims || {};
        const userRole = customClaims.role as string;

        if (!userRole || !allowedRoles.includes(userRole)) {
          res.status(403).json({ 
            error: 'Forbidden', 
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
          });
          return;
        }

        console.log(`Role check passed for user ${req.user.uid} with role ${userRole}`);
        next();
      } catch (err: any) {
        console.error("Role verification failed:", err);
        res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Failed to verify user role' 
        });
      }
    };
  }

  /**
   * Rate limiting by user ID
   */
  createUserRateLimit(requestsPerWindow: number = 100, windowMs: number = 15 * 60 * 1000) {
    const userRequests = new Map<string, { count: number; resetTime: number }>();

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Authentication required for rate limiting' 
        });
        return;
      }

      const userId = req.user.uid;
      const now = Date.now();
      const userLimit = userRequests.get(userId);

      if (!userLimit || now > userLimit.resetTime) {
        // Reset or initialize user limit
        userRequests.set(userId, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
        return;
      }

      if (userLimit.count >= requestsPerWindow) {
        const resetIn = Math.ceil((userLimit.resetTime - now) / 1000);
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn
        });
        return;
      }

      // Increment counter
      userLimit.count++;
      userRequests.set(userId, userLimit);
      next();
    };
  }

  /**
   * Validate user owns resource middleware
   */
  validateResourceOwnership(resourceIdParam: string = 'id', resourceCollection: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Authentication required' 
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        res.status(400).json({ 
          error: 'Bad Request', 
          message: `Missing ${resourceIdParam} parameter` 
        });
        return;
      }      try {
        const doc = await db.getFirestore().collection(resourceCollection).doc(resourceId).get();
        
        if (!doc.exists) {
          res.status(404).json({ 
            error: 'Not Found', 
            message: 'Resource not found' 
          });
          return;
        }

        const data = doc.data();
        if (data?.userId !== req.user.uid) {
          res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Access denied. You do not own this resource.' 
          });
          return;
        }

        // Attach resource data to request for use in handler
        (req as any).resource = { id: doc.id, ...data };
        next();

      } catch (err: any) {
        console.error("Resource ownership validation failed:", err);
        res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Failed to validate resource ownership' 
        });
      }
    };
  }

  /**
   * Extract user ID from token without full verification (for public endpoints)
   */
  async extractUserInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];    try {
      // Decode without verification for basic user info
      const decoded = await db.getAuth().verifyIdToken(idToken, false);
      req.user = { uid: decoded.uid, email: decoded.email };
    } catch (err) {
      // Ignore errors in extraction mode
      console.debug("User info extraction failed:", err);
    }

    next();
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimits(): void {
    // This would be called periodically to clean up the rate limit maps
    // Implementation depends on the specific rate limiting strategy used
    console.log("Rate limit cleanup executed");
  }
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware();

// Export individual middleware functions for convenience
export const verifyToken = authMiddleware.verifyToken.bind(authMiddleware);
export const optionalAuth = authMiddleware.optionalAuth.bind(authMiddleware);
export const requireRole = authMiddleware.requireRole.bind(authMiddleware);
export const createUserRateLimit = authMiddleware.createUserRateLimit.bind(authMiddleware);
export const validateResourceOwnership = authMiddleware.validateResourceOwnership.bind(authMiddleware);
export const extractUserInfo = authMiddleware.extractUserInfo.bind(authMiddleware);
