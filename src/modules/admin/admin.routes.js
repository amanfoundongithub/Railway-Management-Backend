import express from 'express';
import { getDashboardStats, getTrainInventory } from './admin.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { USER_ROLES } from '../../utils/constants.js'; 

const router = express.Router();

router.use(protect);
router.use(restrictTo(USER_ROLES.ADMIN));

router.get('/dashboard-stats', getDashboardStats);
router.get('/inventory', getTrainInventory);

export default router;