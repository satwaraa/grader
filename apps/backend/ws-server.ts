/**
 * Standalone WebSocket server entry point for Kubernetes deployment.
 * This runs the Socket.IO server independently from the API server.
 */
import http from "http";
import { initializeSocketIO } from "./ws";

const port = process.env.PORT || process.env.WS_PORT || 9000;

// Create standalone HTTP server for Socket.IO
const httpServer = http.createServer();

// Initialize Socket.IO
initializeSocketIO(httpServer);

console.log(`🚀 Starting WebSocket server on port ${port}...`);

httpServer.listen(port, () => {
    console.log(`✅ WebSocket server listening at port ${port}`);
});

// Graceful shutdown handlers
const exitHandler = () => {
    httpServer.close(() => {
        console.info("WebSocket server closed");
        process.exit(0);
    });

    setTimeout(() => {
        console.warn("Forced exit");
        process.exit(1);
    }, 5000);
};

process.on("SIGTERM", exitHandler);
process.on("SIGINT", exitHandler);
