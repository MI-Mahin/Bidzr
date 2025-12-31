import mongoose, { Schema, Model } from 'mongoose';
import { ITeam, IAcquiredPlayer } from '../types';

const acquiredPlayerSchema = new Schema<IAcquiredPlayer>(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'PlayerRegistration',
      required: true,
    },
    soldPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    shortName: {
      type: String,
      required: [true, 'Short name is required'],
      trim: true,
      uppercase: true,
      maxlength: [5, 'Short name cannot exceed 5 characters'],
    },
    logo: {
      type: String,
    },
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    initialBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    acquiredPlayers: {
      type: [acquiredPlayerSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Indexes
teamSchema.index({ auction: 1, owner: 1 }, { unique: true });
teamSchema.index({ auction: 1 });
teamSchema.index({ owner: 1 });
teamSchema.index({ name: 1, auction: 1 }, { unique: true });

// Virtual for player count
teamSchema.virtual('playerCount').get(function () {
  return this.acquiredPlayers?.length || 0;
});

// Virtual for spent amount
teamSchema.virtual('spentAmount').get(function () {
  return this.initialBudget - this.remainingBudget;
});

// Instance method to check if team can afford a bid
teamSchema.methods.canAffordBid = function (amount: number): boolean {
  return this.remainingBudget >= amount;
};

// Instance method to deduct budget
teamSchema.methods.deductBudget = async function (amount: number): Promise<void> {
  if (this.remainingBudget < amount) {
    throw new Error('Insufficient budget');
  }
  this.remainingBudget -= amount;
  await this.save();
};

// Instance method to add player
teamSchema.methods.addPlayer = async function (
  playerId: mongoose.Types.ObjectId,
  soldPrice: number
): Promise<void> {
  this.acquiredPlayers.push({
    player: playerId,
    soldPrice,
    acquiredAt: new Date(),
  });
  this.remainingBudget -= soldPrice;
  await this.save();
};

// Static method to find teams by auction
teamSchema.statics.findByAuction = function (auctionId: string) {
  return this.find({ auction: auctionId, isActive: true })
    .populate('owner', 'name email avatar')
    .sort({ name: 1 });
};

// Pre-save middleware to set initial budget
teamSchema.pre('save', async function (next) {
  if (this.isNew && !this.remainingBudget) {
    this.remainingBudget = this.initialBudget;
  }
  next();
});

const Team = mongoose.model<ITeam>('Team', teamSchema);

export default Team;
