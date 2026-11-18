import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

export const cateringQueue = new Queue('cateringQueue', {
  connection: redisConnection
});