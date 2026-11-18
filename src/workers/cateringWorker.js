import { Worker } from 'bullmq';
import { CateringOrder } from '../modules/catering/catering.model.js';
import redisConnection from '../config/redis.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger("Catering_Worker");

export const cateringWorker = new Worker('cateringQueue', async (job) => {
  if (job.name === 'dispatchToVendor') {
    const { orderId, vendorId } = job.data;
    
    // 1. Fetch the order
    const order = await CateringOrder.findById(orderId);
    if (!order || order.status === 'CANCELLED') {
      logger.warn(`[Worker] Order ${orderId} cancelled or not found. Skipping.`);
      return;
    }

    // 2. Fire webhook/API to the actual vendor's Kitchen Display System
    // await axios.post(`https://api.vendor.com/v1/orders`, { payload });

    // 3. Update status to PREPARING
    order.status = 'PREPARING';
    await order.save();
    
    logger.info(`[Worker] Fired dispatch event for Order ${orderId} to Vendor ${vendorId}`);
  }
}, { connection: redisConnection });

// Startup and Event Logs
logger.info('[Worker] Catering background worker initialized and listening on queue: cateringQueue');

cateringWorker.on('ready', () => {
  logger.info('[Worker] Catering worker is connected to Redis and ready for jobs.');
});

cateringWorker.on('failed', (job, err) => {
  logger.error(`[Worker] Job ${job.id} failed:`, err);
});