import { Booking } from './booking.model.js';
import { Train } from '../trains/train.model.js';
import { Journey } from '../journeys/journey.model.js';

// @desc    Create a new train ticket booking with ACID Transactions
// @access  Protected
export const createBooking = async (req, res, next) => {
  // Start a MongoDB session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { trainId, journeyDate, sourceStation, destinationStation, coachClass, passengers } = req.body;
    const passengerCount = passengers.length;

    // 1. Find the specific Journey for this date
    const journey = await Journey.findOne({ 
      train: trainId, 
      journeyDate: new Date(journeyDate) 
    }).session(session); // Lock this query to the current transaction session

    if (!journey) {
      throw new Error('Booking is not open for this train on this date');
    }

    // 2. Find the requested coach class in the live inventory
    const classInventory = journey.seatInventory.find(c => c.classType === coachClass);
    if (!classInventory) {
      throw new Error(`Class ${coachClass} is not available on this train`);
    }

    // 3. Check for seat availability (Strict Concurrency Check)
    if (classInventory.availableSeats < passengerCount) {
      throw new Error(`Only ${classInventory.availableSeats} seats available in ${coachClass}`);
    }

    // 4. Fetch Train template to calculate fare
    const train = await Train.findById(trainId).session(session);
    const trainClassConfig = train.coachClasses.find(c => c.classType === coachClass);
    const totalFare = trainClassConfig.baseFare * passengerCount;

    // 5. Decrement the live seat inventory
    classInventory.availableSeats -= passengerCount;
    await journey.save({ session }); // Save inventory changes within the transaction

    // 6. Assign seat numbers (Simplified for now)
    const passengersWithSeats = passengers.map((p) => ({
      ...p,
      seatNumber: `${coachClass}-${classInventory.availableSeats + Math.floor(Math.random() * 10)}`,
      status: 'CONFIRMED'
    }));

    // 7. Create the Booking document within the transaction
    const [newBooking] = await Booking.create([{
      user: req.user._id,
      train: trainId,
      journeyDate: new Date(journeyDate),
      sourceStation,
      destinationStation,
      coachClass,
      passengers: passengersWithSeats,
      totalFare
    }], { session });

    // 8. COMMIT TRANSACTION: If everything succeeded, apply changes to database
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: { booking: newBooking }
    });

  } catch (error) {
    // 9. ABORT TRANSACTION: If ANYTHING fails, rollback all database changes
    await session.abortTransaction();
    session.endSession();

    // Pass the error to the global error handler
    // If it's our custom error string, wrap it properly. Otherwise, pass the raw error.
    if (error.message) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
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