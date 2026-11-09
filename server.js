import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import app from './src/app.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`[Server] NXT_RAIL API is live on http://localhost:${PORT}`);
        console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    });
};

startServer();