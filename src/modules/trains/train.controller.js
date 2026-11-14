import { Train } from './train.model.js'; 
import { Journey } from '../journeys/journey.model.js'; 

// @desc    Add a new train to the system
// @access  Private / Admin Only
export const createTrain = async (req, res, next) => {
  try {
    const { trainNumber } = req.body;

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
// @access  Public
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
    
    const userBoardingDate = new Date(date);
    userBoardingDate.setUTCHours(0, 0, 0, 0);

    const trains = await Train.find({
      'route.stationCode': { $all: [reqSource, reqDest] },
      isActive: true
    });

    const validTrains = trains.filter(train => {
      const srcIndex = train.route.findIndex(r => r.stationCode === reqSource);
      const dstIndex = train.route.findIndex(r => r.stationCode === reqDest);
      return srcIndex !== -1 && dstIndex !== -1 && srcIndex < dstIndex;
    });

    const searchResults = await Promise.all(validTrains.map(async (train) => {
      const sourceStop = train.route.find(r => r.stationCode === reqSource);
      const dayOffset = (sourceStop.dayCounter || 1) - 1; 
      
      const originDate = new Date(userBoardingDate);
      originDate.setDate(originDate.getDate() - dayOffset);
      
      const journey = await Journey.findOne({ 
        train: train._id, 
        journeyDate: originDate 
      });

      if (!journey) return null;

      return {
        _id: journey._id,               
        trainId: train._id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        source: reqSource,
        destination: reqDest,
        route: train.route,             
        journeyDate: journey.journeyDate,
        coachClasses: journey.seatInventory 
      };
    }));

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

    const currentIndex = Math.floor(Math.random() * train.route.length);
    let currentDelay = Math.random() > 0.7 ? Math.floor(Math.random() * 120) : 0; 

    const mockLiveRoute = train.route.map((station, index) => {
      let status = 'UPCOMING';
      if (index < currentIndex) status = 'PASSED';
      else if (index === currentIndex) status = 'CURRENT';

      let stationDelay = 0;

      if (status === 'PASSED') {
        const fluctuation = Math.floor(Math.random() * 30) - 15;
        stationDelay = Math.max(0, currentDelay + fluctuation);
      } else {
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

// @desc    Get complete static schedule/timetable for a specific train
// @access  Public
// @route   GET /api/trains/schedule/:trainNumber
export const getTrainSchedule = async (req, res, next) => {
  try {
    const { trainNumber } = req.params;

    const train = await Train.findOne({ trainNumber });

    if (!train) {
      return res.status(404).json({
        status: 'fail',
        message: 'Train not found'
      });
    }

    // Return the raw train document; the frontend will map the route array
    // to calculate halt times and format the table.
    res.status(200).json({
      status: 'success',
      data: { train }
    });
  } catch (error) {
    next(error);
  }
};