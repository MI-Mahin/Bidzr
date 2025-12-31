import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { SportType, UserRole } from '../types';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: (err as any).path,
        message: err.msg,
      })),
    });
    return;
  }
  
  next();
};

// ============================================
// Auth Validators
// ============================================

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
  handleValidationErrors,
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// ============================================
// Auction Validators
// ============================================

export const createAuctionValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Auction name must be between 3 and 200 characters'),
  body('sportType')
    .isIn(Object.values(SportType))
    .withMessage('Invalid sport type'),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters'),
  body('bidIncrementAmount')
    .isInt({ min: 1 })
    .withMessage('Bid increment must be a positive integer'),
  body('teamBudget')
    .isInt({ min: 1 })
    .withMessage('Team budget must be a positive integer'),
  body('bidTimerSeconds')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('Bid timer must be between 10 and 120 seconds'),
  body('basePriceTiers')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one base price tier is required'),
  body('basePriceTiers.*.amount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Base price amount must be a positive integer'),
  body('basePriceTiers.*.label')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Base price tier name is required'),
  handleValidationErrors,
];

export const updateAuctionValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid auction ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Auction name must be between 3 and 200 characters'),
  body('bidTimerSeconds')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('Bid timer must be between 10 and 120 seconds'),
  handleValidationErrors,
];

export const auctionIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid auction ID'),
  handleValidationErrors,
];

// ============================================
// Team Validators
// ============================================

export const registerTeamValidation = [
  body('auctionId')
    .isMongoId()
    .withMessage('Invalid auction ID'),
  body('password')
    .notEmpty()
    .withMessage('Auction password is required'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters'),
  body('shortName')
    .trim()
    .isLength({ min: 2, max: 5 })
    .withMessage('Short name must be between 2 and 5 characters')
    .isAlpha()
    .withMessage('Short name must contain only letters'),
  handleValidationErrors,
];

// ============================================
// Player Validators
// ============================================

export const registerPlayerValidation = [
  body('auctionId')
    .isMongoId()
    .withMessage('Invalid auction ID'),
  body('password')
    .notEmpty()
    .withMessage('Auction password is required'),
  body('playerRole')
    .notEmpty()
    .withMessage('Player role is required'),
  body('basePrice')
    .isInt({ min: 0 })
    .withMessage('Base price must be a positive integer'),
  body('profile.jerseyName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Jersey name cannot exceed 50 characters'),
  body('profile.age')
    .optional()
    .isInt({ min: 16, max: 60 })
    .withMessage('Age must be between 16 and 60'),
  handleValidationErrors,
];

// ============================================
// Bid Validators
// ============================================

export const placeBidValidation = [
  body('playerId')
    .isMongoId()
    .withMessage('Invalid player ID'),
  body('amount')
    .isInt({ min: 0 })
    .withMessage('Bid amount must be a positive integer'),
  handleValidationErrors,
];

// ============================================
// Common Validators
// ============================================

export const mongoIdValidation = (fieldName: string = 'id') => [
  param(fieldName)
    .isMongoId()
    .withMessage(`Invalid ${fieldName}`),
  handleValidationErrors,
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

export default {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  createAuctionValidation,
  updateAuctionValidation,
  auctionIdValidation,
  registerTeamValidation,
  registerPlayerValidation,
  placeBidValidation,
  mongoIdValidation,
  paginationValidation,
};
