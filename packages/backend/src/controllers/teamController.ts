import { Request, Response, NextFunction } from 'express';
import { Team, Auction, PlayerRegistration } from '../models';
import { AuctionStatus, UserRole } from '../types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

/**
 * Register a new team for an auction
 * POST /api/teams/register
 */
export const registerTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId, password, name, shortName, logo } = req.body;

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

    // Check if max teams reached
    if (auction.maxTeams) {
      const teamCount = await Team.countDocuments({ auction: auctionId, isActive: true });
      if (teamCount >= auction.maxTeams) {
        throw new ValidationError('Maximum number of teams reached for this auction');
      }
    }

    // Check if user already has a team in this auction
    const existingTeam = await Team.findOne({
      auction: auctionId,
      owner: req.user?._id,
    });

    if (existingTeam) {
      throw new ConflictError('You already have a team registered for this auction');
    }

    // Check if team name is taken
    const teamNameExists = await Team.findOne({
      auction: auctionId,
      $or: [{ name }, { shortName: shortName.toUpperCase() }],
    });

    if (teamNameExists) {
      throw new ConflictError('Team name or short name already taken');
    }

    // Create team
    const team = new Team({
      name,
      shortName: shortName.toUpperCase(),
      logo,
      auction: auctionId,
      owner: req.user?._id,
      initialBudget: auction.teamBudget,
      remainingBudget: auction.teamBudget,
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: 'Team registered successfully',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get teams for an auction
 * GET /api/teams/auction/:auctionId
 */
export const getTeamsByAuction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { auctionId } = req.params;

    const teams = await Team.find({ auction: auctionId, isActive: true })
      .populate('owner', 'name email avatar')
      .populate({
        path: 'acquiredPlayers.player',
        populate: {
          path: 'user',
          select: 'name',
        },
      })
      .sort({ name: 1 });

    res.json({
      success: true,
      data: { teams },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get team by ID
 * GET /api/teams/:id
 */
export const getTeamById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('owner', 'name email avatar')
      .populate('auction', 'name sportType status')
      .populate({
        path: 'acquiredPlayers.player',
        populate: {
          path: 'user',
          select: 'name email avatar',
        },
      });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    res.json({
      success: true,
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's teams
 * GET /api/teams/my-teams
 */
export const getMyTeams = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teams = await Team.find({ owner: req.user?._id, isActive: true })
      .populate('auction', 'name sportType status scheduledStartTime')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { teams },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update team
 * PUT /api/teams/:id
 */
export const updateTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, shortName, logo } = req.body;

    const team = await Team.findById(id);

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check ownership
    if (team.owner.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('You can only update your own team');
    }

    // Get auction status
    const auction = await Auction.findById(team.auction);
    if (auction?.status === AuctionStatus.LIVE) {
      throw new ValidationError('Cannot update team during live auction');
    }

    // Check if new name is taken
    if (name || shortName) {
      const existingTeam = await Team.findOne({
        auction: team.auction,
        _id: { $ne: id },
        $or: [
          ...(name ? [{ name }] : []),
          ...(shortName ? [{ shortName: shortName.toUpperCase() }] : []),
        ],
      });

      if (existingTeam) {
        throw new ConflictError('Team name or short name already taken');
      }
    }

    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(shortName && { shortName: shortName.toUpperCase() }),
        ...(logo !== undefined && { logo }),
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: { team: updatedTeam },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Withdraw team from auction
 * DELETE /api/teams/:id
 */
export const withdrawTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Check ownership
    if (team.owner.toString() !== req.user?._id.toString()) {
      throw new ForbiddenError('You can only withdraw your own team');
    }

    // Get auction status
    const auction = await Auction.findById(team.auction);
    if (auction?.status !== AuctionStatus.UPCOMING) {
      throw new ValidationError('Cannot withdraw team after auction has started');
    }

    // Soft delete
    team.isActive = false;
    await team.save();

    res.json({
      success: true,
      message: 'Team withdrawn from auction',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get team's acquired players with details
 * GET /api/teams/:id/players
 */
export const getTeamPlayers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const playerIds = team.acquiredPlayers.map((p) => p.player);

    const players = await PlayerRegistration.find({
      _id: { $in: playerIds },
    })
      .populate('user', 'name email avatar')
      .sort({ playerRole: 1 });

    // Merge with sold price
    const playersWithPrice = players.map((player) => {
      const acquired = team.acquiredPlayers.find(
        (p) => p.player.toString() === player._id.toString()
      );
      return {
        ...player.toJSON(),
        soldPrice: acquired?.soldPrice,
        acquiredAt: acquired?.acquiredAt,
      };
    });

    res.json({
      success: true,
      data: {
        team: {
          id: team._id,
          name: team.name,
          shortName: team.shortName,
          remainingBudget: team.remainingBudget,
        },
        players: playersWithPrice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  registerTeam,
  getTeamsByAuction,
  getTeamById,
  getMyTeams,
  updateTeam,
  withdrawTeam,
  getTeamPlayers,
};
