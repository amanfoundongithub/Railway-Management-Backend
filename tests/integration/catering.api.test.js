import { jest } from '@jest/globals';

// 1. Mock the Email Service module entirely (Safe for top-level functions)
jest.mock('../../src/services/email.service.js', () => ({
  sendCateringConfirmation: jest.fn().mockResolvedValue(true)
}));

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { CateringOrder } from '../../src/modules/catering/catering.model.js';
import { CateringVendor } from '../../src/modules/catering/catering.vendor.model.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { Booking } from '../../src/modules/bookings/booking.model.js';
import { User } from '../../src/modules/auth/auth.model.js';
import jwt from 'jsonwebtoken';

// 2. Import the queue object
import { cateringQueue } from '../../src/workers/queues.js';

// 3. Spy on the queue object methods (Safe because we are mutating object properties)
jest.spyOn(cateringQueue, 'add').mockResolvedValue(true);
jest.spyOn(cateringQueue, 'getJob').mockResolvedValue(null);

describe('Catering API Endpoints - Rigorous Integration Tests', () => {
  let authToken;
  let user;
  let trainId;
  let primaryBookingId;
  let vendorId;

  const validVendorPayload = {
    name: 'Haldirams',
    stationCode: 'NDLS',
    tags: 'North Indian',
    menu: [{ name: 'Veg Thali', price: 250, isVeg: true }]
  };

  beforeEach(async () => {
    // Reset call counts on our spies between tests
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

    // 2. Setup Train
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

    // 3. Setup Primary Booking
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

    // 4. Setup a Vendor via the API to test createVendor endpoint
    const vendorRes = await request(app)
      .post('/api/catering/vendors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validVendorPayload);
    vendorId = vendorRes.body.data._id;
  });

  describe('GET /api/catering/trains/:trainId/vendors', () => {
    it('1. should map vendors to the correct train stations', async () => {
      const res = await request(app).get(`/api/catering/trains/${trainId}/vendors`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);

      const ndlsStop = res.body.find(s => s.code === 'NDLS');
      expect(ndlsStop.canOrder).toBe(true);
      expect(ndlsStop.vendors.length).toBe(1);
      expect(ndlsStop.vendors[0].name).toBe('Haldirams');

      const mmctStop = res.body.find(s => s.code === 'MMCT');
      expect(mmctStop.canOrder).toBe(false);
      expect(mmctStop.vendors.length).toBe(0);
    });

    it('2. should return 404 for an invalid train', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/catering/trains/${fakeId}/vendors`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/catering/vendors/:vendorId/menu', () => {
    it('1. should fetch a vendors menu', async () => {
      const res = await request(app).get(`/api/catering/vendors/${vendorId}/menu`);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Veg Thali');
    });

    it('2. should return 404 for missing vendor', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/catering/vendors/${fakeId}/menu`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/catering/order (placeCateringOrder)', () => {
    const orderPayload = {
      stationCode: 'NDLS',
      vendorId: 'some_vendor_id',
      restaurantName: 'Haldirams',
      deliveryEta: new Date(Date.now() + 2 * 60 * 60 * 1000), // ETA in 2 hours
      items: [
        { name: 'Veg Thali', quantity: 2, price: 250 }
      ]
    };

    it('1. should place an order, calculate total, and queue job in BullMQ', async () => {
      const res = await request(app)
        .post('/api/catering/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...orderPayload, bookingId: primaryBookingId });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalAmount).toBe(500); // 2 * 250

      // Verify BullMQ add() was called successfully on the spy
      expect(cateringQueue.add).toHaveBeenCalledTimes(1);
      const callArgs = cateringQueue.add.mock.calls[0];
      expect(callArgs[0]).toBe('dispatchToVendor'); // Job name
expect(callArgs[1].orderId.toString()).toBe(res.body.data._id);      expect(callArgs[2].delay).toBeGreaterThan(0); // Job options
    });

    it('2. should reject if bookingId is invalid', async () => {
      const fakeBookingId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/catering/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...orderPayload, bookingId: fakeBookingId });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Booking not found');
    });
  });

  describe('POST /api/catering/delay (handleTrainDelay)', () => {
    let orderId;

    beforeEach(async () => {
      // Seed a pending order at NDLS
      const order = await CateringOrder.create({
        bookingId: primaryBookingId,
        stationCode: 'NDLS',
        vendorId: 'some_vendor_id',
        restaurantName: 'Haldirams',
        deliveryEta: new Date(Date.now() + 2 * 60 * 60 * 1000), // ETA in 2 hours
        items: [{ name: 'Veg Thali', quantity: 2, price: 250 }],
        totalAmount: 500,
        status: 'PLACED'
      });
      orderId = order._id;
    });

    it('1. should shift ETA in database and update BullMQ delay', async () => {
      // Mock the getJob behavior for this specific test using the spy
      const mockChangeDelay = jest.fn().mockResolvedValue(true);
      cateringQueue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('delayed'),
        changeDelay: mockChangeDelay
      });

      const res = await request(app)
        .post('/api/catering/delay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stationCode: 'NDLS', delayMinutes: 30 });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('Updated ETAs for 1 orders');

      // Verify BullMQ was updated
      expect(cateringQueue.getJob).toHaveBeenCalledWith(`catering_${orderId}`);
      expect(mockChangeDelay).toHaveBeenCalledTimes(1);
    });

    it('2. should return safely if no pending orders exist at that station', async () => {
      const res = await request(app)
        .post('/api/catering/delay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stationCode: 'MMCT', delayMinutes: 30 }); // MMCT has no orders

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('No pending catering orders');
    });
  });
});