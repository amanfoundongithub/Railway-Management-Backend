import { z } from 'zod';
import { ROLE_ARRAY } from '../../utils/constants.js';

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters').max(50),
    email: z.string().email('Please provide a valid email address'),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.enum(ROLE_ARRAY).optional(), // Optional because Mongoose sets a default
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});