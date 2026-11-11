import { z } from 'zod';

const stationStopSchema = z.object({
  stationCode: z.string().min(2).max(10).toUpperCase(),
  stationName: z.string().min(2),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM'),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM'),
  distanceFromSource: z.number().min(0),
  dayCounter: z.number().min(1).default(1),
});

const classConfigSchema = z.object({
  classType: z.enum(['1A', '2A', '3A', 'SL', 'CC', '2S', 'UR']),
  totalSeats: z.number().int().min(1),
  baseFare: z.number().min(1),
});

export const createTrainSchema = z.object({
  body: z.object({
    trainNumber: z.string().min(4).max(6),
    trainName: z.string().min(3),
    source: z.string().min(2).toUpperCase(),
    destination: z.string().min(2).toUpperCase(),
    route: z.array(stationStopSchema).min(2, 'Route must have at least a source and destination'),
    coachClasses: z.array(classConfigSchema).min(1, 'Train must have at least one coach class'),
    runningDays: z.array(z.number().min(0).max(6)).optional(),
  }),
});