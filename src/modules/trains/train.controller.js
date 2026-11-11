import { Train } from './train.model.js';

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

// @desc    Search for trains between two stations
// @access  Public (or Passenger)
export const searchTrains = async (req, res, next) => {
  try {
    const { source, destination } = req.query;

    if (!source || !destination) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Please provide both source and destination station codes in the query' 
      });
    }

    // Find trains where the route array contains BOTH the source and destination codes
    const trains = await Train.find({
      'route.stationCode': { 
        $all: [source.toUpperCase(), destination.toUpperCase()] 
      },
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      results: trains.length,
      data: { trains },
    });
  } catch (error) {
    next(error);
  }
};