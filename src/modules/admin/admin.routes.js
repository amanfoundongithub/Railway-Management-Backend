import express from 'express';
import { getDashboardStats, getTrainInventory, toggleTrainStatus, bulkToggleTrainStatus } from './admin.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { USER_ROLES } from '../../../utils/constants.js'; 

const router = express.Router();

router.use(protect);
router.use(restrictTo(USER_ROLES.ADMIN));

router.get('/dashboard-stats', getDashboardStats);
router.get('/inventory', getTrainInventory);
router.patch('/trains/status/:id', toggleTrainStatus);
router.patch('/trains/bulk-status', bulkToggleTrainStatus);

export default router;