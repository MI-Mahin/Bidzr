import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import config from '../config';
import { IJwtPayload, UserRole, UserDocument } from '../types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as IJwtPayload;

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.',
      });
      return;
    }

    // Attach user to request
    req.user = user as UserDocument;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
      return;
    }

    next(error);
  }
};

/**
 * Optional authentication - attaches user if token exists
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as IJwtPayload;
    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = user as UserDocument;
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Team owner only middleware
 */
export const teamOwnerOnly = authorize(UserRole.TEAM_OWNER);

/**
 * Player only middleware
 */
export const playerOnly = authorize(UserRole.PLAYER);

/**
 * Team owner or Admin middleware
 */
export const teamOwnerOrAdmin = authorize(UserRole.TEAM_OWNER, UserRole.ADMIN);

export default {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  teamOwnerOnly,
  playerOnly,
  teamOwnerOrAdmin,
};
