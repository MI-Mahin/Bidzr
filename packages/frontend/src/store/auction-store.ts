import { create } from 'zustand';

// Types
interface Player {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  basePrice: number;
  profile?: {
    jerseyName?: string;
    jerseyNumber?: number;
    nationality?: string;
    age?: number;
  };
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  remainingBudget: number;
  playerCount: number;
}

interface CurrentPlayer extends Player {
  currentBid: number;
  currentTeam?: string;
  timeRemaining: number;
}

interface AuctionInfo {
  id: string;
  name: string;
  sportType: string;
  status: 'upcoming' | 'live' | 'paused' | 'ended';
  bidIncrementAmount: number;
  bidTimerSeconds: number;
}

interface Stats {
  pending: number;
  sold: number;
  unsold: number;
}

interface BidUpdate {
  playerId: string;
  currentBid: number;
  teamId: string;
  teamName: string;
  teamShortName: string;
  bidderName: string;
  timestamp: Date;
  timeRemaining: number;
}

interface PlayerSold {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  soldPrice: number;
}

interface AuctionState {
  // Connection state
  isConnected: boolean;
  auctionId: string | null;
  
  // Auction data
  auction: AuctionInfo | null;
  currentPlayer: CurrentPlayer | null;
  teams: Team[];
  stats: Stats;
  
  // Timer
  timeRemaining: number;
  
  // Recent activity
  recentBids: BidUpdate[];
  recentSales: PlayerSold[];
  
  // Actions
  setConnected: (connected: boolean) => void;
  setAuctionId: (id: string | null) => void;
  setAuctionState: (state: {
    auction: AuctionInfo;
    currentPlayer: CurrentPlayer | null;
    teams: Team[];
    stats: Stats;
  }) => void;
  setCurrentPlayer: (player: CurrentPlayer | null) => void;
  updateBid: (bid: BidUpdate) => void;
  updateTimer: (timeRemaining: number) => void;
  playerSold: (sale: PlayerSold) => void;
  playerUnsold: (playerId: string, playerName: string) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  auctionId: null,
  auction: null,
  currentPlayer: null,
  teams: [],
  stats: { pending: 0, sold: 0, unsold: 0 },
  timeRemaining: 0,
  recentBids: [],
  recentSales: [],
};

export const useAuctionStore = create<AuctionState>((set, get) => ({
  ...initialState,

  setConnected: (isConnected) => set({ isConnected }),

  setAuctionId: (auctionId) => set({ auctionId }),

  setAuctionState: ({ auction, currentPlayer, teams, stats }) =>
    set({
      auction,
      currentPlayer,
      teams,
      stats,
      timeRemaining: currentPlayer?.timeRemaining || 0,
    }),

  setCurrentPlayer: (currentPlayer) =>
    set({
      currentPlayer,
      timeRemaining: currentPlayer?.timeRemaining || 0,
      recentBids: [], // Clear bids for new player
    }),

  updateBid: (bid) =>
    set((state) => ({
      currentPlayer: state.currentPlayer
        ? {
            ...state.currentPlayer,
            currentBid: bid.currentBid,
            currentTeam: bid.teamName,
          }
        : null,
      timeRemaining: bid.timeRemaining,
      recentBids: [bid, ...state.recentBids.slice(0, 9)], // Keep last 10 bids
    })),

  updateTimer: (timeRemaining) =>
    set((state) => ({
      timeRemaining,
      currentPlayer: state.currentPlayer
        ? { ...state.currentPlayer, timeRemaining }
        : null,
    })),

  playerSold: (sale) =>
    set((state) => ({
      currentPlayer: null,
      timeRemaining: 0,
      stats: {
        ...state.stats,
        pending: Math.max(0, state.stats.pending - 1),
        sold: state.stats.sold + 1,
      },
      recentSales: [sale, ...state.recentSales.slice(0, 9)],
      teams: state.teams.map((team) =>
        team.id === sale.teamId
          ? {
              ...team,
              remainingBudget: team.remainingBudget - sale.soldPrice,
              playerCount: team.playerCount + 1,
            }
          : team
      ),
    })),

  playerUnsold: (playerId, playerName) =>
    set((state) => ({
      currentPlayer: null,
      timeRemaining: 0,
      stats: {
        ...state.stats,
        pending: Math.max(0, state.stats.pending - 1),
        unsold: state.stats.unsold + 1,
      },
    })),

  updateTeam: (teamId, updates) =>
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === teamId ? { ...team, ...updates } : team
      ),
    })),

  reset: () => set(initialState),
}));
