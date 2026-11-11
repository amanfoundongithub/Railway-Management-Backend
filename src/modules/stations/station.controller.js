import { Station } from './station.model.js';

// @desc    Add a new station
// @access  Protected (Admin only)
export const createStation = async (req, res, next) => {
  try {
    const existingStation = await Station.findOne({ stationCode: req.body.stationCode });
    if (existingStation) {
      return res.status(400).json({ status: 'fail', message: 'Station code already exists' });
    }

    const station = await Station.create(req.body);
    res.status(201).json({ status: 'success', data: { station } });
  } catch (error) {
    next(error);
  }
};

// @desc    Search stations by name or code (for frontend autocomplete)
// @access  Public
export const searchStations = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    // Perform a regex search to match partial strings in either the code or name
    const stations = await Station.find({
      $or: [
        { stationCode: { $regex: query, $options: 'i' } },
        { stationName: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    }).limit(10); // Only return the top 10 matches for speed

    res.status(200).json({
      status: 'success',
      results: stations.length,
      data: { stations }
    });
  } catch (error) {
    next(error);
  }
};