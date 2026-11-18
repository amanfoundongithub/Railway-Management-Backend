import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { StationHotel, HotelBooking } from '../../src/modules/hotels/hotel.model.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { Booking } from '../../src/modules/bookings/booking.model.js'; // Adjust path
import { User } from '../../src/modules/auth/auth.model.js';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// 1. Mock the Email Service so we don't send real emails during tests!
jest.mock('../../src/services/email.service.js', () => ({
  sendHotelBookingConfirmation: jest.fn().mockResolvedValue(true)
}));

describe('Hotel API Endpoints - Rigorous Integration Tests', () => {
  let authToken;
  let user;
  let trainId;
  let primaryBookingId;

  const validHotelPayload = {
    name: 'NDLS IRCTC Retiring Room',
    stationCode: 'NDLS',
    type: 'AC_ROOM',
    pricePerNight: 1200,
    totalRooms: 5,
    availableRooms: 5,
    amenities: ['AC', 'TV']
  };

  beforeEach(async () => {
    // 1. Setup User and Token
    user = await User.create({
      fullName: 'Test User',
      email: 'test@nxtrail.com',
      phoneNumber: '9999999999',
      password: 'password123',
      role: 'PASSENGER'
    });
    authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Setup a Train to attach hotels to
    const train = await Train.create({
      trainNumber: '12951',
      trainName: 'Rajdhani',
      source: 'NDLS',
      destination: 'MMCT',
      route: [
        { stationCode: 'NDLS', stationName: 'New Delhi', arrivalTime: '16:25', departureTime: '16:25', distanceFromSource: 0 },
        { stationCode: 'MMCT', stationName: 'Mumbai Central', arrivalTime: '08:15', departureTime: '08:15', distanceFromSource: 1386 }
      ],
      coachClasses: [{ classType: '3A', totalSeats: 144, baseFare: 2000 }]
    });
    trainId = train._id;

    // 3. Setup a Primary Train Booking (needed to book a hotel)
    const primaryBooking = await Booking.create({
      user: user._id,
      train: train._id,
      pnr: '1234567890',
      journeyDate: new Date('2026-12-15'),
      sourceStation: 'NDLS',       // ADDED
      destinationStation: 'MMCT',  // ADDED
      coachClass: '3A',            // ADDED
      passengers: [{ name: 'Test User', age: 30, gender: 'M', berthPreference: 'LOWER', currentStatus: 'CNF' }],
      totalFare: 2000,
      paymentStatus: 'COMPLETED'
    });
    primaryBookingId = primaryBooking._id;
  });

  describe('POST /api/hotels (createHotel)', () => {
    it('1. should create a new hotel successfully', async () => {
      const res = await request(app)
        .post('/api/hotels')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validHotelPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.stationCode).toBe('NDLS');
    });

    it('2. should reject if not authenticated', async () => {
      const res = await request(app).post('/api/hotels').send(validHotelPayload);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/hotels/trains/:trainId/vendors (getStationsWithHotels)', () => {
    beforeEach(async () => {
      // Seed a hotel at NDLS, but leave MMCT empty
      await StationHotel.create(validHotelPayload);
    });

    it('1. should map hotels to the correct stations on the train route', async () => {
      const res = await request(app).get(`/api/hotels/trains/${trainId}/vendors`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2); // NDLS and MMCT
      
      const ndlsStop = res.body.data.find(s => s.code === 'NDLS');
      const mmctStop = res.body.data.find(s => s.code === 'MMCT');

      // NDLS has the seeded hotel
      expect(ndlsStop.canBookHotel).toBe(true);
      expect(ndlsStop.hotels.length).toBe(1);
      expect(ndlsStop.hotels[0].name).toBe('NDLS IRCTC Retiring Room');

      // MMCT has no hotels
      expect(mmctStop.canBookHotel).toBe(false);
      expect(mmctStop.hotels.length).toBe(0);
    });

    it('2. should return 404 for a train ID that does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/hotels/trains/${fakeId}/vendors`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Train or train route not found');
    });
  });

  describe('POST /api/hotels/book (bookHotel)', () => {
    let hotelId;

    beforeEach(async () => {
      const hotel = await StationHotel.create(validHotelPayload);
      hotelId = hotel._id;
    });

    it('1. should book a hotel successfully and decrement available rooms', async () => {
      const bookPayload = {
        bookingId: primaryBookingId,
        hotelId,
        checkInDate: '2026-12-15',
        checkOutDate: '2026-12-16',
        roomsCount: 2,
        totalAmount: 2400
      };

      const res = await request(app)
        .post('/api/hotels/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('CONFIRMED');

      // Verify the hotel inventory was actually decremented in the DB
      const updatedHotel = await StationHotel.findById(hotelId);
      expect(updatedHotel.availableRooms).toBe(3); // Started with 5, booked 2
    });

    it('2. should reject if requested rooms exceed available rooms', async () => {
      const res = await request(app)
        .post('/api/hotels/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: primaryBookingId,
          hotelId,
          checkInDate: '2026-12-15',
          checkOutDate: '2026-12-16',
          roomsCount: 10, // Only 5 available
          totalAmount: 12000
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Requested rooms not available.');
    });

    it('3. should reject if the primary Train Booking ID is invalid/not found', async () => {
      const fakeBookingId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/hotels/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: fakeBookingId,
          hotelId,
          checkInDate: '2026-12-15',
          checkOutDate: '2026-12-16',
          roomsCount: 1,
          totalAmount: 1200
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Booking not found.');
    });
  });
});