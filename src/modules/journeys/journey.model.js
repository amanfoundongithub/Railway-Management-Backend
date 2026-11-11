import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  classType: {
    type: String,
    enum: ['1A', '2A', '3A', 'SL', 'CC', '2S', 'UR'],
    required: true,
  },
  totalSeats: {
    type: Number,
    required: true,
  },
  availableSeats: {
    type: Number,
    required: true,
  },
  waitlistCount: {
    type: Number,
    default: 0,
  }
}, { _id: false });

const journeySchema = new mongoose.Schema({
  train: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Train',
    required: true,
  },
  journeyDate: {
    type: Date,
    required: true,
  },
  seatInventory: [inventorySchema],
  status: {
    type: String,
    enum: ['SCHEDULED', 'DEPARTED', 'CANCELLED'],
    default: 'SCHEDULED',
  }
}, { timestamps: true });

// Ensure we don't accidentally create two overlapping instances of the same train on the same day
journeySchema.index({ train: 1, journeyDate: 1 }, { unique: true });

export const Journey = mongoose.model('Journey', journeySchema);