import { Router } from 'express';
import { auctionController } from '../controllers';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  createAuctionValidation,
  updateAuctionValidation,
  auctionIdValidation,
  paginationValidation,
} from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/auctions
 * @desc    Create a new auction
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  createAuctionValidation,
  auctionController.createAuction
);

/**
 * @route   GET /api/auctions
 * @desc    Get all auctions
 * @access  Public
 */
router.get('/', paginationValidation, auctionController.getAuctions);

/**
 * @route   GET /api/auctions/:id
 * @desc    Get auction by ID
 * @access  Public
 */
router.get('/:id', auctionIdValidation, auctionController.getAuctionById);

/**
 * @route   PUT /api/auctions/:id
 * @desc    Update auction
 * @access  Private (Admin/Owner)
 */
router.put(
  '/:id',
  authenticate,
  adminOnly,
  updateAuctionValidation,
  auctionController.updateAuction
);

/**
 * @route   DELETE /api/auctions/:id
 * @desc    Delete auction
 * @access  Private (Admin/Owner)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  auctionIdValidation,
  auctionController.deleteAuction
);

/**
 * @route   POST /api/auctions/:id/verify
 * @desc    Verify auction password
 * @access  Private
 */
router.post('/:id/verify', authenticate, auctionController.verifyAuctionPassword);

/**
 * @route   POST /api/auctions/:id/start
 * @desc    Start auction
 * @access  Private (Admin/Owner)
 */
router.post(
  '/:id/start',
  authenticate,
  adminOnly,
  auctionIdValidation,
  auctionController.startAuction
);

/**
 * @route   POST /api/auctions/:id/pause
 * @desc    Pause auction
 * @access  Private (Admin/Owner)
 */
router.post(
  '/:id/pause',
  authenticate,
  adminOnly,
  auctionIdValidation,
  auctionController.pauseAuction
);

/**
 * @route   POST /api/auctions/:id/end
 * @desc    End auction
 * @access  Private (Admin/Owner)
 */
router.post(
  '/:id/end',
  authenticate,
  adminOnly,
  auctionIdValidation,
  auctionController.endAuction
);

/**
 * @route   GET /api/auctions/:id/results
 * @desc    Get auction results
 * @access  Public
 */
router.get('/:id/results', auctionIdValidation, auctionController.getAuctionResults);

export default router;
