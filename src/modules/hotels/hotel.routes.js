import express from 'express';
import { getStationsWithHotels, bookHotel, createHotel } from './hotel.controller.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/trains/:trainId/vendors', getStationsWithHotels);
router.post('/book', protect, bookHotel);
router.post('/', protect, createHotel);

export default router;