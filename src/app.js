import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes.js'; 
import trainRoutes from './modules/trains/train.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import stationRoutes from './modules/stations/station.routes.js';

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

// app.use(
//     cors({
//         origin(origin, callback) {
//             if (!origin || allowedOrigins.includes(origin)) {
//                 return callback(null, true);
//             }

//             return callback(
//                 new Error('Origin not allowed by CORS policy')
//             );
//         },
//         credentials: true,
//         methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//         allowedHeaders: [
//             'Content-Type',
//             'Authorization',
//             'X-Request-ID',
//         ],
//     })
// );
app.use(cors());
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
    app.use(morgan("combined"));
}

// Register the routers
app.use("/api/auth",authRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stations', stationRoutes);

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
    const isDatabaseConnected =
        mongoose.connection.readyState === 1;

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

app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ status: 'error', message: err.message || 'Internal Server Error' });
});

export default app;