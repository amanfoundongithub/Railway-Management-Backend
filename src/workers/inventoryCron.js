import cron from 'node-cron';
import { Train } from '../modules/trains/train.model.js';
import { Journey } from '../modules/journeys/journey.model.js';
import { Logger } from '../../utils/logger.js'; 

const logger = new Logger("CRON");

const generateInventoryForFutureDate = async () => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    targetDate.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = targetDate.getDay(); 
    logger.info(`Starting inventory generation`, { 
        targetDate: targetDate.toDateString(),
        dayOfWeek 
    });
    const trains = await Train.find({ 
      isActive: true, 
      runningDays: dayOfWeek 
    });
    if (trains.length === 0) {
      logger.info('No trains scheduled for this day.');
      return;
    }
    const journeysToInsert = trains.map(train => ({
      train: train._id,
      journeyDate: targetDate,
      seatInventory: train.coachClasses.map(coach => ({
        classType: coach.classType,
        totalSeats: coach.totalSeats,
        availableSeats: coach.totalSeats,
        waitlistCount: 0,
        baseFare: coach.baseFare 
      }))
    }));
    const result = await Journey.insertMany(journeysToInsert, { ordered: false });
    logger.info(`Successfully provisioned journeys`, { 
        count: result.length, 
        targetDate: targetDate.toDateString() 
    });
  } catch (error) {
    if (error.code === 11000) {
      logger.warn('Some journeys already existed for this date. Skipped duplicates.');
    } else {
      logger.error('Error generating inventory', error);
    }
  }
};
export const startInventoryCron = () => {
  cron.schedule('*/10 * * * *', () => {
    generateInventoryForFutureDate();
  });
  logger.info('Inventory generator job scheduled to run every 10 minutes.');
};

export { generateInventoryForFutureDate };