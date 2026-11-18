import { jest } from '@jest/globals';

// 1. Mock the Email Service module entirely
jest.mock('../../src/services/email.service.js', () => ({
  sendCabBookingConfirmation: jest.fn().mockResolvedValue(true)
}));

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { CabVendor, CabBooking } from '../../src/modules/cabs/cab.model.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { Station } from '../../src/modules/stations/station.model.js'; // Adjust path
import { Booking } from '../../src/modules/bookings/booking.model.js'; // Adjust path
import { User } from '../../src/modules/auth/auth.model.js';
import jwt from 'jsonwebtoken';

describe('Cab API Endpoints - Rigorous Integration Tests', () => {
  let authToken;
  let user;
  let trainId;
  let primaryBookingId;
  let vendorId;

  const validVendorPayload = {
    name: 'Ola Station Rides',
    stationCode: 'NDLS',
    vehicles: [
      { type: 'Sedan', pricePerKm: 15, baseFare: 50, capacity: 4 }
    ]
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // 1. Setup User and Token
    user = await User.create({
      fullName: 'Test User',
      email: 'test@nxtrail.com',
      phoneNumber: '9999999999',
      password: 'password123',
      role: 'PASSENGER'
    });
    authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Setup Station (Required for Coordinates in getStationsWithCabs)
    await Station.create({
      stationCode: 'NDLS',
      stationName: 'New Delhi',
      zone: 'NR',
      state: 'Delhi',
      coordinates: { lat: 28.6429, lng: 77.2191 }
    });

    // 3. Setup Train
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

    // 4. Setup Primary Booking
    const primaryBooking = await Booking.create({
      user: user._id,
      train: train._id,
      pnr: '1234567890',
      journeyDate: new Date('2026-12-15'),
      sourceStation: 'NDLS',
      destinationStation: 'MMCT',
      coachClass: '3A',
      passengers: [{ name: 'Test User', age: 30, gender: 'M', berthPreference: 'LOWER', currentStatus: 'CNF' }],
      totalFare: 2000,
      paymentStatus: 'COMPLETED'
    });
    primaryBookingId = primaryBooking._id;

    // 5. Setup Vendor via API
    const vendorRes = await request(app)
      .post('/api/cabs/vendors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validVendorPayload);
    vendorId = vendorRes.body.data._id;
  });

  describe('POST /api/cabs/vendors (createCabVendor)', () => {
    it('1. should create a new vendor successfully', async () => {
      // Vendor was already created in beforeEach, we just verify the data
      const vendor = await CabVendor.findById(vendorId);
      expect(vendor.name).toBe('Ola Station Rides');
      expect(vendor.vehicles.length).toBe(1);
    });

    it('2. should reject if not authenticated', async () => {
      const res = await request(app).post('/api/cabs/vendors').send(validVendorPayload);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/cabs/trains/:trainId/vendors (getStationsWithCabs)', () => {
    it('1. should map vendors and coordinates to the correct train stations', async () => {
      const res = await request(app).get(`/api/cabs/trains/${trainId}/vendors`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);

      const ndlsStop = res.body.data.find(s => s.code === 'NDLS');
      
      // Verify Station Coordinates were successfully joined
      expect(ndlsStop.coordinates).toBeDefined();
      expect(ndlsStop.coordinates.lat).toBe(28.6429);
      
      // Verify Vendors were mapped
      expect(ndlsStop.canBookCab).toBe(true);
      expect(ndlsStop.cabs.length).toBe(1);
      expect(ndlsStop.cabs[0].name).toBe('Ola Station Rides');

      // Verify empty station works
      const mmctStop = res.body.data.find(s => s.code === 'MMCT');
      expect(mmctStop.canBookCab).toBe(false);
      expect(mmctStop.cabs.length).toBe(0);
      expect(mmctStop.coordinates).toBeUndefined(); // We didn't seed MMCT station
    });

    it('2. should return 404 for an invalid train', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/cabs/trains/${fakeId}/vendors`);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Train or train route not found');
    });
  });

  describe('POST /api/cabs/book (bookCab)', () => {
    const bookPayload = {
      stationCode: 'NDLS',
      vehicleType: 'Sedan',
      pickupTime: '2026-12-15T16:45:00.000Z',
      dropLocation: 'India Gate',
      fare: 350
    };

    it('1. should book a cab successfully', async () => {
      const res = await request(app)
        .post('/api/cabs/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookPayload, bookingId: primaryBookingId, vendorId });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.vehicleType).toBe('Sedan');
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('2. should reject if bookingId is invalid', async () => {
      const fakeBookingId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/cabs/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookPayload, bookingId: fakeBookingId, vendorId });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Booking not found');
    });

    it('3. should reject if vendorId is invalid', async () => {
      const fakeVendorId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/cabs/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookPayload, bookingId: primaryBookingId, vendorId: fakeVendorId });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('vendor not found');
    });
  });
});