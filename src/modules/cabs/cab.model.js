import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  type: { type: String, enum: ['Hatchback', 'Sedan', 'SUV', 'Auto'], required: true },
  pricePerKm: { type: Number, required: true },
  baseFare: { type: Number, required: true },
  capacity: { type: Number, required: true }
});

const cabVendorSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Ola Station Rides", "Mega Cabs"
  stationCode: { type: String, required: true, index: true },
  rating: { type: Number, default: 4.2 },
  vehicles: [vehicleSchema]
}, { timestamps: true });

const cabBookingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  stationCode: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'CabVendor', required: true },
  vehicleType: { type: String, required: true },
  pickupTime: { type: Date, required: true },
  dropLocation: { type: String, required: true },
  fare: { type: Number, required: true },
  status: { type: String, enum: ['CONFIRMED', 'DISPATCHED', 'COMPLETED', 'CANCELLED'], default: 'CONFIRMED' }
}, { timestamps: true });

cabBookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const CabVendor = mongoose.model('CabVendor', cabVendorSchema);
export const CabBooking = mongoose.model('CabBooking', cabBookingSchema);