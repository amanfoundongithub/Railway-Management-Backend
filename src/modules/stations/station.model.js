import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema({
  stationCode: {
    type: String,
    required: [true, 'Station code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 2,
    maxlength: 10,
  },
  stationName: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true,
  },
  zone: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    // e.g., 'NR' (Northern Railway), 'ER' (Eastern Railway), 'SCR' (South Central Railway)
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  numberOfPlatforms: {
    type: Number,
    min: 1,
    default: 1,
  },
  coordinates: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

// Create a compound text index to allow fast search on both code and name
stationSchema.index({ stationCode: 'text', stationName: 'text' });

export const Station = mongoose.model('Station', stationSchema);