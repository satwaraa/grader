import http from "http";
import app from "./api/app";
import router from "./api/router";
import { initializeSocketIO } from "./ws";
// import redisClient from "./utils/redis";
import S3Client from "./utils/S3client";

const ServerConfig = {
    httpPort: process.env.HTTP_PORT || 8600,
};

// Mount API routes
app.use("/api", router);

const httpServer = http.createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

// Check Redis and S3 connections before starting server
const startServer = async () => {
    try {
        // Check Redis connection
        // await redisClient.ping();
        // console.log("✅ Redis connected successfully");

        // Check S3 connection
        await S3Client.list();
        console.log("✅ S3 connected successfully");

        httpServer.listen(ServerConfig.httpPort, () => {
            console.log(`HTTP server listening at port ${ServerConfig.httpPort}`);
        });
    } catch (error) {
        console.error("❌ Failed to initialize services:", error);
        process.exit(1);
    }
};

startServer();

const exitHandler = () => {
    httpServer.close(() => {
        console.info("HTTP server closed");
        process.exit(0);
    });

    setTimeout(() => {
        console.warn("Forced exit");
        process.exit(1);
    }, 5000);
};

const unexpectedErrorHandler = (error: any) => {
    console.error(error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
process.on("SIGTERM", exitHandler);
process.on("SIGINT", exitHandler);
