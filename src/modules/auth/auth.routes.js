import express from 'express';
import { register, login, getMe, updateMasterList } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes (validation middleware runs first)
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);

// Protected routes (require valid JWT)
router.get('/me', protect, getMe);
router.put('/master-list', protect, updateMasterList);

export default router;