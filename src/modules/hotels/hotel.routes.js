import express from 'express';
import { getHotelsByStation, bookHotel, createHotel } from './hotel.controller.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stations/:stationCode', getHotelsByStation);
router.post('/book', protect, bookHotel);
router.post('/', protect, createHotel);

export default router;