import { Request, Response, NextFunction } from 'express';
import { Auction, Team, PlayerRegistration, SPORT_CONFIGS, DEFAULT_CRICKET_BASE_PRICES } from '../models';
import {
  AuctionStatus,
  SportType,
  UserRole,
  PlayerAuctionStatus,
} from '../types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

/**
 * Create a new auction
 * POST /api/auctions
 */
export const createAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      sportType = SportType.CRICKET,
      password,
      bidIncrementAmount,
      teamBudget,
      bidTimerSeconds = 30,
      basePriceTiers,
      roles,
      maxTeams,
      maxPlayersPerTeam,
      scheduledStartTime,
    } = req.body;

    // Build sport config
    const defaultConfig = SPORT_CONFIGS[sportType as SportType];
    const sportConfig = {
      sportType,
      roles: roles || defaultConfig.roles,
      basePriceTiers: basePriceTiers || DEFAULT_CRICKET_BASE_PRICES,
    };

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create auction
    const auction = new Auction({
      name,
      description,
      sportType,
      sportConfig,
      password,
      passwordHash,
      bidIncrementAmount,
      teamBudget,
      bidTimerSeconds,
      maxTeams,
      maxPlayersPerTeam,
      scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : undefined,
      createdBy: req.user?._id,
    });

    await auction.save();

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all auctions
 * GET /api/auctions
 */
export const getAuctions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, sportType, page = 1, limit = 10 } = req.query;

    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (sportType) {
      query.sportType = sportType;
    }

    // If not admin, only show non-ended auctions
    if (req.user?.role !== UserRole.ADMIN) {
      query.status = { $ne: AuctionStatus.ENDED };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('createdBy', 'name email')
        .sort({ scheduledStartTime: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Auction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        auctions,
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
 * Get auction by ID
 * GET /api/auctions/:id
 */
export const getAuctionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id)
      .populate('createdBy', 'name email')
      .populate('currentPlayerOnBlock');

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Get additional stats
    const [teams, playerStats] = await Promise.all([
      Team.find({ auction: id, isActive: true }).select('name shortName remainingBudget'),
      PlayerRegistration.aggregate([
        { $match: { auction: auction._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = {
      totalTeams: teams.length,
      players: {
        total: 0,
        pending: 0,
        sold: 0,
        unsold: 0,
      },
    };

    playerStats.forEach((stat: any) => {
      stats.players.total += stat.count;
      if (stat._id === PlayerAuctionStatus.PENDING) stats.players.pending = stat.count;
      if (stat._id === PlayerAuctionStatus.SOLD) stats.players.sold = stat.count;
      if (stat._id === PlayerAuctionStatus.UNSOLD) stats.players.unsold = stat.count;
    });

    res.json({
      success: true,
      data: {
        auction,
        teams,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update auction
 * PUT /api/auctions/:id
 */
export const updateAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const auction = await Auction.findById(id);

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Check ownership
    if (auction.createdBy.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('You can only update your own auctions');
    }

    // Cannot update if auction is live
    if (auction.status === AuctionStatus.LIVE) {
      throw new ValidationError('Cannot update a live auction');
    }

    // Prevent updating certain fields after auction starts
    const restrictedFields = ['sportType', 'password', 'teamBudget'];
    if (auction.status !== AuctionStatus.UPCOMING) {
      restrictedFields.forEach((field) => delete updates[field]);
    }

    const updatedAuction = await Auction.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Auction updated successfully',
      data: { auction: updatedAuction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete auction
 * DELETE /api/auctions/:id
 */
export const deleteAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Check ownership
    if (auction.createdBy.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('You can only delete your own auctions');
    }

    // Cannot delete if auction has started
    if (auction.status !== AuctionStatus.UPCOMING) {
      throw new ValidationError('Cannot delete an auction that has started');
    }

    await Auction.findByIdAndDelete(id);

    // Clean up related data
    await Promise.all([
      Team.deleteMany({ auction: id }),
      PlayerRegistration.deleteMany({ auction: id }),
    ]);

    res.json({
      success: true,
      message: 'Auction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify auction password
 * POST /api/auctions/:id/verify
 */
export const verifyAuctionPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const auction = await Auction.findById(id).select('+passwordHash');

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    const isMatch = await bcrypt.compare(password, auction.passwordHash);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid auction password',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Password verified',
      data: {
        auctionId: auction._id,
        name: auction.name,
        sportType: auction.sportType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start auction
 * POST /api/auctions/:id/start
 */
export const startAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Check ownership
    if (auction.createdBy.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('Only the auction creator can start the auction');
    }

    if (auction.status !== AuctionStatus.UPCOMING && auction.status !== AuctionStatus.PAUSED) {
      throw new ValidationError('Auction cannot be started from current state');
    }

    // Check if there are enough teams and players
    const [teamCount, playerCount] = await Promise.all([
      Team.countDocuments({ auction: id, isActive: true }),
      PlayerRegistration.countDocuments({ auction: id, status: PlayerAuctionStatus.PENDING }),
    ]);

    if (teamCount < 2) {
      throw new ValidationError('At least 2 teams are required to start the auction');
    }

    if (playerCount < 1) {
      throw new ValidationError('At least 1 player is required to start the auction');
    }

    auction.status = AuctionStatus.LIVE;
    if (!auction.actualStartTime) {
      auction.actualStartTime = new Date();
    }
    await auction.save();

    res.json({
      success: true,
      message: 'Auction started',
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pause auction
 * POST /api/auctions/:id/pause
 */
export const pauseAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Check ownership
    if (auction.createdBy.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('Only the auction creator can pause the auction');
    }

    if (auction.status !== AuctionStatus.LIVE) {
      throw new ValidationError('Only live auctions can be paused');
    }

    auction.status = AuctionStatus.PAUSED;
    await auction.save();

    res.json({
      success: true,
      message: 'Auction paused',
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * End auction
 * POST /api/auctions/:id/end
 */
export const endAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Check ownership
    if (auction.createdBy.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('Only the auction creator can end the auction');
    }

    if (auction.status === AuctionStatus.ENDED) {
      throw new ValidationError('Auction has already ended');
    }

    auction.status = AuctionStatus.ENDED;
    auction.endTime = new Date();
    auction.currentPlayerOnBlock = undefined;
    await auction.save();

    res.json({
      success: true,
      message: 'Auction ended',
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get auction results/summary
 * GET /api/auctions/:id/results
 */
export const getAuctionResults = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id).populate('createdBy', 'name');

    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Get teams with their players
    const teams = await Team.find({ auction: id })
      .populate('owner', 'name email')
      .populate({
        path: 'acquiredPlayers.player',
        populate: {
          path: 'user',
          select: 'name email',
        },
      });

    // Get unsold players
    const unsoldPlayers = await PlayerRegistration.find({
      auction: id,
      status: PlayerAuctionStatus.UNSOLD,
    }).populate('user', 'name email');

    // Calculate stats
    const soldPlayers = await PlayerRegistration.find({
      auction: id,
      status: PlayerAuctionStatus.SOLD,
    });

    const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const highestSale = Math.max(...soldPlayers.map((p) => p.soldPrice || 0), 0);

    res.json({
      success: true,
      data: {
        auction,
        teams,
        unsoldPlayers,
        stats: {
          totalPlayersSold: soldPlayers.length,
          totalPlayersUnsold: unsoldPlayers.length,
          totalSpent,
          highestSale,
          averagePrice: soldPlayers.length > 0 ? Math.round(totalSpent / soldPlayers.length) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createAuction,
  getAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
  verifyAuctionPassword,
  startAuction,
  pauseAuction,
  endAuction,
  getAuctionResults,
};
