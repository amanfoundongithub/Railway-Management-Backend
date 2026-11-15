import Redis from 'ioredis';
import { Logger } from '../../utils/logger.js';

const logger = new Logger("MongoDB_Connection")

const redisConnection = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null, 
});

redisConnection.on('error', (err) => logger.error('Redis Client Error', err));
redisConnection.on('connect', () => logger.info('Redis connected for BullMQ'));

export default redisConnection;