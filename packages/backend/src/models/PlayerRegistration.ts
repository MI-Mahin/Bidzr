import mongoose, { Schema, Model } from 'mongoose';
import { IPlayerRegistration, IPlayerProfile, PlayerAuctionStatus } from '../types';

const playerProfileSchema = new Schema<IPlayerProfile>(
  {
    jerseyName: {
      type: String,
      trim: true,
      maxlength: [50, 'Jersey name cannot exceed 50 characters'],
    },
    jerseyNumber: {
      type: Number,
      min: [0, 'Jersey number must be positive'],
      max: [99, 'Jersey number cannot exceed 99'],
    },
    nationality: {
      type: String,
      trim: true,
    },
    age: {
      type: Number,
      min: [16, 'Player must be at least 16 years old'],
      max: [60, 'Player age cannot exceed 60'],
    },
    experience: {
      type: String,
      trim: true,
    },
    achievements: {
      type: [String],
      default: [],
    },
    stats: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const playerRegistrationSchema = new Schema<IPlayerRegistration>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    playerRole: {
      type: String,
      required: [true, 'Player role is required'],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price must be positive'],
    },
    status: {
      type: String,
      enum: Object.values(PlayerAuctionStatus),
      default: PlayerAuctionStatus.PENDING,
    },
    soldPrice: {
      type: Number,
      min: 0,
    },
    soldTo: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    registrationOrder: {
      type: Number,
      required: true,
    },
    profile: {
      type: playerProfileSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index - a user can only register once per auction
playerRegistrationSchema.index({ user: 1, auction: 1 }, { unique: true });
playerRegistrationSchema.index({ auction: 1, status: 1 });
playerRegistrationSchema.index({ auction: 1, registrationOrder: 1 });
playerRegistrationSchema.index({ playerRole: 1 });

// Pre-save middleware to set registration order
playerRegistrationSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Get the count of existing registrations for this auction
    const count = await PlayerRegistration.countDocuments({ auction: this.auction });
    this.registrationOrder = count + 1;
  }
  next();
});

// Instance method to mark as sold
playerRegistrationSchema.methods.markAsSold = async function (
  teamId: mongoose.Types.ObjectId,
  soldPrice: number
): Promise<void> {
  this.status = PlayerAuctionStatus.SOLD;
  this.soldTo = teamId;
  this.soldPrice = soldPrice;
  await this.save();
};

// Instance method to mark as unsold
playerRegistrationSchema.methods.markAsUnsold = async function (): Promise<void> {
  this.status = PlayerAuctionStatus.UNSOLD;
  await this.save();
};

// Static method to get next player for auction
playerRegistrationSchema.statics.getNextForAuction = function (auctionId: string) {
  return this.findOne({
    auction: auctionId,
    status: PlayerAuctionStatus.PENDING,
  })
    .sort({ registrationOrder: 1 })
    .populate('user', 'name email avatar');
};

// Static method to get players by auction
playerRegistrationSchema.statics.findByAuction = function (auctionId: string) {
  return this.find({ auction: auctionId })
    .populate('user', 'name email avatar')
    .populate('soldTo', 'name shortName')
    .sort({ registrationOrder: 1 });
};

// Static method to get auction stats
playerRegistrationSchema.statics.getAuctionStats = async function (auctionId: string) {
  const stats = await this.aggregate([
    { $match: { auction: new mongoose.Types.ObjectId(auctionId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$soldPrice' },
      },
    },
  ]);

  const result: Record<string, { count: number; totalValue: number }> = {};
  stats.forEach((stat) => {
    result[stat._id] = { count: stat.count, totalValue: stat.totalValue || 0 };
  });

  return result;
};

const PlayerRegistration = mongoose.model<IPlayerRegistration>(
  'PlayerRegistration',
  playerRegistrationSchema
);

export default PlayerRegistration;
