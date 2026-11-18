import mongoose from 'mongoose';
import { Booking } from '../../src/modules/bookings/booking.model.js'; // Adjust path

describe('Booking Model - Rigorous Unit Tests', () => {
  const validBookingPayload = {
    user: new mongoose.Types.ObjectId(),
    train: new mongoose.Types.ObjectId(),
    journeyDate: new Date('2026-12-15'),
    sourceStation: 'NDLS',
    destinationStation: 'MMCT',
    coachClass: '3A',
    totalFare: 2000,
    transactionId: 'TXN-12345',
    passengers: [
      { name: 'John Doe', age: 30, gender: 'M', seatNumber: '3A-1', status: 'CONFIRMED' }
    ],
    meals: [
      {
        restaurantName: 'Haldirams',
        deliveryStation: 'KOTA',
        items: [{ name: 'Thali', quantity: 1, price: 250 }],
        totalAmount: 250
      }
    ]
  };

  describe('Schema Validations & Constraints', () => {
    it('1. should validate a completely valid booking model', () => {
      const booking = new Booking(validBookingPayload);
      const error = booking.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should enforce required root fields', () => {
      const booking = new Booking({});
      const error = booking.validateSync();

      expect(error.errors.user).toBeDefined();
      expect(error.errors.train).toBeDefined();
      expect(error.errors.journeyDate).toBeDefined();
      expect(error.errors.totalFare).toBeDefined();
    });

    it('3. should enforce passenger array constraints (gender, age)', () => {
      const booking = new Booking({
        ...validBookingPayload,
        passengers: [{ name: 'A', age: 0, gender: 'X' }] // Invalid age (<1) and gender
      });
      const error = booking.validateSync();

      expect(error.errors['passengers.0.gender'].message).toContain('not a valid enum value');
      expect(error.errors['passengers.0.age'].message).toContain('less than minimum allowed value (1)');
    });

    it('4. should enforce paymentStatus and bookingStatus enums', () => {
      const booking = new Booking({
        ...validBookingPayload,
        paymentStatus: 'HALF_PAID',
        bookingStatus: 'KINDA_SUCCESS'
      });
      const error = booking.validateSync();

      expect(error.errors.paymentStatus).toBeDefined();
      expect(error.errors.bookingStatus).toBeDefined();
    });
  });

  describe('Database Interactions (Hooks & Defaults)', () => {
    it('1. should apply defaults for paymentStatus and bookingStatus', async () => {
      const booking = await Booking.create({
        ...validBookingPayload,
        paymentStatus: undefined,
        bookingStatus: undefined
      });

      expect(booking.paymentStatus).toBe('PENDING');
      expect(booking.bookingStatus).toBe('PENDING');
    });

    it('2. should automatically generate a 10-digit PNR via pre-save hook', async () => {
      const booking = await Booking.create(validBookingPayload);
      
      expect(booking.pnr).toBeDefined();
      expect(booking.pnr).toHaveLength(10);
      expect(booking.pnr).toMatch(/^\d{10}$/); // Must be strictly 10 digits
    });
  });
});