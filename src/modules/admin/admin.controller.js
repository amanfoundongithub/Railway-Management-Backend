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

// @desc    Get detailed inventory and status of all trains
// @route   GET /api/admin/inventory
// @access  Private (Admin Only)
export const getTrainInventory = async (req, res, next) => {
  try {
    // Fetch all trains, sorting by newest first
    const trains = await Train.find().sort({ createdAt: -1 });

    // For a production app, you would join this with the `Journey` model 
    // to get live occupancy for today. For this dashboard overview, 
    // we'll map the basic details and calculate total capacity.
    const inventory = trains.map(train => {
      // Calculate total physical capacity of the train
      const totalCapacity = train.coachClasses.reduce((sum, coach) => sum + coach.totalSeats, 0);

      return {
        _id: train._id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        totalCapacity,
        isActive: train.isActive,
        // Mocking current occupancy for the dashboard UI (randomized for display)
        // You can replace this with a real aggregation against the Journey collection later
        currentOccupancy: Math.floor(Math.random() * totalCapacity), 
        runningDays: train.runningDays
      };
    });

    res.status(200).json({
      status: 'success',
      results: inventory.length,
      data: { inventory }
    });
  } catch (error) {
    next(error);
  }
};