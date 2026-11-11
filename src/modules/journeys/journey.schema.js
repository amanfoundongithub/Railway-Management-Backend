import { z } from 'zod';

export const createJourneySchema = z.object({
  body: z.object({
    trainId: z.string().length(24),
    journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  })
});