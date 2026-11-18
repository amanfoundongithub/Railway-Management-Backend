import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { Journey } from '../../src/modules/journeys/journey.model.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { User } from '../../src/modules/auth/auth.model.js'; // Adjust if needed
import jwt from 'jsonwebtoken';

describe('Journey API Endpoints - Rigorous Integration Tests', () => {
  let adminToken;
  let passengerToken;
  let trainId;

  // We use beforeEach to ensure users and master train are reset after the DB wipes
  beforeEach(async () => {
    // 1. Setup Admin User
    const adminUser = await User.create({
      fullName: 'System Admin',
      email: 'admin@nxtrail.com',
      phoneNumber: '9999999999',
      password: 'adminPassword123',
      role: 'ADMIN' 
    });
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Setup Normal Passenger User
    const passengerUser = await User.create({
      fullName: 'Normal Passenger',
      email: 'passenger@nxtrail.com',
      phoneNumber: '8888888888',
      password: 'userPassword123',
      role: 'PASSENGER' 
    });
    passengerToken = jwt.sign({ id: passengerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Setup a Master Train (Needed by createJourney controller)
    const train = await Train.create({
      trainNumber: '12951',
      trainName: 'Rajdhani Express',
      source: 'NDLS',
      destination: 'MMCT',
      route: [
        { stationCode: 'NDLS', stationName: 'New Delhi', arrivalTime: '16:25', departureTime: '16:25', distanceFromSource: 0 }
      ],
      coachClasses: [
        { classType: '1A', totalSeats: 48, baseFare: 4500 },
        { classType: '3A', totalSeats: 144, baseFare: 2000 }
      ]
    });
    trainId = train._id.toString();
  });

  describe('POST /api/journeys (createJourney)', () => {
    it('1. should create a journey and copy master inventory successfully as an ADMIN', async () => {
      const payload = {
        trainId,
        journeyDate: '2026-12-15'
      };

      const res = await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      
      const journey = res.body.data.journey;
      expect(journey.train).toBe(trainId);
      expect(journey.seatInventory.length).toBe(2);
      
      // Verify business logic: totalSeats maps to availableSeats
      expect(journey.seatInventory[0].classType).toBe('1A');
      expect(journey.seatInventory[0].totalSeats).toBe(48);
      expect(journey.seatInventory[0].availableSeats).toBe(48);
      expect(journey.seatInventory[0].baseFare).toBe(4500);
      expect(journey.seatInventory[0].waitlistCount).toBe(0);
    });

    it('2. should block a PASSENGER from creating a journey', async () => {
      const res = await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ trainId, journeyDate: '2026-12-15' });

      expect(res.statusCode).toBe(403);
    });

    it('3. should reject if the journey already exists for that date', async () => {
      // Create first time
      await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainId, journeyDate: '2026-12-15' });

      // Create second time with identical data
      const res = await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainId, journeyDate: '2026-12-15' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already initialized');
    });

    it('4. should return 404 if the requested Train ID does not exist', async () => {
      const fakeTrainId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainId: fakeTrainId, journeyDate: '2026-12-15' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Train not found');
    });

    it('5. should trigger schema validation if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainId }); // Missing journeyDate

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('GET /api/journeys/availability (checkAvailability)', () => {
    beforeEach(async () => {
      // Seed a journey into the database using the Admin route
      await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainId, journeyDate: '2026-12-15' });
    });

    it('1. should return live availability (publicly accessible) for a valid journey', async () => {
      const res = await request(app).get('/api/journeys/availability').query({
        trainId: trainId,
        date: '2026-12-15'
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      
      // Verify populate('train') worked
      expect(res.body.data.trainName).toBe('Rajdhani Express');
      expect(res.body.data.trainNumber).toBe('12951');
      
      // Verify inventory payload
      expect(res.body.data.availability.length).toBe(2);
      expect(res.body.data.availability[0].availableSeats).toBe(48);
    });

    it('2. should return 404 if no journey is scheduled for the requested date', async () => {
      const res = await request(app).get('/api/journeys/availability').query({
        trainId: trainId,
        date: '2026-12-25' // No journey exists for this date
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('No journey scheduled');
    });

    it('3. should let global error handler catch missing query params', async () => {
      // Depending on your validation middleware (e.g. Zod on GET requests) or Mongoose throwing CastError
      const res = await request(app).get('/api/journeys/availability').query({
        // Missing trainId and date
      });

      // Usually CastError from Mongoose mapping undefined to ObjectId -> 400 Bad Request
      expect([400, 404, 500]).toContain(res.statusCode); 
    });
  });
});