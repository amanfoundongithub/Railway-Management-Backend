import { CateringOrder } from './catering.model.js';
import { cateringQueue } from '../../workers/queues.js';
import { CateringVendor } from './catering.vendor.model.js';
import { Train } from '../trains/train.model.js';
import { sendCateringConfirmation } from '../../services/email.service.js';
import { Booking } from '../bookings/booking.model.js';
export const placeCateringOrder = async (req, res, next) => {
  try {
    const { bookingId, stationCode, vendorId, restaurantName, items, deliveryEta } = req.body;

    const booking = await Booking.findById(bookingId).select('pnr');
    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Booking not found.' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Creates separate order docs per vendor (vital for BullMQ tracking per kitchen)
    const order = await CateringOrder.create({
      bookingId,
      stationCode,
      vendorId,
      restaurantName,
      items,
      totalAmount,
      deliveryEta
    });

    const PREP_TIME_MS = 45 * 60 * 1000;
    const triggerTime = new Date(deliveryEta).getTime() - PREP_TIME_MS;
    const delayUntilTrigger = triggerTime - Date.now();

    await cateringQueue.add(
      'dispatchToVendor',
      { orderId: order._id, vendorId },
      { 
        delay: Math.max(0, delayUntilTrigger),
        jobId: `catering_${order._id}`
      }
    );

    req.log?.info(`Catering order ${order._id} queued for ${restaurantName} (${vendorId}).`);
    if (req.user?.email) {
      sendCateringConfirmation(req.user.email, order, booking.pnr)
        .catch((error) => console.error('Failed to send catering confirmation email:', error));
    }

    res.status(201).json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
};

export const handleTrainDelay = async (req, res, next) => {
  try {
    const { stationCode, delayMinutes } = req.body;
    const pendingOrders = await CateringOrder.find({ stationCode, status: 'PLACED' });

    if (pendingOrders.length === 0) {
      return res.status(200).json({ message: 'No pending catering orders to update.' });
    }

    const PREP_TIME_MS = 45 * 60 * 1000;
    const DELAY_MS = delayMinutes * 60 * 1000;
    let updatedCount = 0;

    for (const order of pendingOrders) {
      // Shift ETA in Database
      const newEta = new Date(order.deliveryEta.getTime() + DELAY_MS);
      order.deliveryEta = newEta;
      await order.save();

      // Recalculate BullMQ trigger and intercept the job
      const newDelay = Math.max(0, newEta.getTime() - PREP_TIME_MS - Date.now());
      const jobId = `catering_${order._id}`;
      const job = await cateringQueue.getJob(jobId);

      if (job) {
        const state = await job.getState();
        if (state === 'delayed') {
          await job.changeDelay(newDelay);
          updatedCount++;
          req.log?.info(`[Queue] Job ${jobId} execution pushed back by ${delayMinutes} mins.`);
        }
      }
    }

    res.status(200).json({ status: 'success', message: `Updated ETAs for ${updatedCount} orders.` });
  } catch (error) {
    next(error);
  }
};

export const getStationsWithVendors = async (req, res, next) => {
  try {
    const { trainId } = req.params;

    // 1. Fetch the train and its scheduled route/stops
    // (Assuming your Train schema has a 'route' or 'stations' array containing station codes and scheduled times)
    const train = await Train.findById(trainId).lean();
    
    if (!train || !train.route || train.route.length === 0) {
      return res.status(404).json({ message: 'Train or train route not found.' });
    }

    // 2. Fetch all vendors from DB
    const allVendors = await CateringVendor.find().lean();
    
    // 3. Group vendors by stationCode for quick O(1) lookups
    const vendorsByStation = allVendors.reduce((acc, vendor) => {
      if (!acc[vendor.stationCode]) acc[vendor.stationCode] = [];
      acc[vendor.stationCode].push({
        id: vendor._id,
        name: vendor.name,
        tags: vendor.tags,
        rating: vendor.rating
      });
      return acc;
    }, {});

    // 4. Dynamically map the train's route into the journey timeline expected by the frontend
    const journeyStations = train.route.map((stop) => {
      const stationVendors = vendorsByStation[stop.stationCode] || [];
      const hasVendors = stationVendors.length > 0;

      return {
        code: stop.stationCode,
        name: stop.stationName,
        status: stop.status || 'PENDING', // e.g., 'DEPARTED', 'NEXT', 'PENDING'
        time: stop.arrivalTime || stop.time,
        canOrder: hasVendors && stop.status !== 'DEPARTED',
        vendors: stationVendors
      };
    });

    res.status(200).json(journeyStations);
  } catch (error) {
    next(error);
  }
};

export const getVendorMenu = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const vendor = await CateringVendor.findById(vendorId).lean();
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json(vendor.menu);
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    // Expects name, tags, rating, stationCode, and menu in the body
    const vendor = await CateringVendor.create(req.body);
    req.log?.info(`Vendor ${vendor.name} created for station ${vendor.stationCode}`);
    res.status(201).json({ status: 'success', data: vendor });
  } catch (error) {
    next(error);
  }
};