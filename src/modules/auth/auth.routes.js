import express from 'express';
import { register, login } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { registerSchema, loginSchema } from './auth.schema.js';

const router = express.Router();

// The middleware runs first. If it passes, it moves to the controller.
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);

export default router;