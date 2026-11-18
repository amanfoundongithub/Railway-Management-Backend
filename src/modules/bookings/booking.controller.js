import mongoose from 'mongoose';
import { Booking } from './booking.model.js';
import { Train } from '../trains/train.model.js';
import { Journey } from '../journeys/journey.model.js';
import { sendBookingConfirmation } from '../../services/email.service.js';
// Added to keep manual food orders in sync with the AI/Worker flow
import { CateringOrder } from '../catering/catering.model.js';
import { cateringQueue } from '../../workers/queues.js'; // Adjust path to your queue export

// @desc    Step 1: Reserve seats and initialize a Pending booking
export const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { trainId, journeyDate, sourceStation, destinationStation, coachClass, passengers } = req.body;

    const journey = await Journey.findOne({ 
      train: trainId, 
      journeyDate: new Date(journeyDate) 
    }).session(session);

    if (!journey) throw new Error('Booking is not open for this train on this date');

    const classInventory = journey.seatInventory.find(c => c.classType === coachClass);
    if (!classInventory) throw new Error(`Class ${coachClass} is not available`);

    const train = await Train.findById(trainId).session(session);
    const trainClassConfig = train.coachClasses.find(c => c.classType === coachClass);
    const totalFare = trainClassConfig.baseFare * passengers.length;

    const passengersWithSeats = [];
    
    for (const p of passengers) {
      if (classInventory.availableSeats > 0) {
        passengersWithSeats.push({
          ...p,
          seatNumber: `${coachClass}-${classInventory.availableSeats}`,
          status: 'CONFIRMED'
        });
        classInventory.availableSeats -= 1;
      } else {
        classInventory.waitlistCount += 1;
        passengersWithSeats.push({
          ...p,
          seatNumber: `WL-${classInventory.waitlistCount}`,
          status: 'WAITLISTED'
        });
      }
    }

    await journey.save({ session }); 

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [newBooking] = await Booking.create([{
      user: req.user._id,
      train: trainId,
      journeyDate: new Date(journeyDate),
      sourceStation,
      destinationStation,
      coachClass,
      passengers: passengersWithSeats,
      totalFare,
      transactionId,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING'
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      message: 'Seats reserved. Please complete payment to generate PNR.',
      data: { 
        bookingId: newBooking._id,
        transactionId,
        totalFare
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.message) return res.status(400).json({ status: 'fail', message: error.message });
    next(error);
  }
};

// @desc    Get all bookings for the logged-in user
// @access  Protected
export const getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('train', 'trainNumber trainName')
      .sort({ createdAt: -1 }); 

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check PNR Status
// @access  Public
export const getBookingByPNR = async (req, res, next) => {
  try {
    const { pnr } = req.params;

    const booking = await Booking.findOne({ pnr })
      .populate('train', 'trainNumber trainName route');

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Invalid PNR' });
    }

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel specific passengers (or full booking) and auto-upgrade waitlisted passengers
export const cancelBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { passengerIds } = req.body;

    if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
      throw new Error('No passengers selected for cancellation');
    }

    const booking = await Booking.findById(id).session(session);

    if (!booking) throw new Error('Booking not found');
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      throw new Error('You do not have permission to cancel this booking');
    }
    if (booking.bookingStatus === 'CANCELLED') throw new Error('This booking is already fully cancelled');
    if (new Date(booking.journeyDate) < new Date()) throw new Error('Cannot cancel a past journey');

    let confirmedCancelled = 0;
    let wlCancelled = 0;
    const freedSeats = [];

    const indicesToCancel = passengerIds.map(id => {
      if (typeof id === 'string' && id.startsWith('pax-')) {
        return parseInt(id.split('-')[1], 10);
      }
      return parseInt(id, 10);
    });

    indicesToCancel.forEach(index => {
      const p = booking.passengers[index];
      if (!p) throw new Error(`Passenger at index ${index} not found`);
      if (p.status === 'CANCELLED') throw new Error(`Passenger ${p.name} is already cancelled`);

      if (p.status === 'CONFIRMED') {
        confirmedCancelled++;
        freedSeats.push(p.seatNumber);
      } else if (p.status === 'WAITLISTED') {
        wlCancelled++;
      }
      p.status = 'CANCELLED';
    });
    
    const allCancelled = booking.passengers.every(p => p.status === 'CANCELLED');
    if (allCancelled) {
      booking.bookingStatus = 'CANCELLED';
    }

    await booking.save({ session });

    const journey = await Journey.findOne({
      train: booking.train,
      journeyDate: booking.journeyDate
    }).session(session);

    if (journey) {
      const classInventory = journey.seatInventory.find(c => c.classType === booking.coachClass);
      
      if (classInventory) {
        classInventory.waitlistCount -= wlCancelled;

        if (confirmedCancelled > 0) {
          const wlBookings = await Booking.find({
            train: booking.train,
            journeyDate: booking.journeyDate,
            coachClass: booking.coachClass,
            'passengers.status': 'WAITLISTED',
            bookingStatus: { $ne: 'CANCELLED' } 
          }).sort({ createdAt: 1 }).session(session);

          for (const wlBooking of wlBookings) {
            let modified = false;
            
            for (const p of wlBooking.passengers) {
              if (p.status === 'WAITLISTED' && freedSeats.length > 0) {
                p.status = 'CONFIRMED';
                p.seatNumber = freedSeats.pop();
                classInventory.waitlistCount -= 1;
                modified = true;
              }
            }
            if (modified) await wlBooking.save({ session });
            if (freedSeats.length === 0) break;
          }

          classInventory.availableSeats += freedSeats.length;
        }
        await journey.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: allCancelled ? 'Booking fully cancelled.' : 'Selected passengers cancelled successfully.',
      data: { booking }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.message) return res.status(400).json({ status: 'fail', message: error.message });
    next(error);
  }
};

// @desc    Step 2: Webhook to verify payment and finalize ticket or release seats
// @access  Public
export const verifyPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId, paymentStatus } = req.body;

    const booking = await Booking.findOne({ transactionId })
      .populate('user', 'email fullName') // FIX 1: Match 'fullName' from userSchema
      .populate('train', 'trainNumber trainName')
      .session(session);

    if (!booking) throw new Error('Invalid transaction ID');
    if (booking.bookingStatus !== 'PENDING') throw new Error('Transaction already processed');

    if (paymentStatus === 'SUCCESS') {
      booking.pnr = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      booking.paymentStatus = 'COMPLETED';
      booking.bookingStatus = 'SUCCESS';
      await booking.save({ session });

      await session.commitTransaction();
      session.endSession();

      if (booking.user?.email) {
        sendBookingConfirmation(booking.user.email, booking)
          .catch(err => console.error('Failed to send booking email:', err));
      }

    } else if (paymentStatus === 'FAILED') {
      booking.paymentStatus = 'FAILED';
      booking.bookingStatus = 'FAILED';
      booking.passengers.forEach(p => p.status = 'CANCELLED');
      await booking.save({ session });

      const journey = await Journey.findOne({
        train: booking.train._id || booking.train, // FIX 2: Safely extract _id from populated object
        journeyDate: booking.journeyDate
      }).session(session);

      if (journey) {
        const classInventory = journey.seatInventory.find(c => c.classType === booking.coachClass);
        if (classInventory) {
          let confirmedFreed = 0;
          let wlFreed = 0;
          
          booking.passengers.forEach(p => {
            if (p.seatNumber.startsWith('WL')) wlFreed++;
            else confirmedFreed++;
          });

          classInventory.availableSeats += confirmedFreed;
          classInventory.waitlistCount -= wlFreed;
          await journey.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();
    } else {
      throw new Error('Invalid payment status payload');
    }

    res.status(200).json({
      status: 'success',
      message: paymentStatus === 'SUCCESS' ? 'Ticket confirmed and PNR generated' : 'Payment failed, seats released',
      data: { pnr: booking.pnr, bookingStatus: booking.bookingStatus }
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    if (error.message) return res.status(400).json({ status: 'fail', message: error.message });
    next(error);
  }
};

// @desc    Add a food order to an existing booking via PNR
// @route   POST /api/bookings/:pnr/meals
// @access  Protected
export const addMealToBooking = async (req, res, next) => {
  try {
    const { pnr } = req.params;
    const { vendorId, restaurantName, deliveryStation, items, totalAmount } = req.body;

    const booking = await Booking.findOne({ pnr });

    if (!booking) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'No booking found with this PNR number.' 
      });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Cannot order food for a cancelled ticket.' 
      });
    }

    // FIX 3: Push to Booking.meals embedded array (for frontend display)
    const newMeal = {
      restaurantName,
      deliveryStation,
      items,
      totalAmount
    };
    booking.meals.push(newMeal);
    await booking.save();

    // FIX 4: Sync with Standalone CateringOrder & BullMQ
    if (vendorId) {
      const foodOrder = await CateringOrder.create({
        bookingId: booking._id,
        stationCode: deliveryStation,
        vendorId: vendorId,
        restaurantName: restaurantName,
        items: items,
        totalAmount: totalAmount,
        deliveryEta: new Date(Date.now() + 45 * 60 * 1000), // ETA in 45 mins
        status: 'PLACED'
      });

      // Dispatch to Kitchen/Vendor worker queue
      if (cateringQueue) {
        await cateringQueue.add('dispatchToVendor', {
          orderId: foodOrder._id.toString(),
          vendorId: vendorId
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Food order confirmed, attached to PNR, and dispatched to vendor.',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};