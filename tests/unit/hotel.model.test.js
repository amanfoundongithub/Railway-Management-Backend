import mongoose from 'mongoose';
import { StationHotel, HotelBooking } from '../../src/modules/hotels/hotel.model.js'; // Adjust path

describe('Hotel Models - Rigorous Unit Tests', () => {
  const mockBookingId = new mongoose.Types.ObjectId();
  const mockHotelId = new mongoose.Types.ObjectId();

  const validHotelPayload = {
    name: 'Rail Yatri Niwas',
    stationCode: 'NDLS',
    type: 'RETIRING_ROOM',
    pricePerNight: 800,
    totalRooms: 10,
    availableRooms: 10,
    amenities: ['AC', 'WiFi']
  };

  const validBookingPayload = {
    bookingId: mockBookingId,
    hotelId: mockHotelId,
    checkInDate: new Date('2026-12-15'),
    checkOutDate: new Date('2026-12-16'),
    roomsCount: 2,
    totalAmount: 1600
  };

  describe('StationHotel Schema', () => {
    it('1. should validate a completely valid hotel model', () => {
      const hotel = new StationHotel(validHotelPayload);
      const error = hotel.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should enforce required fields', () => {
      const hotel = new StationHotel({});
      const error = hotel.validateSync();

      expect(error.errors.name).toBeDefined();
      expect(error.errors.stationCode).toBeDefined();
      expect(error.errors.pricePerNight).toBeDefined();
      expect(error.errors.availableRooms).toBeDefined();
    });

    it('3. should enforce hotel type enum constraint', () => {
      const hotel = new StationHotel({
        ...validHotelPayload,
        type: '5_STAR_LUXURY' // Not in enum
      });
      const error = hotel.validateSync();

      expect(error.errors.type.message).toContain('is not a valid enum value');
    });

    it('4. should apply default rating automatically', async () => {
      const hotel = await StationHotel.create(validHotelPayload);
      expect(hotel.rating).toBe(4.0);
    });
  });

  describe('HotelBooking Schema', () => {
    it('1. should validate a completely valid hotel booking model', () => {
      const booking = new HotelBooking(validBookingPayload);
      const error = booking.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should enforce required reference IDs', () => {
      const booking = new HotelBooking({
        ...validBookingPayload,
        bookingId: undefined,
        hotelId: undefined
      });
      const error = booking.validateSync();

      expect(error.errors.bookingId).toBeDefined();
      expect(error.errors.hotelId).toBeDefined();
    });

    it('3. should apply default status and roomsCount', async () => {
      const booking = await HotelBooking.create({
        ...validBookingPayload,
        roomsCount: undefined // Let default take over
      });

      expect(booking.status).toBe('CONFIRMED');
      expect(booking.roomsCount).toBe(1);
    });

    it('4. should enforce booking status enum', () => {
      const booking = new HotelBooking({
        ...validBookingPayload,
        status: 'PENDING_REFUND' // Not in enum
      });
      const error = booking.validateSync();

      expect(error.errors.status.message).toContain('is not a valid enum value');
    });
  });
});