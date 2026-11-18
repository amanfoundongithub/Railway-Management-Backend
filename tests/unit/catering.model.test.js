import mongoose from 'mongoose';
import { CateringOrder } from '../../src/modules/catering/catering.model.js'; // Adjust path
import { CateringVendor } from '../../src/modules/catering/catering.vendor.model.js'; // Adjust path

describe('Catering Models - Rigorous Unit Tests', () => {
  const mockBookingId = new mongoose.Types.ObjectId();

  const validVendorPayload = {
    name: 'Haldirams',
    tags: 'North Indian, Snacks',
    rating: 4.5,
    stationCode: 'NDLS',
    menu: [
      { name: 'Veg Thali', desc: 'Complete meal', price: 250, isVeg: true },
      { name: 'Paneer Tikka', price: 180, isVeg: true } // Desc is optional
    ]
  };

  const validOrderPayload = {
    bookingId: mockBookingId,
    stationCode: 'NDLS',
    vendorId: 'vendor_123',
    restaurantName: 'Haldirams',
    totalAmount: 430,
    deliveryEta: new Date('2026-12-15T16:25:00.000Z'),
    items: [
      { name: 'Veg Thali', quantity: 1, price: 250 },
      { name: 'Paneer Tikka', quantity: 1, price: 180 }
    ]
  };

  describe('CateringVendor Schema', () => {
    it('1. should validate a valid vendor model', () => {
      const vendor = new CateringVendor(validVendorPayload);
      const error = vendor.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should enforce required fields in the root and menu array', () => {
      const vendor = new CateringVendor({
        // Missing name and stationCode
        menu: [{ desc: 'Missing name and price' }] 
      });
      const error = vendor.validateSync();

      expect(error.errors.name).toBeDefined();
      expect(error.errors.stationCode).toBeDefined();
      expect(error.errors['menu.0.name']).toBeDefined();
      expect(error.errors['menu.0.price']).toBeDefined();
    });

    it('3. should apply default values (rating, isVeg)', async () => {
      const vendor = await CateringVendor.create({
        name: 'Dominos',
        stationCode: 'MMCT',
        menu: [{ name: 'Cheese Pizza', price: 200 }]
      });

      expect(vendor.rating).toBe(4.0);
      expect(vendor.menu[0].isVeg).toBe(true);
    });
  });

  describe('CateringOrder Schema', () => {
    it('1. should validate a completely valid order model', () => {
      const order = new CateringOrder(validOrderPayload);
      const error = order.validateSync();
      expect(error).toBeUndefined();
    });

    it('2. should apply default status PLACED', async () => {
      const order = await CateringOrder.create(validOrderPayload);
      expect(order.status).toBe('PLACED');
    });

    it('3. should enforce status enum constraints', () => {
      const order = new CateringOrder({
        ...validOrderPayload,
        status: 'COOKING' // Not in enum
      });
      const error = order.validateSync();

      expect(error.errors.status.message).toContain('is not a valid enum value');
    });

    it('4. should enforce item quantity boundaries (min: 1)', () => {
      const order = new CateringOrder({
        ...validOrderPayload,
        items: [{ name: 'Water', quantity: 0, price: 20 }]
      });
      const error = order.validateSync();

      expect(error.errors['items.0.quantity'].message).toContain('is less than minimum allowed value (1)');
    });
  });
});