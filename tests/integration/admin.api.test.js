import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { Train } from '../../src/modules/trains/train.model.js';
import { User } from '../../src/modules/auth/auth.model.js';
import { Booking } from '../../src/modules/bookings/booking.model.js';
import jwt from 'jsonwebtoken';

describe('Admin API Endpoints - Rigorous Integration Tests', () => {
  let adminToken;
  let passengerToken;
  let passengerUser; // Store reference to use its _id

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
    passengerUser = await User.create({
      fullName: 'Normal Passenger',
      email: 'passenger@nxtrail.com',
      phoneNumber: '8888888888',
      password: 'userPassword123',
      role: 'PASSENGER'
    });
    passengerToken = jwt.sign({ id: passengerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('1. should block normal PASSENGER from accessing admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('2. should allow ADMIN to access admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('GET /api/admin/dashboard-stats (getDashboardStats)', () => {
    it('1. should calculate system metrics and revenue correctly', async () => {
      // Seed Active Trains
      await Train.create([
        { trainNumber: '12951', trainName: 'Rajdhani', source: 'NDLS', destination: 'MMCT', isActive: true, coachClasses: [{ classType: '3A', totalSeats: 100, baseFare: 2000 }] },
        { trainNumber: '12952', trainName: 'Tejas', source: 'MMCT', destination: 'NDLS', isActive: false, coachClasses: [{ classType: '3A', totalSeats: 100, baseFare: 2000 }] }
      ]);

      // Seed Additional Passengers (Users with role 'PASSENGER')
      await User.create([
        { fullName: 'P1', email: 'p1@test.com', phoneNumber: '9876543210', password: 'password123', role: 'PASSENGER' },
        { fullName: 'P2', email: 'p2@test.com', phoneNumber: '9876543211', password: 'password123', role: 'PASSENGER' }
      ]);

      // Seed Successful Booking within last 30 days
      const train = await Train.findOne({ trainNumber: '12951' });
      await Booking.create({
        user: passengerUser._id, // FIX: Pass a valid Mongoose ObjectId instead of a function
        train: train._id,
        journeyDate: new Date(),
        sourceStation: 'NDLS',
        destinationStation: 'MMCT',
        coachClass: '3A',
        passengers: [
          { name: 'John', age: 30, gender: 'M', status: 'CONFIRMED' },
          { name: 'Doe', age: 25, gender: 'F', status: 'CONFIRMED' }
        ],
        totalFare: 4000,
        bookingStatus: 'SUCCESS',
        paymentStatus: 'COMPLETED'
      });

      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.activeTrains).toBe(1); // Only 1 is active
      expect(res.body.data.totalUsers).toBe(3); // 2 seeded + 1 from beforeEach
      expect(res.body.data.revenue).toBe(4000);
      expect(res.body.data.ticketsBooked).toBe(2); // 2 passengers in the booking
    });
  });

  describe('GET /api/admin/inventory (getTrainInventory)', () => {
    beforeEach(async () => {
      // Seed multiple trains for pagination & search tests
      await Train.create([
        { trainNumber: '12951', trainName: 'Rajdhani Express', source: 'NDLS', destination: 'MMCT', isActive: true, coachClasses: [{ classType: '3A', totalSeats: 100, baseFare: 2000 }] },
        { trainNumber: '12952', trainName: 'Mumbai Rajdhani', source: 'MMCT', destination: 'NDLS', isActive: true, coachClasses: [{ classType: '3A', totalSeats: 150, baseFare: 2000 }] },
        { trainNumber: '12009', trainName: 'Shatabdi Express', source: 'BJU', destination: 'NDLS', isActive: false, coachClasses: [{ classType: 'CC', totalSeats: 200, baseFare: 1500 }] }
      ]);
    });

    it('1. should return paginated train inventory', async () => {
      const res = await request(app)
        .get('/api/admin/inventory')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.data.inventory.length).toBe(2); // Limited to 2
    });

    it('2. should filter inventory based on search query (trainNumber or trainName)', async () => {
      const res = await request(app)
        .get('/api/admin/inventory')
        .query({ search: 'Shatabdi' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data.inventory[0].trainName).toContain('Shatabdi');
    });
  });

  describe('PATCH /api/admin/trains/status/:id (toggleTrainStatus)', () => {
    let trainId;

    beforeEach(async () => {
      const train = await Train.create({
        trainNumber: '12951',
        trainName: 'Rajdhani',
        source: 'NDLS',
        destination: 'MMCT',
        isActive: true,
        coachClasses: [{ classType: '3A', totalSeats: 100, baseFare: 2000 }]
      });
      trainId = train._id;
    });

    it('1. should successfully toggle train active status', async () => {
      const res = await request(app)
        .patch(`/api/admin/trains/status/${trainId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('2. should return 404 if train ID does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/admin/trains/status/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Train not found');
    });
  });

  describe('PATCH /api/admin/trains/bulk-status (bulkToggleTrainStatus)', () => {
    let train1Id, train2Id;

    beforeEach(async () => {
      const t1 = await Train.create({
        trainNumber: '12951', trainName: 'T1', source: 'A', destination: 'B', isActive: true,
        coachClasses: [{ classType: '3A', totalSeats: 100, baseFare: 2000 }]
      });
      const t2 = await Train.create({
        trainNumber: '12952', trainName: 'T2', source: 'A', destination: 'B', isActive: false,
        coachClasses: [{ classType: '3A', totalSeats: 100, baseFare: 2000 }]
      });
      train1Id = t1._id;
      train2Id = t2._id;
    });

    it('1. should invert active status for multiple trains in bulk', async () => {
      const res = await request(app)
        .patch('/api/admin/trains/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainIds: [train1Id, train2Id] });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('2 trains updated');

      // Verify states inverted
      const updatedT1 = await Train.findById(train1Id);
      const updatedT2 = await Train.findById(train2Id);
      expect(updatedT1.isActive).toBe(false); // Was true
      expect(updatedT2.isActive).toBe(true);  // Was false
    });

    it('2. should reject if trainIds array is empty or missing', async () => {
      const res = await request(app)
        .patch('/api/admin/trains/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainIds: [] });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('No train IDs provided');
    });
  });
});