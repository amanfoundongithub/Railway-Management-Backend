import mongoose from 'mongoose';
import { CabVendor, CabBooking } from '../../src/modules/cabs/cab.model.js'; // Adjust path

describe('Cab Models - Rigorous Unit Tests', () => {
  const mockBookingId = new mongoose.Types.ObjectId();
  const mockVendorId = new mongoose.Types.ObjectId();

  const validVendorPayload = {
    name: 'Ola Station Rides',
    stationCode: 'NDLS',
    vehicles: [
      { type: 'Sedan', pricePerKm: 15, baseFare: 50, capacity: 4 },
      { type: 'SUV', pricePerKm: 25, baseFare: 100, capacity: 6 }
    ]
  };

  const validBookingPayload = {
    bookingId: mockBookingId,
    stationCode: 'NDLS',
    vendorId: mockVendorId,
    vehicleType: 'Sedan',
    pickupTime: new Date('2026-12-15T16:25:00.000Z'),
    dropLocation: 'Connaught Place, Delhi',
    fare: 350
  };

  describe('CabVendor Schema', () => {
    it('1. should validate a completely valid cab vendor model', () => {
      const vendor = new CabVendor(validVendorPayload);
      const error = vendor.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should enforce required fields', () => {
      const vendor = new CabVendor({});
      const error = vendor.validateSync();

      expect(error.errors.name).toBeDefined();
      expect(error.errors.stationCode).toBeDefined();
    });

    it('3. should enforce vehicle type enum constraints', () => {
      const vendor = new CabVendor({
        ...validVendorPayload,
        vehicles: [{ type: 'HELICOPTER', pricePerKm: 500, baseFare: 1000, capacity: 2 }]
      });
      const error = vendor.validateSync();

      expect(error.errors['vehicles.0.type'].message).toContain('is not a valid enum value');
    });

    it('4. should apply default rating automatically', async () => {
      const vendor = await CabVendor.create(validVendorPayload);
      expect(vendor.rating).toBe(4.2);
    });
  });

  describe('CabBooking Schema', () => {
    it('1. should validate a completely valid cab booking model', () => {
      const booking = new CabBooking(validBookingPayload);
      const error = booking.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should enforce required reference IDs', () => {
      const booking = new CabBooking({
        ...validBookingPayload,
        bookingId: undefined,
        vendorId: undefined
      });
      const error = booking.validateSync();

      expect(error.errors.bookingId).toBeDefined();
      expect(error.errors.vendorId).toBeDefined();
    });

    it('3. should apply default status PLACED/CONFIRMED', async () => {
      const booking = await CabBooking.create(validBookingPayload);
      expect(booking.status).toBe('CONFIRMED');
    });

    it('4. should enforce booking status enum', () => {
      const booking = new CabBooking({
        ...validBookingPayload,
        status: 'FLYING' // Not in enum
      });
      const error = booking.validateSync();

      expect(error.errors.status.message).toContain('is not a valid enum value');
    });
  });
});