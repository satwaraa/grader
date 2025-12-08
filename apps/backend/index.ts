import http from "http";
import app from "./api/app";
import router from "./api/router";
import { initializeSocketIO } from "./src/ws";

const ServerConfig = {
    httpPort: process.env.HTTP_PORT || 8600,
};

// Mount API routes
app.use("/api", router);

const httpServer = http.createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

httpServer.listen(ServerConfig.httpPort, () => {
    console.log(`HTTP server listening at port ${ServerConfig.httpPort}`);
});

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
