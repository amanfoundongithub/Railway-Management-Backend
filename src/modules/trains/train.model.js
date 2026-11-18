import mongoose from 'mongoose';

const stationStopSchema = new mongoose.Schema({
  stationCode: {
    type: String,
    required: [true, 'Station code is required'],
    uppercase: true,
    trim: true,
  },
  stationName: {
    type: String,
    required: true,
  },
  arrivalTime: {
    type: String, // e.g., "14:30"
    required: true,
  },
  departureTime: {
    type: String, // e.g., "14:40"
    required: true,
  },
  distanceFromSource: {
    type: Number, // in kilometers
    required: true,
  },
  dayCounter: {
    type: Number, // 1 for same day, 2 for next day, etc.
    default: 1,
  }
}, { _id: false });

const classConfigSchema = new mongoose.Schema({
  classType: {
    type: String,
    enum: ['1A', '2A', '3A', 'SL', 'CC', '2S', 'UR'], // Standard Indian Railways classes
    required: true,
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 0,
  },
  baseFare: {
    type: Number,
    required: true,
    min: 0,
  }
}, { _id: false });

const trainSchema = new mongoose.Schema({
  trainNumber: {
    type: String,
    required: [true, 'Train number is required'],
    unique: true,
    trim: true,
  },
  trainName: {
    type: String,
    required: [true, 'Train name is required'],
    trim: true,
  },
  source: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  destination: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  // The schedule of stops along the journey
  route: [stationStopSchema],
  
  // The composition of the train (Sleeper, AC, etc.)
  coachClasses: [classConfigSchema],
  
  // Which days of the week the train runs (0 = Sunday, 6 = Saturday)
  runningDays: {
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6], 
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

export const Train = mongoose.model('Train', trainSchema);