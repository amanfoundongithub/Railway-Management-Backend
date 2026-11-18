import request from 'supertest';
import app from '../../src/app.js';
import { Station } from '../../src/modules/stations/station.model.js'; // Adjust path
import { User } from '../../src/modules/auth/auth.model.js'; // Adjust path
import jwt from 'jsonwebtoken';

describe('Station API Endpoints - Rigorous Integration Tests', () => {
  let adminToken;
  let passengerToken;

  // We use beforeEach so the Users are recreated after the DB wipe
  beforeEach(async () => {
    // 1. Create Admin User
    const adminUser = await User.create({
      fullName: 'System Admin',
      email: 'admin@nxtrail.com',
      phoneNumber: '9999999999',
      password: 'adminPassword123',
      role: 'ADMIN' 
    });
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Create Normal Passenger User
    const passengerUser = await User.create({
      fullName: 'Normal Passenger',
      email: 'passenger@nxtrail.com',
      phoneNumber: '8888888888',
      password: 'userPassword123',
      role: 'PASSENGER' 
    });
    passengerToken = jwt.sign({ id: passengerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  const mockStationPayload = {
    stationCode: 'HYB',
    stationName: 'Hyderabad Deccan',
    zone: 'SCR',
    state: 'Telangana',
    numberOfPlatforms: 6,
    coordinates: {
      lat: 17.3916,
      lng: 78.4760
    }
  };

  describe('POST /api/stations (createStation)', () => {
    it('1. should create a new station successfully as an ADMIN', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockStationPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.station.stationCode).toBe('HYB');
    });

    it('2. should reject if station code already exists', async () => {
      // Seed first
      await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockStationPayload);
      
      // Attempt duplicate
      const duplicateStation = { ...mockStationPayload, stationName: 'Duplicate Name' };
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateStation);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('already exists');
    });

    it('3. should block a normal PASSENGER from creating a station (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send(mockStationPayload);

      expect(res.statusCode).toBe(403);
    });

    it('4. should catch Mongoose schema validation errors (e.g., lat > 90)', async () => {
      const invalidStation = {
        ...mockStationPayload,
        coordinates: { lat: 100, lng: 78.4760 } // Latitude cannot exceed 90
      };
      
      const res = await request(app)
        .post('/api/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidStation);

      // Global error handler or validateRequest catches this
      expect(res.statusCode).toBe(400); 
      expect(res.body.status).toBe('fail');
    });
  });

  describe('GET /api/stations/search (searchStations)', () => {
    beforeEach(async () => {
      // Seed a few stations
      await Station.create([
        mockStationPayload,
        {
          stationCode: 'SC',
          stationName: 'Secunderabad Junction',
          zone: 'SCR',
          state: 'Telangana',
          coordinates: { lat: 17.4330, lng: 78.5016 }
        },
        {
          stationCode: 'NDLS',
          stationName: 'New Delhi',
          zone: 'NR',
          state: 'Delhi',
          coordinates: { lat: 28.6429, lng: 77.2191 },
          isActive: false // Inactive station
        }
      ]);
    });

    it('1. should find a station by partial station code', async () => {
      const res = await request(app).get('/api/stations/search').query({ query: 'hy' });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.stations[0].stationCode).toBe('HYB');
    });

    it('2. should find a station by partial station name', async () => {
      const res = await request(app).get('/api/stations/search').query({ query: 'secunder' });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.stations[0].stationCode).toBe('SC');
    });

    it('3. should exclude inactive stations from search results', async () => {
      const res = await request(app).get('/api/stations/search').query({ query: 'delhi' });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(0); // NDLS is inactive, should not show up
    });

    it('4. should require a valid query parameter', async () => {
      const res = await request(app).get('/api/stations/search'); // Missing query

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('at least 2 characters');
    });
  });

  describe('PATCH /api/stations/:stationCode/coordinates (updateStationCoordinates)', () => {
    beforeEach(async () => {
      await Station.create(mockStationPayload);
    });

    it('1. should update coordinates successfully as an ADMIN', async () => {
      const res = await request(app)
        .patch('/api/stations/hyb/coordinates') // Testing lowercase URL param
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lat: 17.5, lng: 78.5 });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.station.coordinates.lat).toBe(17.5);
    });

    it('2. should return 400 if lat or lng is missing', async () => {
      const res = await request(app)
        .patch('/api/stations/HYB/coordinates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lat: 17.5 }); // Missing lng

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Both lat and lng are required');
    });

    it('3. should return 404 for an unknown station code', async () => {
      const res = await request(app)
        .patch('/api/stations/UNKNOWN/coordinates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lat: 17.5, lng: 78.5 });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('4. should trigger Mongoose runValidators if updating to invalid bounds', async () => {
      const res = await request(app)
        .patch('/api/stations/HYB/coordinates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lat: 17.5, lng: 200 }); // lng max is 180

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });

    it('5. should block a normal PASSENGER from updating coordinates', async () => {
      const res = await request(app)
        .patch('/api/stations/HYB/coordinates')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ lat: 17.5, lng: 78.5 });

      expect(res.statusCode).toBe(403);
    });
  });
});