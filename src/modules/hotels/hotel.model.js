import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Station Retiring Room AC", "Rail Yatri Niwas"
  stationCode: { type: String, required: true, index: true },
  type: { type: String, enum: ['RETIRING_ROOM', 'DORMITORY', 'AC_ROOM', 'DELUXE_HOTEL'], required: true },
  pricePerNight: { type: Number, required: true },
  totalRooms: { type: Number, required: true },
  availableRooms: { type: Number, required: true },
  amenities: [String],
  rating: { type: Number, default: 4.0 }
}, { timestamps: true });

const hotelBookingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'StationHotel', required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  roomsCount: { type: Number, required: true, default: 1 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'], default: 'CONFIRMED' }
}, { timestamps: true });

export const StationHotel = mongoose.model('StationHotel', hotelSchema);
export const HotelBooking = mongoose.model('HotelBooking', hotelBookingSchema);