import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Ensure maxRetriesPerRequest is null for BullMQ compatibility
const redisConnection = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const cateringQueue = new Queue('cateringQueue', {
  connection: redisConnection
});