import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// app.use(helmet());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'NXT_RAIL API is running flawlessly.'
    });
});


app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

export default app;