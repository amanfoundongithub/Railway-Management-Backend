import express from 'express';
import { 
  createTrain, 
  searchTrains, 
  getLiveTrainStatus,
  getTrainSchedule 
} from './train.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { createTrainSchema } from './train.schema.js';
import { USER_ROLES } from '../../../utils/constants.js';

const router = express.Router();

// Public routes: Anyone can search, check status, or view schedules
router.get('/search', searchTrains);
router.get('/live-status', getLiveTrainStatus);
router.get('/schedule/:trainNumber', getTrainSchedule); 

// Protected & Restricted route: Only Admins can create a new train
router.post(
  '/', 
  protect, 
  restrictTo(USER_ROLES.ADMIN), 
  validateRequest(createTrainSchema), 
  createTrain
);

export default router;