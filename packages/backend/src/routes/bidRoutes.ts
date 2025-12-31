import { Router } from 'express';
import { bidController } from '../controllers';
import { authenticate, teamOwnerOnly } from '../middleware/auth';
import { placeBidValidation, mongoIdValidation, paginationValidation } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/bids
 * @desc    Place a bid (REST fallback)
 * @access  Private (Team Owner)
 */
router.post(
  '/',
  authenticate,
  teamOwnerOnly,
  placeBidValidation,
  bidController.placeBid
);

/**
 * @route   GET /api/bids/player/:playerId
 * @desc    Get bid history for a player
 * @access  Private
 */
router.get(
  '/player/:playerId',
  authenticate,
  mongoIdValidation('playerId'),
  bidController.getPlayerBids
);

/**
 * @route   GET /api/bids/player/:playerId/current
 * @desc    Get current highest bid for a player
 * @access  Private
 */
router.get(
  '/player/:playerId/current',
  authenticate,
  mongoIdValidation('playerId'),
  bidController.getCurrentBid
);

/**
 * @route   GET /api/bids/auction/:auctionId
 * @desc    Get all bids in an auction
 * @access  Private
 */
router.get(
  '/auction/:auctionId',
  authenticate,
  mongoIdValidation('auctionId'),
  paginationValidation,
  bidController.getAuctionBids
);

/**
 * @route   GET /api/bids/auction/:auctionId/stats
 * @desc    Get bid statistics for an auction
 * @access  Private
 */
router.get(
  '/auction/:auctionId/stats',
  authenticate,
  mongoIdValidation('auctionId'),
  bidController.getAuctionBidStats
);

/**
 * @route   GET /api/bids/team/:teamId
 * @desc    Get team's bid history
 * @access  Private
 */
router.get(
  '/team/:teamId',
  authenticate,
  mongoIdValidation('teamId'),
  bidController.getTeamBids
);

export default router;
