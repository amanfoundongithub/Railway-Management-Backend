import mongoose from 'mongoose';
import { Logger } from '../../utils/logger.js';

const logger = new Logger("MongoDB_Connection")

const DB_CONFIGURATION_OPTION = {

    // Connection pool configuration
    maxPoolSize: 50,
    minPoolSize: 5,
    maxConnecting: 5,

    // Timeouts configuration 
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    waitQueueTimeoutMS: 10_000,

    // Keep the pool healthy
    maxIdleTimeMS: 60_000,

    // Reliability
    retryReads: true,
    retryWrites: true,

    // Monitoring
    heartbeatFrequencyMS: 10_000,

    // Application identity
    appName: 'my-application',
};

let connectionPromise = null;
let shutdownStarted = false;


export const connectDB = async () => {

    const MONGODB_URL = process.env.MONGODB_URL;
    if(!MONGODB_URL) {
        throw new Error("MONGODB_URL is missing; please consider setting it to an actual string.");
    }

    if(shutdownStarted) {
        throw new Error("Database shutdown has already started");
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(
        MONGODB_URL, DB_CONFIGURATION_OPTION
    );
    try {
        await connectionPromise;
        logger.info("MongoDB connection established successfully.", {
            host: mongoose.connection.host,
            database: mongoose.connection.name,
            readyState: mongoose.connection.readyState,
        });
        return mongoose.connection;
    } catch(error) {
        logger.error("Initial connection failed.", error);
        throw error;
    } finally {
        connectionPromise = null;
    }

};

mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected successfully!");
});

mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected successfully!");
});

mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB re-connected successfully!");
});

mongoose.connection.on("error", (error) => {
    logger.error("MongoDB runtime error", error);
});

export const disconnectDB = async (signal = "MANUAL") => {

    if(shutdownStarted) {
        return;
    }

    shutdownStarted = true;
    logger.info("Shutting down MongoDB connection", {
        signal
    });

    try {
        await mongoose.disconnect();
        logger.info("MongoDB disconnected gracefully.");
    } catch(error) {
        logger.error("MongoDB shutdown failed", error);
        throw error;
    }
};