import express from 'express';
import { chatWithConcierge } from './ai.controller.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Protected so bookings are tied to an authenticated session
router.post('/chat', protect, chatWithConcierge);

export default router;