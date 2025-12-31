import { Request, Response, NextFunction } from 'express';
import { PlayerRegistration, Auction, Team } from '../models';
import { AuctionStatus, PlayerAuctionStatus } from '../types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

/**
 * Register as a player for an auction
 * POST /api/players/register
 */
export const registerPlayer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId, password, playerRole, basePrice, profile } = req.body;

    // Verify auction exists and get password hash
    const auction = await Auction.findById(auctionId).select('+passwordHash');

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Verify auction is upcoming
    if (auction.status !== AuctionStatus.UPCOMING) {
      throw new ValidationError('Cannot register for an auction that has already started');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, auction.passwordHash);
    if (!isPasswordValid) {
      throw new ForbiddenError('Invalid auction password');
    }

    // Validate player role
    if (!auction.sportConfig.roles.includes(playerRole)) {
      throw new ValidationError(
        `Invalid role. Allowed roles: ${auction.sportConfig.roles.join(', ')}`
      );
    }

    // Validate base price
    const validBasePrices = auction.sportConfig.basePriceTiers.map((t) => t.amount);
    if (!validBasePrices.includes(basePrice)) {
      throw new ValidationError('Invalid base price selected');
    }

    // Check if user already registered for this auction
    const existingRegistration = await PlayerRegistration.findOne({
      user: req.user?._id,
      auction: auctionId,
    });

    if (existingRegistration) {
      throw new ConflictError('You are already registered for this auction');
    }

    // Create player registration
    const playerRegistration = new PlayerRegistration({
      user: req.user?._id,
      auction: auctionId,
      playerRole,
      basePrice,
      profile: profile || {},
    });

    await playerRegistration.save();

    res.status(201).json({
      success: true,
      message: 'Player registered successfully',
      data: { registration: playerRegistration },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get players for an auction
 * GET /api/players/auction/:auctionId
 */
export const getPlayersByAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId } = req.params;
    const { status, role, page = 1, limit = 50 } = req.query;

    const query: any = { auction: auctionId };

    if (status) {
      query.status = status;
    }

    if (role) {
      query.playerRole = role;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [players, total] = await Promise.all([
      PlayerRegistration.find(query)
        .populate('user', 'name email avatar')
        .populate('soldTo', 'name shortName')
        .sort({ registrationOrder: 1 })
        .skip(skip)
        .limit(Number(limit)),
      PlayerRegistration.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        players,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get player registration by ID
 * GET /api/players/:id
 */
export const getPlayerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const player = await PlayerRegistration.findById(id)
      .populate('user', 'name email avatar')
      .populate('auction', 'name sportType status')
      .populate('soldTo', 'name shortName logo');

    if (!player) {
      throw new NotFoundError('Player registration not found');
    }

    res.json({
      success: true,
      data: { player },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's registrations
 * GET /api/players/my-registrations
 */
export const getMyRegistrations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registrations = await PlayerRegistration.find({ user: req.user?._id })
      .populate('auction', 'name sportType status scheduledStartTime')
      .populate('soldTo', 'name shortName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { registrations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update player registration
 * PUT /api/players/:id
 */
export const updatePlayerRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerRole, basePrice, profile } = req.body;

    const player = await PlayerRegistration.findById(id);

    if (!player) {
      throw new NotFoundError('Player registration not found');
    }

    // Check ownership
    if (player.user.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('You can only update your own registration');
    }

    // Get auction
    const auction = await Auction.findById(player.auction);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Cannot update if auction has started
    if (auction.status !== AuctionStatus.UPCOMING) {
      throw new ValidationError('Cannot update registration after auction has started');
    }

    // Validate role if provided
    if (playerRole && !auction.sportConfig.roles.includes(playerRole)) {
      throw new ValidationError(
        `Invalid role. Allowed roles: ${auction.sportConfig.roles.join(', ')}`
      );
    }

    // Validate base price if provided
    if (basePrice) {
      const validBasePrices = auction.sportConfig.basePriceTiers.map((t) => t.amount);
      if (!validBasePrices.includes(basePrice)) {
        throw new ValidationError('Invalid base price selected');
      }
    }

    const updatedPlayer = await PlayerRegistration.findByIdAndUpdate(
      id,
      {
        ...(playerRole && { playerRole }),
        ...(basePrice && { basePrice }),
        ...(profile && { profile: { ...player.profile, ...profile } }),
      },
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar');

    res.json({
      success: true,
      message: 'Registration updated successfully',
      data: { player: updatedPlayer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Withdraw player registration
 * DELETE /api/players/:id
 */
export const withdrawRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const player = await PlayerRegistration.findById(id);

    if (!player) {
      throw new NotFoundError('Player registration not found');
    }

    // Check ownership
    if (player.user.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('You can only withdraw your own registration');
    }

    // Get auction
    const auction = await Auction.findById(player.auction);
    if (auction?.status !== AuctionStatus.UPCOMING) {
      throw new ValidationError('Cannot withdraw after auction has started');
    }

    await PlayerRegistration.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Registration withdrawn successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get next player for auction (Admin)
 * GET /api/players/auction/:auctionId/next
 */
export const getNextPlayer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId } = req.params;

    const nextPlayer = await PlayerRegistration.findOne({
      auction: auctionId,
      status: PlayerAuctionStatus.PENDING,
    })
      .populate('user', 'name email avatar')
      .sort({ registrationOrder: 1 });

    if (!nextPlayer) {
      res.json({
        success: true,
        message: 'No more players pending',
        data: { player: null },
      });
      return;
    }

    res.json({
      success: true,
      data: { player: nextPlayer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Put player on block (Admin)
 * POST /api/players/:id/on-block
 */
export const putPlayerOnBlock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const player = await PlayerRegistration.findById(id);

    if (!player) {
      throw new NotFoundError('Player registration not found');
    }

    if (player.status !== PlayerAuctionStatus.PENDING) {
      throw new ValidationError('Player is not pending for auction');
    }

    // Get auction
    const auction = await Auction.findById(player.auction);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    if (auction.status !== AuctionStatus.LIVE) {
      throw new ValidationError('Auction must be live to put player on block');
    }

    // Update player status
    player.status = PlayerAuctionStatus.IN_AUCTION;
    await player.save();

    // Update auction's current player
    auction.currentPlayerOnBlock = player._id;
    await auction.save();

    const populatedPlayer = await PlayerRegistration.findById(id).populate(
      'user',
      'name email avatar'
    );

    res.json({
      success: true,
      message: 'Player is now on the block',
      data: { player: populatedPlayer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get player auction statistics
 * GET /api/players/auction/:auctionId/stats
 */
export const getPlayerStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId } = req.params;

    const stats = await PlayerRegistration.aggregate([
      { $match: { auction: auctionId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.PENDING] }, 1, 0] },
          },
          inAuction: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.IN_AUCTION] }, 1, 0] },
          },
          sold: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.SOLD] }, 1, 0] },
          },
          unsold: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.UNSOLD] }, 1, 0] },
          },
          totalValue: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.SOLD] }, '$soldPrice', 0] },
          },
        },
      },
    ]);

    const roleStats = await PlayerRegistration.aggregate([
      { $match: { auction: auctionId } },
      {
        $group: {
          _id: '$playerRole',
          count: { $sum: 1 },
          sold: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.SOLD] }, 1, 0] },
          },
          totalValue: {
            $sum: { $cond: [{ $eq: ['$status', PlayerAuctionStatus.SOLD] }, '$soldPrice', 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          pending: 0,
          inAuction: 0,
          sold: 0,
          unsold: 0,
          totalValue: 0,
        },
        byRole: roleStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  registerPlayer,
  getPlayersByAuction,
  getPlayerById,
  getMyRegistrations,
  updatePlayerRegistration,
  withdrawRegistration,
  getNextPlayer,
  putPlayerOnBlock,
  getPlayerStats,
};
