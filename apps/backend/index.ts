import http from "http";
import app from "./src/app";
import { initializeSocketIO } from "./src/ws";

const ServerConfig = {
    httpPort: process.env.HTTP_PORT,
};

const httpServer = http.createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

httpServer.listen(ServerConfig.httpPort, () => {
    console.log(`HTTP server listening at port ${ServerConfig.httpPort}`);
});

const exitHandler = () => {
    httpServer.close(() => {
        console.info("HTTP server closed");
    });
};

const unexpectedErrorHandler = (error: any) => {
    console.error(error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
process.on("SIGTERM", exitHandler);
process.on("SIGINT", exitHandler);
