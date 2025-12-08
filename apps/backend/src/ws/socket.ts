import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";

let io: Server;

export const initializeSocketIO = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Example: Join a room
        socket.on("join-room", (roomId: string) => {
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room: ${roomId}`);
            socket.emit("joined-room", { roomId });
        });

        // Example: Leave a room
        socket.on("leave-room", (roomId: string) => {
            socket.leave(roomId);
            console.log(`Socket ${socket.id} left room: ${roomId}`);
            socket.emit("left-room", { roomId });
        });

        // Example: Send message to a room
        socket.on("message", (data: { roomId: string; message: string }) => {
            io.to(data.roomId).emit("message", {
                from: socket.id,
                message: data.message,
                timestamp: new Date(),
            });
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });

        // Handle errors
        socket.on("error", (error) => {
            console.error(`Socket error for ${socket.id}:`, error);
        });
    });

    console.log("Socket.IO initialized");
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initializeSocketIO first.");
    }
    return io;
};

export default { initializeSocketIO, getIO };
