import Redis from 'ioredis';
import { Logger } from '../../utils/logger.js';

const logger = new Logger("Redis_Connection")

// Redis connection to the URI
const redisConnection = new Redis(process.env.REDIS_URI, {
  maxRetriesPerRequest: null, 
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisConnection.on('error', (err) => logger.error('Redis Client Error', err));
redisConnection.on('connect', () => logger.info('Redis connected for BullMQ'));

(async () => {
  try {
    const result = await redisConnection.ping();
    logger.info(`Redis ping test successful: ${result}`);
  } catch (err) {
    logger.error('Failed to ping Redis server on startup', err);
  }
})();

export default redisConnection;