import bcrypt from 'bcryptjs';
import { User } from '../../src/modules/auth/auth.model.js';

describe('User Model - Robust Unit Tests', () => {
  describe('Schema Validations', () => {
    it('should validate a correct user model', () => {
      const validUser = new User({
        fullName: 'Aman Raj',
        email: 'aman@example.com',
        phoneNumber: '9876543210',
        password: 'securePassword123'
      });
      const error = validUser.validateSync();
      expect(error).toBeUndefined();
    });

    it('should fail if required fields are missing', () => {
      const invalidUser = new User({});
      const error = invalidUser.validateSync();
      
      expect(error.errors.fullName).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.phoneNumber).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it('should enforce email format', () => {
      const user = new User({ email: 'invalid-email' });
      const error = user.validateSync();
      expect(error.errors.email.message).toBe('Please provide a valid email address');
    });

    it('should enforce Indian 10-digit phone number format', () => {
      // Too short
      let user = new User({ phoneNumber: '98765' });
      expect(user.validateSync().errors.phoneNumber.message).toBe('Please provide a valid 10-digit mobile number');

      // Starts with invalid digit (e.g., 5)
      user = new User({ phoneNumber: '5876543210' });
      expect(user.validateSync().errors.phoneNumber.message).toBe('Please provide a valid 10-digit mobile number');
    });

    it('should enforce masterList gender enum', () => {
      const user = new User({
        masterList: [{ name: 'Ravi', age: 30, gender: 'X' }] // 'X' is invalid
      });
      const error = user.validateSync();
      expect(error.errors['masterList.0.gender']).toBeDefined();
    });
  });

  describe('Pre-Save Hooks (Password Hashing)', () => {
    it('should hash the password before saving to the database', async () => {
      const plainPassword = 'mySuperSecretPassword';
      const user = await User.create({
        fullName: 'Test User',
        email: 'hash@test.com',
        phoneNumber: '9999999999',
        password: plainPassword
      });

      const savedUser = await User.findById(user._id).select('+password');      
      expect(savedUser.password).not.toBe(plainPassword);
      const isMatch = await bcrypt.compare(plainPassword, savedUser.password);
      expect(isMatch).toBe(true);
    });

    it('should set passwordChangedAt when password is updated', async () => {
      const user = await User.create({
        fullName: 'Update User',
        email: 'update@test.com',
        phoneNumber: '8888888888',
        password: 'initialPassword123'
      });

      expect(user.passwordChangedAt).toBeUndefined(); 
      user.password = 'newPassword456';
      await user.save();
      expect(user.passwordChangedAt).toBeDefined();
      expect(user.passwordChangedAt).toBeInstanceOf(Date);
    });
  });

  // --- 3. INSTANCE METHODS TESTS ---
  describe('Instance Methods', () => {
    it('should correctly verify passwords using correctPassword()', async () => {
      const user = await User.create({
        fullName: 'Verify User',
        email: 'verify@test.com',
        phoneNumber: '7777777777',
        password: 'testPassword!23'
      });

      // Need to grab the hash directly from DB
      const savedUser = await User.findById(user._id).select('+password');

      const isCorrect = await savedUser.correctPassword('testPassword!23', savedUser.password);
      const isWrong = await savedUser.correctPassword('wrongPassword', savedUser.password);

      expect(isCorrect).toBe(true);
      expect(isWrong).toBe(false);
    });

    it('should accurately report if password changed after token was issued', async () => {
      const user = await User.create({
        fullName: 'JWT User',
        email: 'jwt@test.com',
        phoneNumber: '6666666666',
        password: 'testPassword!23'
      });

      // Simulate a JWT issued right now
      const jwtTimestamp = Math.floor(Date.now() / 1000);

      // Change password
      user.password = 'newPassword';
      await user.save(); // This updates passwordChangedAt to Date.now() - 1000ms

      // Simulate an old JWT issued 10 seconds before the password change
      const oldJwtTimestamp = jwtTimestamp - 10;
      expect(user.changedPasswordAfter(oldJwtTimestamp)).toBe(true); // Token is older than change -> True (reject token)

      // Simulate a new JWT issued 10 seconds after the password change
      const newJwtTimestamp = jwtTimestamp + 10;
      expect(user.changedPasswordAfter(newJwtTimestamp)).toBe(false); // Token is newer than change -> False (accept token)
    });
  });

  // --- 4. QUERY MIDDLEWARE TESTS ---
  describe('Query Middleware (find, findOne)', () => {
    it('should filter out inactive users automatically', async () => {
      // Create one active and one inactive user
      await User.create({
        fullName: 'Active User',
        email: 'active@test.com',
        phoneNumber: '9111111111',
        password: 'password123',
        isActive: true
      });

      const inactiveUser = await User.create({
        fullName: 'Inactive User',
        email: 'inactive@test.com',
        phoneNumber: '9222222222',
        password: 'password123'
      });

      // Manually set isActive to false and save (simulating a soft-delete)
      inactiveUser.isActive = false;
      await inactiveUser.save();

      // Run a standard find query
      const users = await User.find();

      expect(users.length).toBe(1);
      expect(users[0].email).toBe('active@test.com');
      
      // Attempt to find the inactive user specifically
      const notFound = await User.findOne({ email: 'inactive@test.com' });
      expect(notFound).toBeNull();
    });
  });
});