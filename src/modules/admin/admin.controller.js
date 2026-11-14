import { Train } from '../trains/train.model.js'; 
import { Booking } from '../bookings/booking.model.js';
import { User } from '../auth/auth.model.js';

// @desc    Get high-level system metrics for KPI cards
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin Only)
export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Count active trains
    const activeTrainsCount = await Train.countDocuments({ isActive: true });

    // 2. Count total registered users
    const totalUsers = await User.countDocuments({ role: 'PASSENGER' });

    // 3. Aggregate revenue and ticket counts from successful bookings
    const bookingStats = await Booking.aggregate([
      { $match: { bookingStatus: 'CONFIRMED' } },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: "$totalFare" },
          totalTicketsBooked: { $sum: { $size: "$passengers" } }
        } 
      }
    ]);

    const stats = bookingStats.length > 0 ? bookingStats[0] : { totalRevenue: 0, totalTicketsBooked: 0 };

    res.status(200).json({
      status: 'success',
      data: {
        revenue: stats.totalRevenue,
        ticketsBooked: stats.totalTicketsBooked,
        activeTrains: activeTrainsCount,
        totalUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed inventory and status of all trains (Paginated)
// @route   GET /api/admin/inventory
// @access  Private (Admin Only)
export const getTrainInventory = async (req, res, next) => {
  try {
    // 1. Parse pagination & search queries
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // 2. Build the MongoDB filter
    const query = {};
    if (search) {
      query.$or = [
        { trainNumber: { $regex: search, $options: 'i' } },
        { trainName: { $regex: search, $options: 'i' } }
      ];
    }

    // 3. Execute parallel DB calls for data and total count
    const [trains, totalTrains] = await Promise.all([
      Train.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Train.countDocuments(query)
    ]);

    const inventory = trains.map(train => {
      const totalCapacity = train.coachClasses.reduce((sum, coach) => sum + coach.totalSeats, 0);
      return {
        _id: train._id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        totalCapacity,
        isActive: train.isActive,
        currentOccupancy: Math.floor(Math.random() * totalCapacity), // Mocked for now
        runningDays: train.runningDays
      };
    });

    res.status(200).json({
      status: 'success',
      total: totalTrains, // Need this for frontend pagination math
      data: { inventory }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete or restore a train (Toggle Active Status)
// @route   PATCH /api/admin/trains/:id/status
// @access  Private (Admin Only)
export const toggleTrainStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const train = await Train.findByIdAndUpdate(
      id, 
      { isActive }, 
      { new: true }
    );

    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }

    res.status(200).json({
      status: 'success',
      data: train
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk toggle active status for multiple trains
// @route   PATCH /api/admin/trains/bulk-status
// @access  Private (Admin Only)
export const bulkToggleTrainStatus = async (req, res, next) => {
  try {
    const { trainIds } = req.body;

    if (!Array.isArray(trainIds) || trainIds.length === 0) {
      return res.status(400).json({ message: 'No train IDs provided' });
    }

    // Use MongoDB BulkWrite to fetch and invert the status of each selected train
    const trains = await Train.find({ _id: { $in: trainIds } });
    
    const bulkOps = trains.map(train => ({
      updateOne: {
        filter: { _id: train._id },
        update: { $set: { isActive: !train.isActive } }
      }
    }));

    if (bulkOps.length > 0) {
      await Train.bulkWrite(bulkOps);
    }

    res.status(200).json({
      status: 'success',
      message: `${bulkOps.length} trains updated successfully`
    });
  } catch (error) {
    next(error);
  }
};