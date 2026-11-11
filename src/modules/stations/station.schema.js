import { z } from 'zod';

export const createStationSchema = z.object({
  body: z.object({
    stationCode: z.string().min(2).max(10).toUpperCase(),
    stationName: z.string().min(2),
    zone: z.string().min(2).toUpperCase(),
    state: z.string().min(2),
    numberOfPlatforms: z.number().int().min(1).optional(),
  }),
});