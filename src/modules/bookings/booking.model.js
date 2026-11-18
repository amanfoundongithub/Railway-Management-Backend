import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 120,
  },
  gender: {
    type: String,
    enum: ['M', 'F', 'T'],
    required: true,
  },
  seatNumber: {
    type: String, // e.g., "B1-42" (Will be assigned by the controller)
  },
  status: {
    type: String,
    enum: ['CONFIRMED', 'RAC', 'WAITLISTED', 'CANCELLED'],
    default: 'CONFIRMED',
  }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  pnr: {
    type: String,
    unique: true,
    index: true, // Speeds up PNR search queries
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  train: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Train',
    required: true,
  },
  journeyDate: {
    type: Date,
    required: true,
  },
  sourceStation: {
    type: String,
    required: true,
    uppercase: true,
  },
  destinationStation: {
    type: String,
    required: true,
    uppercase: true,
  },
  coachClass: {
    type: String,
    enum: ['1A', '2A', '3A', 'SL', 'CC', '2S', 'UR'],
    required: true,
  },
  passengers: [passengerSchema],
  // Add this inside your BookingSchema definition
meals: [
  {
    restaurantName: { type: String, required: true },
    deliveryStation: { type: String, required: true }, // E.g., 'Nagpur Junction'
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
      }
    ],
    totalAmount: { type: Number, required: true },
    orderStatus: { 
      type: String, 
      enum: ['CONFIRMED', 'DELIVERED', 'CANCELLED'], 
      default: 'CONFIRMED' 
    },
    orderedAt: { type: Date, default: Date.now }
  }
],
  totalFare: {
    type: Number,
    required: true,
  },
  transactionId: {
    type: String,
    unique: true,
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  },
  bookingStatus: {
    type: String,
    enum: ['PENDING','SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
  },
}, { timestamps: true });

bookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Pre-save hook to generate a random 10-digit PNR if it doesn't exist
// Mongoose 8 compatible (no 'next')
bookingSchema.pre('save', async function () {
  if (this.isNew && !this.pnr) {
    // Generates a random 10-digit string starting with a non-zero digit
    this.pnr = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
});

export const Booking = mongoose.model('Booking', bookingSchema);