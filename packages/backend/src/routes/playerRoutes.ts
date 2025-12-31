import { Router } from 'express';
import { playerController } from '../controllers';
import { authenticate, adminOnly, playerOnly } from '../middleware/auth';
import {
  registerPlayerValidation,
  mongoIdValidation,
  paginationValidation,
} from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/players/register
 * @desc    Register as a player for an auction
 * @access  Private (Player)
 */
router.post(
  '/register',
  authenticate,
  playerOnly,
  registerPlayerValidation,
  playerController.registerPlayer
);

/**
 * @route   GET /api/players/my-registrations
 * @desc    Get current user's registrations
 * @access  Private (Player)
 */
router.get(
  '/my-registrations',
  authenticate,
  playerOnly,
  playerController.getMyRegistrations
);

/**
 * @route   GET /api/players/auction/:auctionId
 * @desc    Get players for an auction
 * @access  Private
 */
router.get(
  '/auction/:auctionId',
  authenticate,
  mongoIdValidation('auctionId'),
  paginationValidation,
  playerController.getPlayersByAuction
);

/**
 * @route   GET /api/players/auction/:auctionId/next
 * @desc    Get next player for auction
 * @access  Private (Admin)
 */
router.get(
  '/auction/:auctionId/next',
  authenticate,
  adminOnly,
  mongoIdValidation('auctionId'),
  playerController.getNextPlayer
);

/**
 * @route   GET /api/players/auction/:auctionId/stats
 * @desc    Get player statistics for an auction
 * @access  Private
 */
router.get(
  '/auction/:auctionId/stats',
  authenticate,
  mongoIdValidation('auctionId'),
  playerController.getPlayerStats
);

/**
 * @route   GET /api/players/:id
 * @desc    Get player registration by ID
 * @access  Private
 */
router.get('/:id', authenticate, mongoIdValidation(), playerController.getPlayerById);

/**
 * @route   PUT /api/players/:id
 * @desc    Update player registration
 * @access  Private (Player/Owner)
 */
router.put(
  '/:id',
  authenticate,
  mongoIdValidation(),
  playerController.updatePlayerRegistration
);

/**
 * @route   DELETE /api/players/:id
 * @desc    Withdraw player registration
 * @access  Private (Player/Owner)
 */
router.delete(
  '/:id',
  authenticate,
  mongoIdValidation(),
  playerController.withdrawRegistration
);

/**
 * @route   POST /api/players/:id/on-block
 * @desc    Put player on the block
 * @access  Private (Admin)
 */
router.post(
  '/:id/on-block',
  authenticate,
  adminOnly,
  mongoIdValidation(),
  playerController.putPlayerOnBlock
);

export default router;
