import express from 'express';
import { register, login, getMe } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// The middleware runs first. If it passes, it moves to the controller.
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.get('/me', protect, getMe);

export default router;