import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User, Auction, Team, PlayerRegistration, Bid } from '../models';
import { AuctionStatus, PlayerAuctionStatus, BidStatus, IJwtPayload, UserRole } from '../types';
import AuctionTimerManager from './timerManager';

// Socket event constants
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_AUCTION: 'join_auction',
  LEAVE_AUCTION: 'leave_auction',
  PLACE_BID: 'place_bid',
  ADMIN_PUT_ON_BLOCK: 'admin_put_on_block',
  ADMIN_END_PLAYER_BIDDING: 'admin_end_player_bidding',
  ADMIN_START_AUCTION: 'admin_start_auction',
  ADMIN_PAUSE_AUCTION: 'admin_pause_auction',

  // Server -> Client
  AUCTION_STATE: 'auction_state',
  PLAYER_ON_BLOCK: 'player_on_block',
  BID_UPDATE: 'bid_update',
  TIMER_UPDATE: 'timer_update',
  PLAYER_SOLD: 'player_sold',
  PLAYER_UNSOLD: 'player_unsold',
  AUCTION_STARTED: 'auction_started',
  AUCTION_PAUSED: 'auction_paused',
  AUCTION_ENDED: 'auction_ended',
  ERROR: 'error',
  TEAM_UPDATE: 'team_update',
};

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  userName?: string;
  teamId?: string;
  auctionId?: string;
}

class AuctionSocketManager {
  private io: SocketIOServer;
  private timerManager: AuctionTimerManager;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.clientUrl,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.timerManager = new AuctionTimerManager(this.io);
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as IJwtPayload;
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
          return next(new Error('Invalid user'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role as UserRole;
        socket.userName = user.name;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userName} (${socket.userRole})`);

      // Join auction room
      socket.on(SOCKET_EVENTS.JOIN_AUCTION, async (data) => {
        await this.handleJoinAuction(socket, data);
      });

      // Leave auction room
      socket.on(SOCKET_EVENTS.LEAVE_AUCTION, () => {
        this.handleLeaveAuction(socket);
      });

      // Place bid
      socket.on(SOCKET_EVENTS.PLACE_BID, async (data) => {
        await this.handlePlaceBid(socket, data);
      });

      // Admin: Put player on block
      socket.on(SOCKET_EVENTS.ADMIN_PUT_ON_BLOCK, async (data) => {
        await this.handlePutOnBlock(socket, data);
      });

      // Admin: End player bidding
      socket.on(SOCKET_EVENTS.ADMIN_END_PLAYER_BIDDING, async (data) => {
        await this.handleEndPlayerBidding(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userName}`);
        this.handleLeaveAuction(socket);
      });
    });
  }

  private async handleJoinAuction(
    socket: AuthenticatedSocket,
    data: { auctionId: string; password: string }
  ): Promise<void> {
    try {
      const { auctionId, password } = data;

      // Verify auction exists
      const auction = await Auction.findById(auctionId).select('+passwordHash');
      if (!auction) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Auction not found' });
        return;
      }

      // Verify password
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, auction.passwordHash);
      if (!isPasswordValid) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid auction password' });
        return;
      }

      // If team owner, find their team
      if (socket.userRole === UserRole.TEAM_OWNER) {
        const team = await Team.findOne({
          auction: auctionId,
          owner: socket.userId,
          isActive: true,
        });
        if (team) {
          socket.teamId = team._id.toString();
        }
      }

      // Join auction room
      socket.auctionId = auctionId;
      socket.join(`auction:${auctionId}`);

      // Send current auction state
      const state = await this.getAuctionState(auctionId);
      socket.emit(SOCKET_EVENTS.AUCTION_STATE, state);

      console.log(`${socket.userName} joined auction: ${auction.name}`);
    } catch (error) {
      console.error('Error joining auction:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join auction' });
    }
  }

  private handleLeaveAuction(socket: AuthenticatedSocket): void {
    if (socket.auctionId) {
      socket.leave(`auction:${socket.auctionId}`);
      socket.auctionId = undefined;
      socket.teamId = undefined;
    }
  }

  private async handlePlaceBid(
    socket: AuthenticatedSocket,
    data: { playerId: string; amount: number }
  ): Promise<void> {
    try {
      const { playerId, amount } = data;

      if (socket.userRole !== UserRole.TEAM_OWNER) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only team owners can bid' });
        return;
      }

      if (!socket.teamId || !socket.auctionId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not in an auction room' });
        return;
      }

      // Get auction
      const auction = await Auction.findById(socket.auctionId);
      if (!auction || auction.status !== AuctionStatus.LIVE) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Auction is not live' });
        return;
      }

      // Get player
      const player = await PlayerRegistration.findById(playerId).populate('user', 'name');
      if (!player || player.status !== PlayerAuctionStatus.IN_AUCTION) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Player is not on the block' });
        return;
      }

      // Get team
      const team = await Team.findById(socket.teamId);
      if (!team) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Team not found' });
        return;
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
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: `Minimum bid is ${minimumBid}`,
        });
        return;
      }

      // Check budget
      if (team.remainingBudget < amount) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Insufficient budget' });
        return;
      }

      // Create bid
      const bid = new Bid({
        auction: socket.auctionId,
        player: playerId,
        team: socket.teamId,
        bidder: socket.userId,
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

      // Reset timer
      this.timerManager.resetTimer(socket.auctionId, playerId);

      // Broadcast bid update
      this.io.to(`auction:${socket.auctionId}`).emit(SOCKET_EVENTS.BID_UPDATE, {
        auctionId: socket.auctionId,
        playerId,
        currentBid: amount,
        teamId: socket.teamId,
        teamName: team.name,
        teamShortName: team.shortName,
        bidderName: socket.userName,
        timestamp: new Date(),
        timeRemaining: auction.bidTimerSeconds,
      });

      console.log(`Bid placed: ${team.name} - ₹${amount} for ${(player.user as any).name}`);
    } catch (error) {
      console.error('Error placing bid:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to place bid' });
    }
  }

  private async handlePutOnBlock(
    socket: AuthenticatedSocket,
    data: { playerId: string }
  ): Promise<void> {
    try {
      if (socket.userRole !== UserRole.ADMIN) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Admin only action' });
        return;
      }

      const { playerId } = data;

      const player = await PlayerRegistration.findById(playerId).populate('user', 'name avatar');
      if (!player) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Player not found' });
        return;
      }

      const auction = await Auction.findById(player.auction);
      if (!auction || auction.status !== AuctionStatus.LIVE) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Auction is not live' });
        return;
      }

      // Update player status
      player.status = PlayerAuctionStatus.IN_AUCTION;
      await player.save();

      // Update auction's current player
      auction.currentPlayerOnBlock = player._id;
      await auction.save();

      const auctionId = auction._id.toString();

      // Start timer
      this.timerManager.startTimer(
        auctionId,
        playerId,
        auction.bidTimerSeconds,
        () => this.handleTimerExpired(auctionId, playerId)
      );

      // Broadcast player on block
      this.io.to(`auction:${auctionId}`).emit(SOCKET_EVENTS.PLAYER_ON_BLOCK, {
        player: {
          id: player._id,
          name: (player.user as any).name,
          avatar: (player.user as any).avatar,
          role: player.playerRole,
          basePrice: player.basePrice,
          profile: player.profile,
        },
        timeRemaining: auction.bidTimerSeconds,
      });

      console.log(`Player on block: ${(player.user as any).name}`);
    } catch (error) {
      console.error('Error putting player on block:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to put player on block' });
    }
  }

  private async handleEndPlayerBidding(
    socket: AuthenticatedSocket,
    data: { playerId: string }
  ): Promise<void> {
    try {
      if (socket.userRole !== UserRole.ADMIN) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Admin only action' });
        return;
      }

      const { playerId } = data;

      if (socket.auctionId) {
        this.timerManager.stopTimer(socket.auctionId);
        await this.finalizePlayerBidding(socket.auctionId, playerId);
      }
    } catch (error) {
      console.error('Error ending player bidding:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to end bidding' });
    }
  }

  private async handleTimerExpired(auctionId: string, playerId: string): Promise<void> {
    await this.finalizePlayerBidding(auctionId, playerId);
  }

  private async finalizePlayerBidding(auctionId: string, playerId: string): Promise<void> {
    try {
      const player = await PlayerRegistration.findById(playerId).populate('user', 'name');
      if (!player) return;

      // Get highest bid
      const highestBid = await Bid.findOne({
        player: playerId,
        status: BidStatus.ACTIVE,
      })
        .sort({ amount: -1 })
        .populate('team', 'name shortName');

      if (highestBid) {
        // Player sold
        highestBid.status = BidStatus.WON;
        await highestBid.save();

        player.status = PlayerAuctionStatus.SOLD;
        player.soldPrice = highestBid.amount;
        player.soldTo = highestBid.team._id;
        await player.save();

        // Update team
        const team = await Team.findById(highestBid.team._id);
        if (team) {
          team.remainingBudget -= highestBid.amount;
          team.acquiredPlayers.push({
            player: player._id,
            soldPrice: highestBid.amount,
            acquiredAt: new Date(),
          });
          await team.save();

          // Broadcast team update
          this.io.to(`auction:${auctionId}`).emit(SOCKET_EVENTS.TEAM_UPDATE, {
            teamId: team._id,
            remainingBudget: team.remainingBudget,
            playerCount: team.acquiredPlayers.length,
          });
        }

        // Broadcast player sold
        this.io.to(`auction:${auctionId}`).emit(SOCKET_EVENTS.PLAYER_SOLD, {
          auctionId,
          playerId,
          playerName: (player.user as any).name,
          teamId: (highestBid.team as any)._id,
          teamName: (highestBid.team as any).name,
          soldPrice: highestBid.amount,
        });

        console.log(`Player SOLD: ${(player.user as any).name} to ${(highestBid.team as any).name} for ₹${highestBid.amount}`);
      } else {
        // Player unsold
        player.status = PlayerAuctionStatus.UNSOLD;
        await player.save();

        this.io.to(`auction:${auctionId}`).emit(SOCKET_EVENTS.PLAYER_UNSOLD, {
          auctionId,
          playerId,
          playerName: (player.user as any).name,
        });

        console.log(`Player UNSOLD: ${(player.user as any).name}`);
      }

      // Clear current player from auction
      await Auction.findByIdAndUpdate(auctionId, {
        currentPlayerOnBlock: null,
      });
    } catch (error) {
      console.error('Error finalizing player bidding:', error);
    }
  }

  private async getAuctionState(auctionId: string): Promise<any> {
    const auction = await Auction.findById(auctionId).populate('createdBy', 'name');
    if (!auction) return null;

    const teams = await Team.find({ auction: auctionId, isActive: true }).select(
      'name shortName remainingBudget acquiredPlayers'
    );

    let currentPlayer = null;
    if (auction.currentPlayerOnBlock) {
      const player = await PlayerRegistration.findById(auction.currentPlayerOnBlock).populate(
        'user',
        'name avatar'
      );

      if (player) {
        const currentBid = await Bid.findOne({
          player: player._id,
          status: BidStatus.ACTIVE,
        })
          .sort({ amount: -1 })
          .populate('team', 'name shortName');

        currentPlayer = {
          id: player._id,
          name: (player.user as any).name,
          avatar: (player.user as any).avatar,
          role: player.playerRole,
          basePrice: player.basePrice,
          currentBid: currentBid?.amount || player.basePrice,
          currentTeam: currentBid ? (currentBid.team as any).name : null,
          timeRemaining: this.timerManager.getTimeRemaining(auctionId),
        };
      }
    }

    const playerStats = await PlayerRegistration.aggregate([
      { $match: { auction: auction._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = { pending: 0, sold: 0, unsold: 0 };
    playerStats.forEach((s: any) => {
      if (s._id === PlayerAuctionStatus.PENDING) stats.pending = s.count;
      if (s._id === PlayerAuctionStatus.SOLD) stats.sold = s.count;
      if (s._id === PlayerAuctionStatus.UNSOLD) stats.unsold = s.count;
    });

    return {
      auction: {
        id: auction._id,
        name: auction.name,
        sportType: auction.sportType,
        status: auction.status,
        bidIncrementAmount: auction.bidIncrementAmount,
        bidTimerSeconds: auction.bidTimerSeconds,
      },
      currentPlayer,
      teams: teams.map((t) => ({
        id: t._id,
        name: t.name,
        shortName: t.shortName,
        remainingBudget: t.remainingBudget,
        playerCount: t.acquiredPlayers.length,
      })),
      stats,
    };
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default AuctionSocketManager;
