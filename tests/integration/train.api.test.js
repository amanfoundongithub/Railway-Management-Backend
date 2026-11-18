import request from 'supertest';
import app from '../../src/app.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { Journey } from '../../src/modules/journeys/journey.model.js';
import { User } from '../../src/modules/auth/auth.model.js'; // Adjust path if it's user.model.js
import jwt from 'jsonwebtoken';

describe('Trains API Endpoints - Rigorous Integration Tests', () => {
  let adminToken;

  // Set up a real Admin user before running the tests to pass the 'protect' middleware
  beforeEach(async () => {
    const adminUser = await User.create({
      fullName: 'System Admin',
      email: 'admin@nxtrail.com',
      phoneNumber: '9999999999',
      password: 'adminPassword123',
      role: 'ADMIN' // Matches restrictTo(USER_ROLES.ADMIN)
    });

    adminToken = jwt.sign(
      { id: adminUser._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
  });

  const mockTrainPayload = {
    trainNumber: '12951',
    trainName: 'Rajdhani Express',
    source: 'NDLS',
    destination: 'MMCT',
    route: [
      { stationCode: 'NDLS', stationName: 'New Delhi', arrivalTime: '16:25', departureTime: '16:25', distanceFromSource: 0, dayCounter: 1 },
      { stationCode: 'KOTA', stationName: 'Kota Junction', arrivalTime: '21:30', departureTime: '21:40', distanceFromSource: 466, dayCounter: 1 },
      { stationCode: 'MMCT', stationName: 'Mumbai Central', arrivalTime: '08:15', departureTime: '08:15', distanceFromSource: 1386, dayCounter: 2 }
    ],
    coachClasses: [
      { classType: '1A', totalSeats: 48, baseFare: 4500 },
      { classType: '3A', totalSeats: 144, baseFare: 2000 }
    ],
    isActive: true
  };

  describe('POST /api/trains (createTrain)', () => {
    it('1. should create a new train successfully as an ADMIN', async () => {
      const res = await request(app)
        .post('/api/trains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockTrainPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.train.trainNumber).toBe('12951');
    });

    it('2. should reject if train number already exists', async () => {
      // Seed first
      await request(app).post('/api/trains').set('Authorization', `Bearer ${adminToken}`).send(mockTrainPayload);
      
      // Attempt duplicate
      const duplicateTrain = { ...mockTrainPayload, trainName: 'Another Train' };
      const res = await request(app)
        .post('/api/trains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateTrain);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('already exists');
    });

    it('3. should let validateRequest catch schema errors (Zod/Joi)', async () => {
      const invalidPayload = { trainNumber: '99999' }; // Missing required fields
      const res = await request(app)
        .post('/api/trains')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });

    it('4. should block a normal user from creating a train (restrictTo middleware)', async () => {
      // Create a normal passenger user
      const normalUser = await User.create({
        fullName: 'Normal User',
        email: 'user@nxtrail.com',
        phoneNumber: '8888888888',
        password: 'password123',
        role: 'PASSENGER'
      });
      const normalToken = jwt.sign({ id: normalUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app)
        .post('/api/trains')
        .set('Authorization', `Bearer ${normalToken}`)
        .send(mockTrainPayload);

      expect(res.statusCode).toBe(403); // Forbidden
    });
  });

  describe('GET /api/trains/search (searchTrains)', () => {
    beforeEach(async () => {
      const train = await Train.create(mockTrainPayload);

      await Journey.create({
        train: train._id,
        journeyDate: new Date('2026-12-15T00:00:00.000Z'),
        seatInventory: mockTrainPayload.coachClasses.map(c => ({
          classType: c.classType,
          totalSeats: c.totalSeats,
          availableSeats: c.totalSeats,
          status: 'AVAILABLE'
        }))
      });
    });

    it('1. should find trains for a valid route and valid date', async () => {
      const res = await request(app).get('/api/trains/search').query({
        source: 'NDLS',
        destination: 'MMCT',
        date: '2026-12-15'
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(1);
    });

    it('2. should accurately offset the date based on dayCounter', async () => {
      const res = await request(app).get('/api/trains/search').query({
        source: 'KOTA', 
        destination: 'MMCT', 
        date: '2026-12-15' 
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(1);
    });

    it('3. should return empty results if no journey exists for that date', async () => {
      const res = await request(app).get('/api/trains/search').query({
        source: 'NDLS',
        destination: 'MMCT',
        date: '2026-12-25' 
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(0);
    });
  });

  // FIX: Path updated from /live to /live-status to match train.routes.js
  describe('GET /api/trains/live-status (getLiveTrainStatus)', () => {
    beforeEach(async () => {
      await Train.create(mockTrainPayload);
    });

    it('1. should return a mocked live route with delays for a valid train', async () => {
      const res = await request(app).get('/api/trains/live-status').query({
        trainNo: '12951',
        date: '2026-12-15'
      });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.number).toBe('12951');
    });

    it('2. should return 404 for an unknown train number', async () => {
      const res = await request(app).get('/api/trains/live-status').query({
        trainNo: '99999',
        date: '2026-12-15'
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Train not found');
    });

    it('3. should enforce required query parameters', async () => {
      const res = await request(app).get('/api/trains/live-status').query({});
      expect(res.statusCode).toBe(400);
    });
  });
});