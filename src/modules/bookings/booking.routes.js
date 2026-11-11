import express from 'express';
import { createBooking, getUserBookings, getBookingByPNR } from './booking.controller.js';
import { protect } from '../../middlewares/authMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { createBookingSchema } from './booking.schema.js';

const router = express.Router();

// Public route to check PNR status
router.get('/pnr/:pnr', getBookingByPNR);

// Protected routes (Must be logged in)
router.use(protect); // This applies the protect middleware to all routes below it

router.post('/', validateRequest(createBookingSchema), createBooking);
router.get('/my-bookings', getUserBookings);

export default router;