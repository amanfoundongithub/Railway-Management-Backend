import cron from 'node-cron';
import { Train } from '../modules/trains/train.model.js';
import { Journey } from '../modules/journeys/journey.model.js';

// This function generates journeys exactly 120 days from today
const generateInventoryForFutureDate = async () => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    targetDate.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC
    
    // getDay() returns 0 (Sunday) to 6 (Saturday)
    const dayOfWeek = targetDate.getDay(); 

    console.log(`[CRON] Starting inventory generation for ${targetDate.toDateString()} (Day: ${dayOfWeek})`);

    // 1. Find all active trains scheduled to run on this day of the week
    const trains = await Train.find({ 
      isActive: true, 
      runningDays: dayOfWeek 
    });

    if (trains.length === 0) {
      console.log('[CRON] No trains scheduled for this day.');
      return;
    }

    // 2. Map static trains to live journey payloads
    const journeysToInsert = trains.map(train => ({
      train: train._id,
      journeyDate: targetDate,
      seatInventory: train.coachClasses.map(coach => ({
        classType: coach.classType,
        totalSeats: coach.totalSeats,
        availableSeats: coach.totalSeats,
        waitlistCount: 0,
        baseFare: coach.baseFare // Lock in the current base fare
      }))
    }));

    // 3. Bulk insert into the Journey collection
    // ordered: false ensures that if one duplicate fails (due to our unique index), the rest still process
    const result = await Journey.insertMany(journeysToInsert, { ordered: false });
    
    console.log(`[CRON] Successfully provisioned ${result.length} journeys for ${targetDate.toDateString()}`);
  } catch (error) {
    // Code 11000 is a MongoDB duplicate key error. We can ignore it if journeys were already generated.
    if (error.code === 11000) {
      console.log('[CRON] Some journeys already existed for this date. Skipped duplicates.');
    } else {
      console.error('[CRON] Error generating inventory:', error);
    }
  }
};

// Schedule the task to run every day at 00:00 (Midnight)
export const startInventoryCron = () => {
  cron.schedule('*/10 * * * *', () => {
    generateInventoryForFutureDate();
  });
  console.log('[CRON] Inventory generator job scheduled to run every 10 minutes.');
};

// Optional: Export the generation function so you can trigger it manually via an admin API route if needed
export { generateInventoryForFutureDate };