import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// Socket event constants (matching backend)
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
} as const;

class SocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;

  /**
   * Initialize socket connection with auth token
   */
  connect(token: string): Socket {
    if (this.socket?.connected && this.token === token) {
      return this.socket;
    }

    // Disconnect existing socket if any
    this.disconnect();

    this.token = token;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Join an auction room
   */
  joinAuction(auctionId: string, password: string): void {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.JOIN_AUCTION, { auctionId, password });
    }
  }

  /**
   * Leave current auction room
   */
  leaveAuction(): void {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.LEAVE_AUCTION);
    }
  }

  /**
   * Place a bid
   */
  placeBid(playerId: string, amount: number): void {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.PLACE_BID, { playerId, amount });
    }
  }

  /**
   * Admin: Put player on block
   */
  putPlayerOnBlock(playerId: string): void {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.ADMIN_PUT_ON_BLOCK, { playerId });
    }
  }

  /**
   * Admin: End player bidding
   */
  endPlayerBidding(playerId: string): void {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.ADMIN_END_PLAYER_BIDDING, { playerId });
    }
  }

  /**
   * Admin: Start next player in auction
   */
  startNextPlayer(auctionId: string): void {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.ADMIN_PUT_ON_BLOCK, { auctionId });
    }
  }

  /**
   * Admin: End auction
   */
  endAuction(auctionId: string): void {
    if (this.socket) {
      this.socket.emit('auction:end', { auctionId });
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
export default socketManager;
