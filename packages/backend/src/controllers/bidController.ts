import { Request, Response, NextFunction } from 'express';
import { Bid, Team, PlayerRegistration, Auction } from '../models';
import { BidStatus, AuctionStatus, PlayerAuctionStatus } from '../types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../middleware/errorHandler';

/**
 * Place a bid (REST API - for backup/validation)
 * POST /api/bids
 */
export const placeBid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId, playerId, amount } = req.body;

    // Get auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    if (auction.status !== AuctionStatus.LIVE) {
      throw new ValidationError('Auction is not live');
    }

    // Get player
    const player = await PlayerRegistration.findById(playerId);
    if (!player) {
      throw new NotFoundError('Player not found');
    }

    if (player.status !== PlayerAuctionStatus.IN_AUCTION) {
      throw new ValidationError('Player is not currently on the block');
    }

    // Get team
    const team = await Team.findOne({
      auction: auctionId,
      owner: req.user?._id,
      isActive: true,
    });

    if (!team) {
      throw new NotFoundError('You do not have a team in this auction');
    }

    // Validate bid amount
    const currentHighestBid = await Bid.findOne({
      player: playerId,
      status: BidStatus.ACTIVE,
    }).sort({ amount: -1 });

    const minimumBid = currentHighestBid
      ? currentHighestBid.amount + auction.bidIncrementAmount
      : player.basePrice;

    if (amount < minimumBid) {
      throw new ValidationError(`Minimum bid is ${minimumBid}`);
    }

    // Check if team can afford
    if (team.remainingBudget < amount) {
      throw new ValidationError('Insufficient budget');
    }

    // Create bid
    const bid = new Bid({
      auction: auctionId,
      player: playerId,
      team: team._id,
      bidder: req.user?._id,
      amount,
      status: BidStatus.ACTIVE,
      timestamp: new Date(),
    });

    await bid.save();

    // Mark other bids as outbid
    await Bid.updateMany(
      {
        player: playerId,
        _id: { $ne: bid._id },
        status: BidStatus.ACTIVE,
      },
      { status: BidStatus.OUTBID }
    );

    const populatedBid = await Bid.findById(bid._id)
      .populate('team', 'name shortName')
      .populate('bidder', 'name');

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: { bid: populatedBid },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bid history for a player
 * GET /api/bids/player/:playerId
 */
export const getPlayerBids = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { playerId } = req.params;

    const bids = await Bid.find({ player: playerId })
      .populate('team', 'name shortName')
      .populate('bidder', 'name')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: { bids },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current highest bid for a player
 * GET /api/bids/player/:playerId/current
 */
export const getCurrentBid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { playerId } = req.params;

    const bid = await Bid.findOne({
      player: playerId,
      status: { $in: [BidStatus.ACTIVE, BidStatus.WON] },
    })
      .populate('team', 'name shortName')
      .populate('bidder', 'name')
      .sort({ amount: -1 });

    res.json({
      success: true,
      data: { bid },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bids in an auction
 * GET /api/bids/auction/:auctionId
 */
export const getAuctionBids = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [bids, total] = await Promise.all([
      Bid.find({ auction: auctionId })
        .populate('team', 'name shortName')
        .populate('bidder', 'name')
        .populate({
          path: 'player',
          populate: {
            path: 'user',
            select: 'name',
          },
        })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Bid.countDocuments({ auction: auctionId }),
    ]);

    res.json({
      success: true,
      data: {
        bids,
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
 * Get team's bid history
 * GET /api/bids/team/:teamId
 */
export const getTeamBids = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { teamId } = req.params;

    const bids = await Bid.find({ team: teamId })
      .populate({
        path: 'player',
        populate: {
          path: 'user',
          select: 'name',
        },
      })
      .sort({ timestamp: -1 });

    // Group by status
    const summary = {
      won: bids.filter((b) => b.status === BidStatus.WON).length,
      outbid: bids.filter((b) => b.status === BidStatus.OUTBID).length,
      active: bids.filter((b) => b.status === BidStatus.ACTIVE).length,
      totalBids: bids.length,
    };

    res.json({
      success: true,
      data: { bids, summary },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bid statistics for an auction
 * GET /api/bids/auction/:auctionId/stats
 */
export const getAuctionBidStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId } = req.params;

    const stats = await Bid.aggregate([
      { $match: { auction: auctionId } },
      {
        $group: {
          _id: null,
          totalBids: { $sum: 1 },
          uniquePlayers: { $addToSet: '$player' },
          uniqueTeams: { $addToSet: '$team' },
          maxBid: { $max: '$amount' },
          avgBid: { $avg: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          totalBids: 1,
          uniquePlayers: { $size: '$uniquePlayers' },
          uniqueTeams: { $size: '$uniqueTeams' },
          maxBid: 1,
          avgBid: { $round: ['$avgBid', 0] },
        },
      },
    ]);

    // Get bidding activity by team
    const teamActivity = await Bid.aggregate([
      { $match: { auction: auctionId } },
      {
        $group: {
          _id: '$team',
          bidCount: { $sum: 1 },
          wonCount: {
            $sum: { $cond: [{ $eq: ['$status', BidStatus.WON] }, 1, 0] },
          },
          totalSpent: {
            $sum: { $cond: [{ $eq: ['$status', BidStatus.WON] }, '$amount', 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'team',
        },
      },
      { $unwind: '$team' },
      {
        $project: {
          teamName: '$team.name',
          teamShortName: '$team.shortName',
          bidCount: 1,
          wonCount: 1,
          totalSpent: 1,
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalBids: 0,
          uniquePlayers: 0,
          uniqueTeams: 0,
          maxBid: 0,
          avgBid: 0,
        },
        teamActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  placeBid,
  getPlayerBids,
  getCurrentBid,
  getAuctionBids,
  getTeamBids,
  getAuctionBidStats,
};
