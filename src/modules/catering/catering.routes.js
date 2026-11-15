import express from 'express';
import { placeCateringOrder, handleTrainDelay, getStationsWithVendors, getVendorMenu, createVendor } from './catering.controller.js';
import { protect } from '../../middlewares/authMiddleware.js'; // Adjust path to your auth middleware

const router = express.Router();

// Used by the React Frontend
router.post('/order', protect, placeCateringOrder);

// Used by internal train-tracking system webhooks
router.post('/delay', protect, handleTrainDelay);

router.get('/trains/:trainId/vendors', getStationsWithVendors);
router.get('/vendors/:vendorId/menu', getVendorMenu);
router.post('/vendors', protect, createVendor);

export default router;