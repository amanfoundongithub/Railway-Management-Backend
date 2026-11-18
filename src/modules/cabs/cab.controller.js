import { CabVendor, CabBooking } from './cab.model.js';
import { Train } from '../trains/train.model.js';
import { Booking } from '../bookings/booking.model.js';
import { sendCabBookingConfirmation } from '../../services/email.service.js';

export const getStationsWithCabs = async (req, res, next) => {
  try {
    const { trainId } = req.params;

    // 1. Fetch the train and its scheduled route/stops
    const train = await Train.findById(trainId).lean();
    
    if (!train || !train.route || train.route.length === 0) {
      return res.status(404).json({ message: 'Train or train route not found.' });
    }

    // 2. Fetch all cab vendors from DB
    const allCabVendors = await CabVendor.find().lean();
    
    // 3. Group cab vendors by stationCode for quick O(1) lookups
    const cabsByStation = allCabVendors.reduce((acc, vendor) => {
      if (!acc[vendor.stationCode]) acc[vendor.stationCode] = [];
      acc[vendor.stationCode].push({
        id: vendor._id,
        name: vendor.name,
        rating: vendor.rating,
        vehicles: vendor.vehicles
      });
      return acc;
    }, {});

    // 4. Dynamically map the train's route into the journey timeline with cabs available
    const journeyStations = train.route.map((stop) => {
      const stationCabs = cabsByStation[stop.stationCode] || [];
      const hasCabs = stationCabs.length > 0;

      return {
        code: stop.stationCode,
        name: stop.stationName,
        status: stop.status || 'PENDING',
        time: stop.arrivalTime || stop.time,
        canBookCab: hasCabs && stop.status !== 'DEPARTED',
        cabs: stationCabs
      };
    });

    res.status(200).json({ status: 'success', data: journeyStations });
  } catch (error) {
    next(error);
  }
};

export const bookCab = async (req, res, next) => {
  try {
    const { bookingId, stationCode, vendorId, vehicleType, pickupTime, dropLocation, fare } = req.body;

    const [booking, vendor] = await Promise.all([
      Booking.findById(bookingId).select('pnr'),
      CabVendor.findById(vendorId),
    ]);

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Booking not found.' });
    }

    if (!vendor) {
      return res.status(404).json({ status: 'fail', message: 'Cab vendor not found.' });
    }

    const cabBooking = await CabBooking.create({
      bookingId,
      stationCode,
      vendorId,
      vehicleType,
      pickupTime,
      dropLocation,
      fare
    });

    if (req.user?.email) {
      sendCabBookingConfirmation(
        req.user.email,
        cabBooking,
        vendor,
        booking.pnr,
        req.user.fullName,
      ).catch((error) => console.error('Failed to send cab booking confirmation email:', error));
    }

    res.status(201).json({ status: 'success', data: cabBooking });
  } catch (error) {
    next(error);
  }
};

export const createCabVendor = async (req, res, next) => {
  try {
    const vendor = await CabVendor.create(req.body);
    res.status(201).json({ status: 'success', data: vendor });
  } catch (error) {
    next(error);
  }
};