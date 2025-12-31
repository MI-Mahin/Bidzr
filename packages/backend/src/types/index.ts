// ============================================
// BIDZR - Sports Auction Management System
// Type Definitions
// ============================================

import { Document, Types } from 'mongoose';

// ============================================
// Enums
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  TEAM_OWNER = 'team_owner',
  PLAYER = 'player',
}

export enum SportType {
  CRICKET = 'cricket',
  FOOTBALL = 'football',
  BASKETBALL = 'basketball',
  KABADDI = 'kabaddi',
}

export enum CricketRole {
  BATSMAN = 'batsman',
  BOWLER = 'bowler',
  ALL_ROUNDER = 'all_rounder',
  WICKET_KEEPER = 'wicket_keeper',
}

export enum FootballPosition {
  GOALKEEPER = 'goalkeeper',
  DEFENDER = 'defender',
  MIDFIELDER = 'midfielder',
  FORWARD = 'forward',
}

export enum AuctionStatus {
  UPCOMING = 'upcoming',
  LIVE = 'live',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum PlayerAuctionStatus {
  PENDING = 'pending',
  IN_AUCTION = 'in_auction',
  SOLD = 'sold',
  UNSOLD = 'unsold',
}

export enum BidStatus {
  ACTIVE = 'active',
  OUTBID = 'outbid',
  WON = 'won',
  EXPIRED = 'expired',
}

// ============================================
// Base Interfaces
// ============================================

export interface ITimestamps {
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// User Types
// ============================================

export interface IUser extends Document, ITimestamps {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  role: UserRole;
  googleId?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

export type UserDocument = IUser & IUserMethods;

// ============================================
// Auction Types
// ============================================

export interface IBasePriceTier {
  amount: number;
  label: string;
}

export interface ISportConfig {
  sportType: SportType;
  roles: string[];
  basePriceTiers: IBasePriceTier[];
}

export interface IAuction extends Document, ITimestamps {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  sportType: SportType;
  sportConfig: ISportConfig;
  password: string;
  passwordHash: string;
  bidIncrementAmount: number;
  teamBudget: number;
  status: AuctionStatus;
  bidTimerSeconds: number;
  maxTeams?: number;
  maxPlayersPerTeam?: number;
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  endTime?: Date;
  currentPlayerOnBlock?: Types.ObjectId;
  createdBy: Types.ObjectId;
}

// ============================================
// Team Types
// ============================================

export interface IAcquiredPlayer {
  player: Types.ObjectId;
  soldPrice: number;
  acquiredAt: Date;
}

export interface ITeam extends Document, ITimestamps {
  _id: Types.ObjectId;
  name: string;
  shortName: string;
  logo?: string;
  auction: Types.ObjectId;
  owner: Types.ObjectId;
  initialBudget: number;
  remainingBudget: number;
  acquiredPlayers: IAcquiredPlayer[];
  isActive: boolean;
}

// ============================================
// Player Registration Types
// ============================================

export interface IPlayerRegistration extends Document, ITimestamps {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  auction: Types.ObjectId;
  playerRole: string; // CricketRole or FootballPosition based on sport
  basePrice: number;
  status: PlayerAuctionStatus;
  soldPrice?: number;
  soldTo?: Types.ObjectId; // Team ID
  registrationOrder: number;
  profile: IPlayerProfile;
}

export interface IPlayerProfile {
  jerseyName?: string;
  jerseyNumber?: number;
  nationality?: string;
  age?: number;
  experience?: string;
  achievements?: string[];
  stats?: Record<string, any>;
}

// ============================================
// Bid Types
// ============================================

export interface IBid extends Document, ITimestamps {
  _id: Types.ObjectId;
  auction: Types.ObjectId;
  player: Types.ObjectId; // PlayerRegistration ID
  team: Types.ObjectId;
  bidder: Types.ObjectId; // User ID of team owner
  amount: number;
  status: BidStatus;
  bidNumber: number; // Sequential bid number for this player
  timestamp: Date;
}

// ============================================
// Socket Event Types
// ============================================

export interface IJoinAuctionPayload {
  auctionId: string;
  password: string;
}

export interface IPlaceBidPayload {
  auctionId: string;
  playerId: string;
  teamId: string;
  amount: number;
}

export interface IBidUpdatePayload {
  auctionId: string;
  playerId: string;
  currentBid: number;
  teamId: string;
  teamName: string;
  bidderName: string;
  timestamp: Date;
  timeRemaining: number;
}

export interface ITimerUpdatePayload {
  auctionId: string;
  playerId: string;
  timeRemaining: number;
}

export interface IPlayerSoldPayload {
  auctionId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  soldPrice: number;
}

export interface IPlayerUnsoldPayload {
  auctionId: string;
  playerId: string;
  playerName: string;
}

export interface IAuctionStatePayload {
  auctionId: string;
  status: AuctionStatus;
  currentPlayer?: {
    id: string;
    name: string;
    role: string;
    basePrice: number;
    currentBid: number;
    currentTeam?: string;
    timeRemaining: number;
  };
  teams: Array<{
    id: string;
    name: string;
    remainingBudget: number;
    playerCount: number;
  }>;
}

// ============================================
// API Request/Response Types
// ============================================

export interface IAuthRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest extends IAuthRequest {
  name: string;
  role?: UserRole;
}

export interface ICreateAuctionRequest {
  name: string;
  description?: string;
  sportType: SportType;
  password: string;
  bidIncrementAmount: number;
  teamBudget: number;
  bidTimerSeconds?: number;
  basePriceTiers: IBasePriceTier[];
  roles?: string[];
  maxTeams?: number;
  maxPlayersPerTeam?: number;
  scheduledStartTime?: string;
}

export interface IRegisterTeamRequest {
  auctionId: string;
  password: string;
  name: string;
  shortName: string;
  logo?: string;
}

export interface IRegisterPlayerRequest {
  auctionId: string;
  password: string;
  playerRole: string;
  basePrice: number;
  profile?: IPlayerProfile;
}

// ============================================
// JWT Payload Types
// ============================================

export interface IJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ============================================
// Express Extended Types
// ============================================

declare global {
  namespace Express {
    interface User extends UserDocument {}
    interface Request {
      auction?: IAuction;
      team?: ITeam;
    }
  }
}

export {};
