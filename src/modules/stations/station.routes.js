import express from 'express';
import { createStation, searchStations, updateStationCoordinates } from './station.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { createStationSchema } from './station.schema.js';
import { USER_ROLES } from '../../../utils/constants.js';

const router = express.Router();

router.get('/search', searchStations);

router.post(
  '/', 
  protect, 
  restrictTo(USER_ROLES.ADMIN), 
  validateRequest(createStationSchema), 
  createStation
);

router.patch(
  '/:stationCode/coordinates', 
  protect, 
  restrictTo(USER_ROLES.ADMIN),
  updateStationCoordinates);

export default router;