import express from 'express';
import { getStationsWithCabs, bookCab, createCabVendor } from './cab.controller.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// GET train route with cab vendors available at each stop
router.get('/trains/:trainId/vendors', getStationsWithCabs);

router.post('/book', protect, bookCab);
router.post('/vendors', protect, createCabVendor);

export default router;