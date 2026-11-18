import mongoose from 'mongoose';
import { Journey } from '../../src/modules/journeys/journey.model.js'; // Adjust path if needed

describe('Journey Model - Rigorous Unit Tests', () => {
  const mockTrainId = new mongoose.Types.ObjectId();

  const validJourneyPayload = {
    train: mockTrainId,
    journeyDate: new Date('2026-12-15'),
    seatInventory: [
      {
        classType: '3A',
        totalSeats: 144,
        availableSeats: 144,
        baseFare: 2000
      },
      {
        classType: 'SL',
        totalSeats: 300,
        availableSeats: 300,
        baseFare: 800
      }
    ]
  };

  describe('Schema Validations & Constraints', () => {
    it('1. should validate a completely valid journey model', () => {
      const journey = new Journey(validJourneyPayload);
      const error = journey.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should fail if required root fields are missing', () => {
      const journey = new Journey({});
      const error = journey.validateSync();

      expect(error.errors.train).toBeDefined();
      expect(error.errors.journeyDate).toBeDefined();
    });

    it('3. should enforce classType enum in seatInventory', () => {
      const journey = new Journey({
        ...validJourneyPayload,
        seatInventory: [{
          classType: 'INVALID_CLASS', 
          totalSeats: 100, 
          availableSeats: 100 
        }]
      });
      const error = journey.validateSync();

      expect(error.errors['seatInventory.0.classType'].message).toContain('is not a valid enum value');
    });

    it('4. should fail if required seatInventory fields are missing', () => {
      const journey = new Journey({
        ...validJourneyPayload,
        seatInventory: [{ classType: '1A' }] // Missing totalSeats and availableSeats
      });
      const error = journey.validateSync();

      expect(error.errors['seatInventory.0.totalSeats']).toBeDefined();
      expect(error.errors['seatInventory.0.availableSeats']).toBeDefined();
    });

    it('5. should enforce status enum constraint', () => {
      const journey = new Journey({
        ...validJourneyPayload,
        status: 'DELAYED_BEYOND_REPAIR' // Not in enum
      });
      const error = journey.validateSync();

      expect(error.errors.status.message).toContain('is not a valid enum value');
    });
  });

  describe('Database Interactions (Defaults & Indexes)', () => {
    it('1. should apply defaults (status, waitlistCount) automatically on save', async () => {
      const journey = await Journey.create(validJourneyPayload);

      expect(journey.status).toBe('SCHEDULED');
      expect(journey.seatInventory[0].waitlistCount).toBe(0);
    });

    it('2. should throw a duplicate key error for same train on the same date', async () => {
      // Create first journey
      await Journey.create(validJourneyPayload);

      let error;
      try {
        // Attempt to create second journey for the exact same train and date
        await Journey.create(validJourneyPayload);
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error code
      // Ensures the error originated from the compound index on train & journeyDate
      expect(error.message).toContain('train_1_journeyDate_1 dup key');
    });

    it('3. should allow the same train on a DIFFERENT date', async () => {
      await Journey.create(validJourneyPayload);

      const nextDayJourney = await Journey.create({
        ...validJourneyPayload,
        journeyDate: new Date('2026-12-16') // Next day
      });

      expect(nextDayJourney._id).toBeDefined();
      expect(nextDayJourney.journeyDate.toISOString()).toContain('2026-12-16');
    });
  });
});