import express from 'express';
import { z } from 'zod';
import { createJourney, checkAvailability } from './journey.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { USER_ROLES } from '../../utils/constants.js';
import { createJourneySchema } from "./journey.schema.js";

const router = express.Router();

// Public: Passengers checking if seats are available
router.get('/availability', checkAvailability);

// Admin: Opening bookings for a specific date
router.post('/', protect, restrictTo(USER_ROLES.ADMIN), validateRequest(createJourneySchema), createJourney);

export default router;