import { Train } from '../../src/modules/trains/train.model.js';
describe('Train Model - Rigorous Unit Tests', () => {
  // Reusable valid payload to keep tests DRY
  const validTrainPayload = {
    trainNumber: '12951',
    trainName: 'Rajdhani Express',
    source: 'ndls', // Intentionally lowercase to test the uppercase mutator later
    destination: 'mmct',
    route: [
      {
        stationCode: 'ndls',
        stationName: 'New Delhi',
        arrivalTime: '16:25',
        departureTime: '16:25',
        distanceFromSource: 0,
        // dayCounter is omitted to test default value
      },
      {
        stationCode: 'mmct',
        stationName: 'Mumbai Central',
        arrivalTime: '08:15',
        departureTime: '08:15',
        distanceFromSource: 1386,
        dayCounter: 2
      }
    ],
    coachClasses: [
      {
        classType: '1A',
        totalSeats: 48,
        baseFare: 4500
      },
      {
        classType: '3A',
        totalSeats: 144,
        baseFare: 2000
      }
    ]
  };

  // --- 1. SYNCHRONOUS SCHEMA VALIDATIONS (No DB required) ---
  describe('Schema Validations & Constraints', () => {
    it('1. should validate a completely valid train model', () => {
      const train = new Train(validTrainPayload);
      const error = train.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should fail if root required fields are missing', () => {
      const train = new Train({});
      const error = train.validateSync();

      expect(error.errors.trainNumber).toBeDefined();
      expect(error.errors.trainName).toBeDefined();
      expect(error.errors.source).toBeDefined();
      expect(error.errors.destination).toBeDefined();
    });

    it('3. should enforce Coach Class enum constraint', () => {
      const train = new Train({
        ...validTrainPayload,
        coachClasses: [{ classType: 'INVALID_CLASS', totalSeats: 50, baseFare: 500 }]
      });
      const error = train.validateSync();
      
      expect(error.errors['coachClasses.0.classType']).toBeDefined();
      expect(error.errors['coachClasses.0.classType'].message).toContain('is not a valid enum value');
    });

    it('4. should enforce numeric boundaries (min: 0) on Coach Classes', () => {
      const train = new Train({
        ...validTrainPayload,
        coachClasses: [{ classType: 'SL', totalSeats: -10, baseFare: -500 }]
      });
      const error = train.validateSync();

      expect(error.errors['coachClasses.0.totalSeats'].message).toContain('is less than minimum allowed value (0)');
      expect(error.errors['coachClasses.0.baseFare'].message).toContain('is less than minimum allowed value (0)');
    });

    it('5. should enforce required fields inside the embedded Route (StationStop) array', () => {
      const train = new Train({
        ...validTrainPayload,
        route: [{
          // Missing stationCode, arrivalTime, departureTime, distanceFromSource
          stationName: 'Ghost Station' 
        }]
      });
      const error = train.validateSync();

      expect(error.errors['route.0.stationCode']).toBeDefined();
      expect(error.errors['route.0.arrivalTime']).toBeDefined();
      expect(error.errors['route.0.departureTime']).toBeDefined();
      expect(error.errors['route.0.distanceFromSource']).toBeDefined();
    });
  });

  // --- 2. ASYNC DATABASE TESTS (Tests Defaults, Modifiers, and Indexes) ---
  describe('Database Interactions (Defaults & Modifiers)', () => {
    it('1. should apply default values automatically on save', async () => {
      const train = await Train.create(validTrainPayload);

      // Root schema defaults
      expect(train.isActive).toBe(true);
      expect(train.runningDays).toEqual([0, 1, 2, 3, 4, 5, 6]);

      // Embedded schema defaults (First stop dayCounter)
      expect(train.route[0].dayCounter).toBe(1);
    });

    it('2. should apply uppercase and trim modifiers automatically on save', async () => {
      const messyPayload = {
        ...validTrainPayload,
        trainNumber: '  12952  ', // Should trim
        source: ' hwh ',           // Should trim and uppercase
        destination: 'cstm',       // Should uppercase
        route: [{
          ...validTrainPayload.route[0],
          stationCode: ' ndls '    // Should trim and uppercase
        }]
      };

      const train = await Train.create(messyPayload);

      expect(train.trainNumber).toBe('12952');
      expect(train.source).toBe('HWH');
      expect(train.destination).toBe('CSTM');
      expect(train.route[0].stationCode).toBe('NDLS');
    });

    it('3. should throw a MongoDB duplicate key error if trainNumber is not unique', async () => {
      // FIX: Force Mongoose to finish building the unique index before we test!
      await Train.init(); 

      // Save the first train successfully
      await Train.create(validTrainPayload);

      // Attempt to save a second train with the exact same trainNumber
      let error;
      try {
        await Train.create({
          ...validTrainPayload,
          trainName: 'A Different Train But Same Number'
        });
      } catch (err) {
        error = err;
      }

      // Assert that Mongoose threw an error
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); 
      expect(error.message).toContain('trainNumber_1 dup key');
    });
  });
});