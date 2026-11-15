import dotenv from 'dotenv/config';
import pino from 'pino';

import { Logger } from './utils/logger.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import app from './src/app.js';

const logger = new Logger("Server");

// PORT & HOST for our application
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Server startup function
const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, HOST, () => {
            logger.info(`[SERVER_STARTUP] Server started on port: ${PORT}`, {
                port : PORT, 
                host : HOST, 
                baseUrl : `http://${HOST}:${PORT}`
            });
        });
        const shutdown = async (signal) => {
            logger.info(`[SERVER_SHUTDOWN] Received stopping signal from keyboard stroke: ${signal}`, {
                signal 
            });
            server.close(async (error) => {
                if(error) {
                    logger.error("[SERVER_SHUTDOWN] Server shutdown failed. Setting exit code to 1.", error);
                    process.exitCode = 1;
                }
                try {
                    await disconnectDB(signal);
                } catch(error) {
                    logger.error("[SERVER_SHUTDOWN] MongoDB shutdown failed. Setting exit code to 1.", error);
                    process.exitCode = 1;
                } finally {
                    logger.info("[SERVER_SHUTDOWN] Server shutdown successful. Setting exit code to 0.", {
                        status : "success"
                    });
                    process.exitCode = 1;
                    process.exit();
                }

            });
        };
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    } catch(error) {
        logger.error("[SERVER_STARTUP] Server Startup failed", error);
        process.exit(1);
    }
};

startServer();