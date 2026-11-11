import { Journey } from './journey.model.js';
import { Train } from '../trains/train.model.js';

// @desc    Initialize a train journey for a specific date (populates initial seat inventory)
// @access  Protected (Admin Only)
export const createJourney = async (req, res, next) => {
  try {
    const { trainId, journeyDate } = req.body;
    
    const parsedDate = new Date(journeyDate);

    // 1. Check if journey already exists for this date
    const existingJourney = await Journey.findOne({ train: trainId, journeyDate: parsedDate });
    if (existingJourney) {
      return res.status(400).json({ status: 'fail', message: 'Journey already initialized for this date' });
    }

    // 2. Fetch the master train template
    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ status: 'fail', message: 'Train not found' });
    }

    // 3. Map the train's static coach classes into live, decrementing seat inventory
    const seatInventory = train.coachClasses.map(coach => ({
      classType: coach.classType,
      totalSeats: coach.totalSeats,
      availableSeats: coach.totalSeats, // Initially, all seats are available
      waitlistCount: 0
    }));

    // 4. Save the new Journey
    const journey = await Journey.create({
      train: trainId,
      journeyDate: parsedDate,
      seatInventory
    });

    res.status(201).json({
      status: 'success',
      data: { journey }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live seat availability for a specific train on a specific date
// @access  Public
export const checkAvailability = async (req, res, next) => {
  try {
    const { trainId, date } = req.query;

    const journey = await Journey.findOne({ 
      train: trainId, 
      journeyDate: new Date(date) 
    }).populate('train', 'trainNumber trainName');

    if (!journey) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'No journey scheduled for this train on this date. Booking not opened yet.' 
      });
    }

    res.status(200).json({
      status: 'success',
      data: { 
        trainName: journey.train.trainName,
        trainNumber: journey.train.trainNumber,
        journeyDate: journey.journeyDate,
        availability: journey.seatInventory 
      }
    });
  } catch (error) {
    next(error);
  }
};