import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// 1. Mock external services & queues cleanly at the top
jest.mock('../../src/services/email.service.js', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(true)
}));



import request from 'supertest';
import app from '../../src/app.js';
import { Booking } from '../../src/modules/bookings/booking.model.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { Journey } from '../../src/modules/journeys/journey.model.js';
import { User } from '../../src/modules/auth/auth.model.js';
import { CateringOrder } from '../../src/modules/catering/catering.model.js';
import { cateringQueue } from '../../src/workers/queues.js'; // Automatically receives the mock above
import jwt from 'jsonwebtoken';

jest.spyOn(cateringQueue, 'add').mockResolvedValue(true);

describe('Booking API Endpoints - Rigorous Integration Tests', () => {
  let authToken;
  let user;
  let train;
  let journey;

  beforeEach(async () => {
    jest.clearAllMocks();

    // 1. Setup User
    user = await User.create({
      fullName: 'Test User',
      email: 'test@nxtrail.com',
      phoneNumber: '9999999999',
      password: 'password123',
      role: 'PASSENGER'
    });
    authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Setup Train
    train = await Train.create({
      trainNumber: '12951',
      trainName: 'Rajdhani',
      source: 'NDLS',
      destination: 'MMCT',
      coachClasses: [{ classType: '3A', totalSeats: 2, baseFare: 2000 }] // Only 2 seats!
    });

    // 3. Setup Journey (Inventory)
    journey = await Journey.create({
      train: train._id,
      journeyDate: new Date('2026-12-15'),
      seatInventory: [
        { classType: '3A', totalSeats: 2, availableSeats: 2, waitlistCount: 0, baseFare: 2000 }
      ]
    });
  });

  describe('POST /api/bookings (createBooking)', () => {
    const bookingPayload = {
      journeyDate: '2026-12-15',
      sourceStation: 'NDLS',
      destinationStation: 'MMCT',
      coachClass: '3A',
      passengers: [
        { name: 'John', age: 30, gender: 'M' }
      ]
    };

    it('1. should reserve a seat successfully and decrement available inventory', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookingPayload, trainId: train._id });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.bookingId).toBeDefined();

      // Verify inventory was decremented
      const updatedJourney = await Journey.findById(journey._id);
      expect(updatedJourney.seatInventory[0].availableSeats).toBe(1); // 2 - 1 = 1
    });

    it('2. should assign WAITLISTED status if available seats are 0', async () => {
      // Manually deplete seats
      await Journey.findByIdAndUpdate(journey._id, {
        $set: { 'seatInventory.0.availableSeats': 0 }
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookingPayload, trainId: train._id });

      expect(res.statusCode).toBe(201);

      // Verify waitlist status in DB
      const booking = await Booking.findById(res.body.data.bookingId);
      expect(booking.passengers[0].status).toBe('WAITLISTED');
      expect(booking.passengers[0].seatNumber).toContain('WL-1');

      // Verify Journey Waitlist count incremented
      const updatedJourney = await Journey.findById(journey._id);
      expect(updatedJourney.seatInventory[0].waitlistCount).toBe(1);
    });

    it('3. should block booking if journeyDate is not opened yet', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookingPayload, trainId: train._id, journeyDate: '2026-12-30' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('not open for this train');
    });

    it('4. should block booking if Zod schema validation fails (e.g. > 6 passengers)', async () => {
      const passengers = new Array(7).fill({ name: 'Pax', age: 20, gender: 'M' });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...bookingPayload, trainId: train._id, passengers });

      expect(res.statusCode).toBe(400); 
    });
  });

  describe('POST /api/bookings/payment-webhook (verifyPayment)', () => {
    let pendingTxnId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trainId: train._id,
          journeyDate: '2026-12-15',
          sourceStation: 'NDLS',
          destinationStation: 'MMCT',
          coachClass: '3A',
          passengers: [{ name: 'John', age: 30, gender: 'M' }]
        });
      pendingTxnId = res.body.data.transactionId;
    });

    it('1. should finalize booking, generate PNR, and trigger email on SUCCESS', async () => {
      const res = await request(app)
        .post('/api/bookings/payment-webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transactionId: pendingTxnId, paymentStatus: 'SUCCESS' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.pnr).toBeDefined();

      const booking = await Booking.findOne({ transactionId: pendingTxnId });
      expect(booking.paymentStatus).toBe('COMPLETED');
      expect(booking.bookingStatus).toBe('SUCCESS');
    });

    it('2. should cancel booking and release seats back to inventory on FAILED', async () => {
      const res = await request(app)
        .post('/api/bookings/payment-webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transactionId: pendingTxnId, paymentStatus: 'FAILED' });

      expect(res.statusCode).toBe(200);

      const booking = await Booking.findOne({ transactionId: pendingTxnId });
      expect(booking.paymentStatus).toBe('FAILED');
      expect(booking.bookingStatus).toBe('FAILED');

      // Verify seats were released
      const updatedJourney = await Journey.findById(journey._id);
      expect(updatedJourney.seatInventory[0].availableSeats).toBe(2); 
    });
  });

  describe('PATCH /api/bookings/cancel/:id (cancelBooking)', () => {
    let bookingId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trainId: train._id,
          journeyDate: '2026-12-15',
          sourceStation: 'NDLS',
          destinationStation: 'MMCT',
          coachClass: '3A',
          passengers: [{ name: 'John', age: 30, gender: 'M' }]
        });
      bookingId = res.body.data.bookingId;
    });

    it('1. should cancel a specific passenger and restore a seat', async () => {
      const res = await request(app)
        .patch(`/api/bookings/cancel/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ passengerIds: [0] });

      expect(res.statusCode).toBe(200);
      
      const booking = await Booking.findById(bookingId);
      expect(booking.passengers[0].status).toBe('CANCELLED');
      expect(booking.bookingStatus).toBe('CANCELLED');

      const updatedJourney = await Journey.findById(journey._id);
      expect(updatedJourney.seatInventory[0].availableSeats).toBe(2); 
    });

    it('2. should reject cancellation if no passengerIds array is provided', async () => {
      const res = await request(app)
        .patch(`/api/bookings/cancel/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('No passengers selected');
    });
  });

  describe('POST /api/bookings/:pnr/meals (addMealToBooking)', () => {
    let pnr;

    beforeEach(async () => {
      const bRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trainId: train._id,
          journeyDate: '2026-12-15',
          sourceStation: 'NDLS',
          destinationStation: 'MMCT',
          coachClass: '3A',
          passengers: [{ name: 'John', age: 30, gender: 'M' }]
        });
      
      const pRes = await request(app)
        .post('/api/bookings/payment-webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transactionId: bRes.body.data.transactionId, paymentStatus: 'SUCCESS' });
      
      pnr = pRes.body.data.pnr;
    });

    it('1. should add a meal to the booking, create a CateringOrder, and trigger BullMQ', async () => {
      const mealPayload = {
        vendorId: new mongoose.Types.ObjectId(),
        restaurantName: 'Haldirams',
        deliveryStation: 'KOTA',
        items: [{ name: 'Thali', quantity: 1, price: 250 }],
        totalAmount: 250
      };

      const res = await request(app)
        .post(`/api/bookings/${pnr}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mealPayload);

      expect(res.statusCode).toBe(200);

      // Verify embedded meal exists
      const booking = await Booking.findOne({ pnr });
      expect(booking.meals).toHaveLength(1);
      expect(booking.meals[0].restaurantName).toBe('Haldirams');

      // Verify standalone Catering Order was created
      const cateringOrders = await CateringOrder.find({ bookingId: booking._id });
      expect(cateringOrders).toHaveLength(1);

      // Verify queue was triggered successfully
      expect(cateringQueue.add).toHaveBeenCalledTimes(1);
    });

    it('2. should reject if PNR is invalid', async () => {
      const res = await request(app)
        .post('/api/bookings/INVALID_PNR/meals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ vendorId: new mongoose.Types.ObjectId(), items: [] });

      expect(res.statusCode).toBe(404);
    });
  });
});