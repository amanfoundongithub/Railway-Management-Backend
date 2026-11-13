import express from 'express';
import { createBooking, getUserBookings, getBookingByPNR, cancelBooking, verifyPayment, addMealToBooking } from './booking.controller.js'; // <-- Import cancelBooking
import { protect } from '../../middlewares/authMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { createBookingSchema } from './booking.schema.js';

const router = express.Router();

// Public route to check PNR status
router.get('/pnr/:pnr', getBookingByPNR);

// Protected routes (Must be logged in)
router.use(protect); 

router.post('/', validateRequest(createBookingSchema), createBooking);
router.get('/my-bookings', getUserBookings);

// Cancel a booking route
router.patch('/cancel/:id', cancelBooking); // <-- Add this line
router.post('/payment-webhook', verifyPayment);

router.post('/:pnr/meals', protect, addMealToBooking);

export default router;