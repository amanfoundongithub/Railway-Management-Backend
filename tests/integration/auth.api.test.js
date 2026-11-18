import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/modules/auth/auth.model.js'; // Adjust path if needed

describe('Auth API Endpoints - Rigorous Tests', () => {
  const validUser = {
    fullName: 'Aman Raj',
    email: 'aman@example.com',
    phoneNumber: '9876543210',
    password: 'securePassword123',
  };

  describe('POST /api/auth/register', () => {
    it('1. should successfully register a valid user and return a JWT without the password', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('2. should fail if the email already exists', async () => {
      await request(app).post('/api/auth/register').send(validUser);
      
      // Attempt duplicate email, different phone
      const duplicateEmailUser = { ...validUser, phoneNumber: '9112223334' };
      const res = await request(app).post('/api/auth/register').send(duplicateEmailUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

    it('3. should fail if the phone number already exists', async () => {
      await request(app).post('/api/auth/register').send(validUser);
      
      // Attempt duplicate phone, different email
      const duplicatePhoneUser = { ...validUser, email: 'new@example.com' };
      const res = await request(app).post('/api/auth/register').send(duplicatePhoneUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

    it('4. should fail Mongoose validation if required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'Missing Data' // Missing email, phone, password
      });

      // Based on your global error handler, this might be 500 or 400, 
      // but it definitely should NOT be 201. We check that it fails safely.
expect(res.statusCode).toBe(400);      expect(res.body.status).toBe('fail');
    });

    it('5. should fail if the password is too short', async () => {
      const res = await request(app).post('/api/auth/register').send({
        ...validUser,
        password: 'short'
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
expect(res.body.message).toContain('Invalid request');
expect(res.body.errors).toBeDefined();    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('1. should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('2. should reject login with an incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'wrongPassword123',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('3. should reject login with an unregistered email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'password123',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Incorrect email or password');
    });
  });

  describe('Protected Routes (Requires JWT Token)', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);
      token = res.body.token;
      userId = res.body.data.user._id;
    });

    describe('GET /api/auth/me', () => {
      it('1. should return the logged-in user profile', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.user.email).toBe(validUser.email);
      });

      it('2. should block access if no token is provided', async () => {
        const res = await request(app).get('/api/auth/me'); // No header

        expect(res.statusCode).toBe(401); // Assumes protect middleware returns 401
      });

      it('3. should block access if token is invalid/tampered', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer fake-tampered-token-123');

        expect(res.statusCode).toBe(401);
      });

      it('4. should return 404 if the token is valid but the user was deleted from DB', async () => {
        // Manually delete the user directly from the database
        await User.findByIdAndDelete(userId);

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        // Depends on how your protect middleware handles deleted users, 
        // but your getMe controller also explicitly returns 404 if not found.
        expect([401, 404]).toContain(res.statusCode); 
      });
    });

    describe('PUT /api/auth/master-list', () => {
      const passenger = { name: 'Rahul', age: 30, gender: 'M' };

      it('1. should add a passenger to the master list successfully', async () => {
        const res = await request(app)
          .put('/api/auth/master-list')
          .set('Authorization', `Bearer ${token}`)
          .send({ action: 'add', passenger });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.masterList).toHaveLength(1);
        expect(res.body.data.masterList[0].name).toBe('Rahul');
      });

      it('2. should remove a passenger from the master list successfully', async () => {
        // First add the passenger
        const addRes = await request(app)
          .put('/api/auth/master-list')
          .set('Authorization', `Bearer ${token}`)
          .send({ action: 'add', passenger });
        
        const addedPassengerId = addRes.body.data.masterList[0]._id;

        // Now remove the passenger using their generated _id
        const removeRes = await request(app)
          .put('/api/auth/master-list')
          .set('Authorization', `Bearer ${token}`)
          .send({ 
            action: 'remove', 
            passenger: { _id: addedPassengerId } 
          });

        expect(removeRes.statusCode).toBe(200);
        expect(removeRes.body.data.masterList).toHaveLength(0);
      });

      it('3. should reject the request if not authenticated', async () => {
        const res = await request(app)
          .put('/api/auth/master-list')
          .send({ action: 'add', passenger });

        expect(res.statusCode).toBe(401);
      });
    });
  });
});