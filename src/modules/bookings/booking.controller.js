import { Booking } from './booking.model.js';
import { Train } from '../trains/train.model.js';

// @desc    Create a new train ticket booking
// @access  Protected (Logged-in users only)
export const createBooking = async (req, res, next) => {
  try {
    const { trainId, journeyDate, sourceStation, destinationStation, coachClass, passengers } = req.body;

    // 1. Verify the Train exists
    const train = await Train.findById(trainId);
    if (!train || !train.isActive) {
      return res.status(404).json({ status: 'fail', message: 'Train not found or inactive' });
    }

    // 2. Find the requested coach class to get the base fare
    const selectedClass = train.coachClasses.find(c => c.classType === coachClass);
    if (!selectedClass) {
      return res.status(400).json({ status: 'fail', message: `Class ${coachClass} is not available on this train` });
    }

    // 3. Calculate total fare
    const totalFare = selectedClass.baseFare * passengers.length;

    // 4. Assign mock seat numbers for realism (in a real app, this queries a Seat inventory model)
    const passengersWithSeats = passengers.map((p, index) => ({
      ...p,
      seatNumber: `${coachClass}-${Math.floor(Math.random() * 50) + 1}`,
      status: 'CONFIRMED'
    }));

    // 5. Create the Booking
    const newBooking = await Booking.create({
      user: req.user._id, // Got this from the `protect` middleware
      train: trainId,
      journeyDate: new Date(journeyDate),
      sourceStation,
      destinationStation,
      coachClass,
      passengers: passengersWithSeats,
      totalFare
    });

    res.status(201).json({
      status: 'success',
      data: { booking: newBooking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings for the logged-in user
// @access  Protected
export const getUserBookings = async (req, res, next) => {
  try {
    // Find bookings belonging to req.user and populate the train details
    const bookings = await Booking.find({ user: req.user._id })
      .populate('train', 'trainNumber trainName')
      .sort({ createdAt: -1 }); // Newest first

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