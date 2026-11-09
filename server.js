import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './src/config/db.js';
import app from './src/app.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const startServer = async () => {

    try {
        await connectDB();
        const server = app.listen(PORT, () => {
            console.log(`[SERVER] Running on port: ${PORT}`);
        });
        const shutdown = async (signal) => {
            console.log(`[SERVER] Received stopping signal : ${signal}`);
            server.close(async (error) => {
                if(error) {
                    console.error("[SERVER] Server shutdown failed", error);
                    process.exitCode = 1;
                }

                try {
                    await disconnectDB(signal);
                } catch {
                    process.exitCode = 1;
                } finally {
                    process.exit();
                }

            });
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));

    } catch(error) {
        console.error("[SERVER] Startup failed", error);
        process.exit(1);
    }
    
};

startServer();