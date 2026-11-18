import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose'; // <-- ADDED: Required for your health check

// Route imports
import authRoutes from './modules/auth/auth.routes.js'; 
import trainRoutes from './modules/trains/train.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import stationRoutes from './modules/stations/station.routes.js';
import journeyRoutes from './modules/journeys/journey.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import cateringRoutes from './modules/catering/catering.routes.js';
import cabRoutes from './modules/cabs/cab.routes.js';
import hotelRoutes from './modules/hotels/hotel.routes.js';
import aiConciergeRoutes from './modules/ai-concierge/ai.routes.js';

import { startInventoryCron } from './workers/inventoryCron.js';

const app = express();

/*
|--------------------------------------------------------------------------
| Security Middleware
|--------------------------------------------------------------------------
*/
app.disable("x-powered-by");
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error('Origin not allowed by CORS policy')
            );
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Request-ID',
        ],
    })
);

/*
|--------------------------------------------------------------------------
| Request Parsing
|--------------------------------------------------------------------------
*/
app.use(express.json({
    limit : "1mb"
}));
app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb',
    })
);

/*
|--------------------------------------------------------------------------
| Request Logging
|--------------------------------------------------------------------------
*/
if (process.env.NODE_ENV === 'development') {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined")); // Also applies to 'test' so logs aren't too noisy
}

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/
app.use("/api/auth", authRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catering', cateringRoutes);
app.use('/api/cabs', cabRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/ai-concierge', aiConciergeRoutes);

/*
|--------------------------------------------------------------------------
| Health Checks
|--------------------------------------------------------------------------
*/
app.get('/api/health/live', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'NXT_RAIL API is alive.',
    });
});

app.get('/api/health/ready', (req, res) => {
    const isDatabaseConnected = mongoose.connection.readyState === 1;

    if (!isDatabaseConnected) {
        return res.status(503).json({
            status: 'error',
            message: 'Service temporarily unavailable.',
        });
    }

    return res.status(200).json({
        status: 'success',
        message: 'NXT_RAIL API is ready.',
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'NXT_RAIL API is running.',
    });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/
app.use((err, req, res, next) => {
  // Suppress expected error logs during testing to keep the console clean
  if (process.env.NODE_ENV !== 'test') {
      console.error(`[Error] ${err.name}: ${err.message}`);
  }

  // 1. Intercept Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      status: 'fail',
      message: `Invalid input data. ${messages.join('. ')}`
    });
  }

  // 2. Intercept Mongoose CastErrors (e.g., invalid ObjectIds)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid ${err.path}: ${err.value}.`
    });
  }

  // 3. Default Error Fallback
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ 
      status: statusCode === 500 ? 'error' : 'fail', 
      message: err.message || 'Internal Server Error' 
  });
});

/*
|--------------------------------------------------------------------------
| Background Workers
|--------------------------------------------------------------------------
*/
// Prevent the cron job from starting during Jest tests, otherwise Jest will hang forever!
if (process.env.NODE_ENV !== 'test') {
    startInventoryCron();
}

export default app;