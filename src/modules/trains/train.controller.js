import { Train } from './train.model.js'; // Update path as needed
import { Journey } from '../journeys/journey.model.js'; 

// @desc    Add a new train to the system
// @access  Private / Admin Only
export const createTrain = async (req, res, next) => {
  try {
    const { trainNumber } = req.body;

    // Ensure we don't create duplicate trains
    const existingTrain = await Train.findOne({ trainNumber });
    if (existingTrain) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'A train with this number already exists' 
      });
    }

    const newTrain = await Train.create(req.body);

    res.status(201).json({
      status: 'success',
      data: { train: newTrain },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search for trains between two stations on a specific date (includes live inventory)
// @access  Public (or Passenger)
export const searchTrains = async (req, res, next) => {
  try {
    const { source, destination, date } = req.query;

    if (!source || !destination || !date) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Please provide source, destination, and date' 
      });
    }

    const reqSource = source.toUpperCase();
    const reqDest = destination.toUpperCase();
    
    // Normalize user boarding date to midnight UTC to match DB journey dates
    const userBoardingDate = new Date(date);
    userBoardingDate.setUTCHours(0, 0, 0, 0);

    // 1. Find all active trains that stop at both stations
    const trains = await Train.find({
      'route.stationCode': { $all: [reqSource, reqDest] },
      isActive: true
    });

    // 2. Filter for correct direction
    const validTrains = trains.filter(train => {
      const srcIndex = train.route.findIndex(r => r.stationCode === reqSource);
      const dstIndex = train.route.findIndex(r => r.stationCode === reqDest);
      return srcIndex !== -1 && dstIndex !== -1 && srcIndex < dstIndex;
    });

    // 3. Map origin dates and fetch live Journey inventory
    const searchResults = await Promise.all(validTrains.map(async (train) => {
      const sourceStop = train.route.find(r => r.stationCode === reqSource);
      
      // Calculate origin date: If boarding on Day 2, train actually left on Day 1
      const dayOffset = (sourceStop.dayCounter || 1) - 1; 
      
      const originDate = new Date(userBoardingDate);
      originDate.setDate(originDate.getDate() - dayOffset);
      
      // Fetch the specific live journey document matching this train and exact origin date
      const journey = await Journey.findOne({ 
        train: train._id, 
        journeyDate: originDate 
      });

      // If no journey is provisioned for this date, omit the train entirely
      if (!journey) return null;

      // Bundle the static train rules with the live journey availability
      return {
        _id: journey._id,               // We use the Journey ID as the primary ID for the booking phase
        trainId: train._id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        source: reqSource,
        destination: reqDest,
        route: train.route,             // Frontend needs this to calculate exact departure/arrival times
        journeyDate: journey.journeyDate,
        coachClasses: journey.seatInventory // Using the Journey's snapshot of classes, prices, and seats
      };
    }));

    // Filter out nulls (trains that don't have an active journey on the computed date)
    const availableJourneys = searchResults.filter(result => result !== null);

    res.status(200).json({
      status: 'success',
      results: availableJourneys.length,
      data: { trains: availableJourneys }, 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live running status of a train (Dynamic Mock)
// @access  Public
export const getLiveTrainStatus = async (req, res, next) => {
  try {
    const { trainNo, date } = req.query;

    if (!trainNo || !date) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Please provide both train number and journey date.' 
      });
    }

    const train = await Train.findOne({ trainNumber: trainNo });
    if (!train) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Train not found in the system.' 
      });
    }

    // --- DYNAMIC UNPREDICTABLE MOCK LOGIC ---
    
    // 1. Randomly pick which station the train is currently at (or heading towards)
    const currentIndex = Math.floor(Math.random() * train.route.length);
    
    // 2. Generate a random current delay between 0 and 120 minutes (2 hours)
    // 30% chance the train is perfectly on time
    let currentDelay = Math.random() > 0.7 ? Math.floor(Math.random() * 120) : 0; 

    const mockLiveRoute = train.route.map((station, index) => {
      let status = 'UPCOMING';
      if (index < currentIndex) status = 'PASSED';
      else if (index === currentIndex) status = 'CURRENT';

      let stationDelay = 0;

      if (status === 'PASSED') {
        // Historical delay: fluctuate it randomly by +/- 15 mins to simulate making up or losing time
        const fluctuation = Math.floor(Math.random() * 30) - 15;
        stationDelay = Math.max(0, currentDelay + fluctuation);
      } else {
        // Current and Upcoming stations show the current ongoing delay as an estimate
        stationDelay = currentDelay;
      }

      return {
        stationName: station.stationName,
        stationCode: station.stationCode,
        arrivalTime: station.arrivalTime,
        status,
        delay: stationDelay
      };
    });

    const liveData = {
      name: train.trainName,
      number: train.trainNumber,
      startDate: date,
      totalDelay: currentDelay,
      route: mockLiveRoute
    };

    res.status(200).json({
      status: 'success',
      data: liveData
    });

  } catch (error) {
    next(error);
  }
};