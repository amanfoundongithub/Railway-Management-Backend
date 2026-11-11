import { z } from 'zod';

const passengerZodSchema = z.object({
  name: z.string().min(2, 'Passenger name must be at least 2 characters'),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['M', 'F', 'T']),
});

export const createBookingSchema = z.object({
  body: z.object({
    trainId: z.string().length(24, 'Invalid Train ID'), // Mongoose ObjectIds are 24 hex characters
    journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    sourceStation: z.string().min(2).toUpperCase(),
    destinationStation: z.string().min(2).toUpperCase(),
    coachClass: z.enum(['1A', '2A', '3A', 'SL', 'CC', '2S', 'UR']),
    passengers: z.array(passengerZodSchema)
      .min(1, 'At least one passenger is required')
      .max(6, 'Maximum 6 passengers allowed per booking'),
  }),
});