import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  IAuction,
  AuctionStatus,
  SportType,
  CricketRole,
  IBasePriceTier,
  ISportConfig,
} from '../types';

// Sport-specific default configurations
export const SPORT_CONFIGS: Record<SportType, Omit<ISportConfig, 'basePriceTiers'>> = {
  [SportType.CRICKET]: {
    sportType: SportType.CRICKET,
    roles: Object.values(CricketRole),
  },
  [SportType.FOOTBALL]: {
    sportType: SportType.FOOTBALL,
    roles: ['goalkeeper', 'defender', 'midfielder', 'forward'],
  },
  [SportType.BASKETBALL]: {
    sportType: SportType.BASKETBALL,
    roles: ['point_guard', 'shooting_guard', 'small_forward', 'power_forward', 'center'],
  },
  [SportType.KABADDI]: {
    sportType: SportType.KABADDI,
    roles: ['raider', 'defender', 'all_rounder'],
  },
};

// Default base price tiers for cricket (in lakhs)
export const DEFAULT_CRICKET_BASE_PRICES: IBasePriceTier[] = [
  { amount: 2000000, label: '20 Lakhs' },
  { amount: 1500000, label: '15 Lakhs' },
  { amount: 1000000, label: '10 Lakhs' },
  { amount: 750000, label: '7.5 Lakhs' },
  { amount: 500000, label: '5 Lakhs' },
  { amount: 300000, label: '3 Lakhs' },
  { amount: 200000, label: '2 Lakhs' },
];

const basePriceTierSchema = new Schema<IBasePriceTier>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    label: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const sportConfigSchema = new Schema<ISportConfig>(
  {
    sportType: {
      type: String,
      enum: Object.values(SportType),
      required: true,
    },
    roles: {
      type: [String],
      required: true,
    },
    basePriceTiers: {
      type: [basePriceTierSchema],
      required: true,
    },
  },
  { _id: false }
);

const auctionSchema = new Schema<IAuction>(
  {
    name: {
      type: String,
      required: [true, 'Auction name is required'],
      trim: true,
      maxlength: [200, 'Auction name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    sportType: {
      type: String,
      enum: Object.values(SportType),
      required: [true, 'Sport type is required'],
      default: SportType.CRICKET,
    },
    sportConfig: {
      type: sportConfigSchema,
      required: true,
    },
    password: {
      type: String,
      required: [true, 'Auction password is required'],
      minlength: [4, 'Password must be at least 4 characters'],
      select: false,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    bidIncrementAmount: {
      type: Number,
      required: [true, 'Bid increment amount is required'],
      min: [1, 'Bid increment must be positive'],
    },
    teamBudget: {
      type: Number,
      required: [true, 'Team budget is required'],
      min: [1, 'Team budget must be positive'],
    },
    status: {
      type: String,
      enum: Object.values(AuctionStatus),
      default: AuctionStatus.UPCOMING,
    },
    bidTimerSeconds: {
      type: Number,
      default: 30,
      min: [10, 'Bid timer must be at least 10 seconds'],
      max: [120, 'Bid timer cannot exceed 120 seconds'],
    },
    maxTeams: {
      type: Number,
      min: [2, 'Must allow at least 2 teams'],
    },
    maxPlayersPerTeam: {
      type: Number,
      min: [1, 'Must allow at least 1 player per team'],
    },
    scheduledStartTime: {
      type: Date,
    },
    actualStartTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    currentPlayerOnBlock: {
      type: Schema.Types.ObjectId,
      ref: 'PlayerRegistration',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
auctionSchema.index({ status: 1 });
auctionSchema.index({ sportType: 1 });
auctionSchema.index({ createdBy: 1 });
auctionSchema.index({ scheduledStartTime: 1 });

// Pre-save middleware to hash password and setup sport config
auctionSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.password, salt);
  }

  // Setup sport config if not provided
  if (this.isNew && !this.sportConfig) {
    const defaultConfig = SPORT_CONFIGS[this.sportType];
    this.sportConfig = {
      ...defaultConfig,
      basePriceTiers: DEFAULT_CRICKET_BASE_PRICES,
    };
  }

  next();
});

// Instance method to verify password
auctionSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
  const auction = await Auction.findById(this._id).select('+passwordHash');
  if (!auction?.passwordHash) return false;
  return bcrypt.compare(password, auction.passwordHash);
};

// Static method to find by password
auctionSchema.statics.findByPassword = async function (
  auctionId: string,
  password: string
): Promise<IAuction | null> {
  const auction = await this.findById(auctionId).select('+passwordHash');
  if (!auction) return null;

  const isMatch = await bcrypt.compare(password, auction.passwordHash);
  if (!isMatch) return null;

  return auction;
};

const Auction = mongoose.model<IAuction>('Auction', auctionSchema);

export default Auction;
