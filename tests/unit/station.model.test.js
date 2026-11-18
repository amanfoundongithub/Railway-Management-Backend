import mongoose from 'mongoose';
import { Station } from '../../src/modules/stations/station.model.js'; // Adjust path if needed

describe('Station Model - Rigorous Unit Tests', () => {
  // Reusable valid payload
  const validStationPayload = {
    stationCode: 'HYB',
    stationName: 'Hyderabad Deccan',
    zone: 'SCR',
    state: 'Telangana',
    coordinates: {
      lat: 17.3916,
      lng: 78.4760
    }
  };

  // --- 1. SYNCHRONOUS SCHEMA VALIDATIONS (No DB required) ---
  describe('Schema Validations & Constraints', () => {
    it('1. should validate a completely valid station model', () => {
      const station = new Station(validStationPayload);
      const error = station.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should fail if required fields are missing', () => {
      const station = new Station({});
      const error = station.validateSync();

      expect(error.errors.stationCode).toBeDefined();
      expect(error.errors.stationName).toBeDefined();
      expect(error.errors.zone).toBeDefined();
      expect(error.errors.state).toBeDefined();
      expect(error.errors['coordinates.lat']).toBeDefined();
      expect(error.errors['coordinates.lng']).toBeDefined();
    });

    it('3. should enforce min/max length constraints on stationCode', () => {
      // Too short
      let station = new Station({ ...validStationPayload, stationCode: 'A' });
      let error = station.validateSync();
      expect(error.errors.stationCode.message).toContain('is shorter than the minimum allowed length');

      // Too long
      station = new Station({ ...validStationPayload, stationCode: 'WAYTOOLONGCODE' });
      error = station.validateSync();
      expect(error.errors.stationCode.message).toContain('is longer than the maximum allowed length');
    });

    it('4. should enforce min constraint on numberOfPlatforms', () => {
      const station = new Station({ ...validStationPayload, numberOfPlatforms: 0 });
      const error = station.validateSync();
      expect(error.errors.numberOfPlatforms.message).toContain('is less than minimum allowed value');
    });

    it('5. should enforce geographical boundary constraints on coordinates (lat/lng)', () => {
      // Latitude out of bounds (> 90 or < -90)
      let station = new Station({
        ...validStationPayload,
        coordinates: { lat: 91, lng: 78.4760 }
      });
      let error = station.validateSync();
      expect(error.errors['coordinates.lat'].message).toContain('is more than maximum allowed value (90)');

      // Longitude out of bounds (> 180 or < -180)
      station = new Station({
        ...validStationPayload,
        coordinates: { lat: 17.3916, lng: -181 }
      });
      error = station.validateSync();
      expect(error.errors['coordinates.lng'].message).toContain('is less than minimum allowed value (-180)');
    });
  });

  // --- 2. ASYNC DATABASE TESTS (Tests Defaults, Modifiers, and Indexes) ---
  describe('Database Interactions (Defaults & Modifiers)', () => {
    it('1. should apply default values automatically on save', async () => {
      const station = await Station.create(validStationPayload);

      // We didn't provide these in the payload, so Mongoose should fall back to defaults
      expect(station.isActive).toBe(true);
      expect(station.numberOfPlatforms).toBe(1);
    });

    it('2. should apply uppercase and trim modifiers automatically on save', async () => {
      const messyPayload = {
        ...validStationPayload,
        stationCode: '   sc  ',    // Should trim and uppercase
        zone: 'scr ',             // Should trim and uppercase
        stationName: ' Secunderabad ', // Should trim only
      };

      const station = await Station.create(messyPayload);

      expect(station.stationCode).toBe('SC');
      expect(station.zone).toBe('SCR');
      expect(station.stationName).toBe('Secunderabad'); // Trimmed, but casing left alone
    });

    it('3. should throw a MongoDB duplicate key error if stationCode is not unique', async () => {
      // Save the first station successfully
      await Station.create(validStationPayload);

      // Attempt to save a second station with the exact same stationCode
      let error;
      try {
        await Station.create({
          ...validStationPayload,
          stationName: 'Another Station Using Same Code'
        });
      } catch (err) {
        error = err;
      }

      // Assert that Mongoose threw an error
      expect(error).toBeDefined();
      // 11000 is the standard MongoDB error code for a unique index violation
      expect(error.code).toBe(11000); 
      expect(error.message).toContain('stationCode_1 dup key');
    });
  });
});