import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { CateringOrder } from '../modules/catering/catering.model.js';

const redisConnection = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const cateringWorker = new Worker('cateringQueue', async (job) => {
  if (job.name === 'dispatchToVendor') {
    const { orderId, vendorId } = job.data;
    
    // 1. Fetch the order
    const order = await CateringOrder.findById(orderId);
    if (!order || order.status === 'CANCELLED') {
      console.log(`[Worker] Order ${orderId} cancelled or not found. Skipping.`);
      return;
    }

    // 2. Fire webhook/API to the actual vendor's Kitchen Display System
    // await axios.post(`https://api.vendor.com/v1/orders`, { payload });

    // 3. Update status to PREPARING
    order.status = 'PREPARING';
    await order.save();
    
    console.log(`[Worker] Fired dispatch event for Order ${orderId} to Vendor ${vendorId}`);
  }
}, { connection: redisConnection });

cateringWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err);
});