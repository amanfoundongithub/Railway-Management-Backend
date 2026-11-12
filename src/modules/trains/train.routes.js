import express from 'express';
import { createTrain, searchTrains, getLiveTrainStatus } from './train.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { createTrainSchema } from './train.schema.js';
import { USER_ROLES } from '../../utils/constants.js';

const router = express.Router();

// Public route: Anyone can search for trains
router.get('/search', searchTrains);
router.get('/live-status', getLiveTrainStatus);

// Protected & Restricted route: Only Admins can create a new train
router.post(
  '/', 
  protect, 
  restrictTo(USER_ROLES.ADMIN), 
  validateRequest(createTrainSchema), 
  createTrain
);

export default router;