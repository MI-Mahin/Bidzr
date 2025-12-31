import mongoose, { Schema, Model } from 'mongoose';
import { IBid, BidStatus } from '../types';

const bidSchema = new Schema<IBid>(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    player: {
      type: Schema.Types.ObjectId,
      ref: 'PlayerRegistration',
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    bidder: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [0, 'Bid amount must be positive'],
    },
    status: {
      type: String,
      enum: Object.values(BidStatus),
      default: BidStatus.ACTIVE,
    },
    bidNumber: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
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

// Indexes for efficient querying
bidSchema.index({ auction: 1, player: 1, timestamp: -1 });
bidSchema.index({ auction: 1, team: 1 });
bidSchema.index({ player: 1, status: 1 });
bidSchema.index({ timestamp: -1 });

// Pre-save middleware to set bid number
bidSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Get the count of existing bids for this player
    const count = await Bid.countDocuments({
      auction: this.auction,
      player: this.player,
    });
    this.bidNumber = count + 1;
  }
  next();
});

// Static method to get highest bid for a player
bidSchema.statics.getHighestBid = function (playerId: string) {
  return this.findOne({
    player: playerId,
    status: { $in: [BidStatus.ACTIVE, BidStatus.WON] },
  })
    .sort({ amount: -1 })
    .populate('team', 'name shortName')
    .populate('bidder', 'name');
};

// Static method to get bid history for a player
bidSchema.statics.getBidHistory = function (playerId: string) {
  return this.find({ player: playerId })
    .sort({ timestamp: 1 })
    .populate('team', 'name shortName')
    .populate('bidder', 'name');
};

// Static method to get all bids in an auction
bidSchema.statics.getAuctionBids = function (auctionId: string) {
  return this.find({ auction: auctionId })
    .sort({ timestamp: -1 })
    .populate('team', 'name shortName')
    .populate('player')
    .populate('bidder', 'name');
};

// Static method to mark all other bids as outbid
bidSchema.statics.markOthersAsOutbid = async function (
  playerId: string,
  currentBidId: string
): Promise<void> {
  await this.updateMany(
    {
      player: playerId,
      _id: { $ne: currentBidId },
      status: BidStatus.ACTIVE,
    },
    { status: BidStatus.OUTBID }
  );
};

// Static method to mark winning bid
bidSchema.statics.markAsWon = async function (bidId: string): Promise<void> {
  await this.findByIdAndUpdate(bidId, { status: BidStatus.WON });
};

// Static method to get team's bid statistics for an auction
bidSchema.statics.getTeamBidStats = async function (auctionId: string, teamId: string) {
  return this.aggregate([
    {
      $match: {
        auction: new mongoose.Types.ObjectId(auctionId),
        team: new mongoose.Types.ObjectId(teamId),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);
};

const Bid = mongoose.model<IBid>('Bid', bidSchema);

export default Bid;
