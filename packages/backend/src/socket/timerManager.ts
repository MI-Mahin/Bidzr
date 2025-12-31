import { Server as SocketIOServer } from 'socket.io';
import { SOCKET_EVENTS } from './auctionSocket';

interface Timer {
  intervalId: NodeJS.Timeout;
  timeRemaining: number;
  playerId: string;
}

class AuctionTimerManager {
  private io: SocketIOServer;
  private timers: Map<string, Timer> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Start a countdown timer for an auction
   */
  startTimer(
    auctionId: string,
    playerId: string,
    durationSeconds: number,
    onExpire: () => void
  ): void {
    // Stop any existing timer for this auction
    this.stopTimer(auctionId);

    const timer: Timer = {
      intervalId: setInterval(() => {
        this.tick(auctionId, onExpire);
      }, 1000),
      timeRemaining: durationSeconds,
      playerId,
    };

    this.timers.set(auctionId, timer);

    // Emit initial timer state
    this.emitTimerUpdate(auctionId, playerId, durationSeconds);
  }

  /**
   * Stop the timer for an auction
   */
  stopTimer(auctionId: string): void {
    const timer = this.timers.get(auctionId);
    if (timer) {
      clearInterval(timer.intervalId);
      this.timers.delete(auctionId);
    }
  }

  /**
   * Reset the timer (called when a bid is placed)
   */
  resetTimer(auctionId: string, playerId: string): void {
    const timer = this.timers.get(auctionId);
    if (timer && timer.playerId === playerId) {
      // Get auction's bid timer seconds (default to 30)
      const Auction = require('../models').Auction;
      Auction.findById(auctionId).then((auction: any) => {
        if (auction) {
          timer.timeRemaining = auction.bidTimerSeconds;
          this.emitTimerUpdate(auctionId, playerId, timer.timeRemaining);
        }
      });
    }
  }

  /**
   * Get remaining time for an auction
   */
  getTimeRemaining(auctionId: string): number {
    const timer = this.timers.get(auctionId);
    return timer?.timeRemaining || 0;
  }

  /**
   * Internal tick handler
   */
  private tick(auctionId: string, onExpire: () => void): void {
    const timer = this.timers.get(auctionId);
    if (!timer) return;

    timer.timeRemaining -= 1;

    // Emit timer update
    this.emitTimerUpdate(auctionId, timer.playerId, timer.timeRemaining);

    // Check if timer expired
    if (timer.timeRemaining <= 0) {
      this.stopTimer(auctionId);
      onExpire();
    }
  }

  /**
   * Emit timer update to all clients in the auction room
   */
  private emitTimerUpdate(auctionId: string, playerId: string, timeRemaining: number): void {
    this.io.to(`auction:${auctionId}`).emit(SOCKET_EVENTS.TIMER_UPDATE, {
      auctionId,
      playerId,
      timeRemaining,
    });
  }

  /**
   * Clean up all timers
   */
  cleanup(): void {
    this.timers.forEach((timer, auctionId) => {
      clearInterval(timer.intervalId);
    });
    this.timers.clear();
  }
}

export default AuctionTimerManager;
