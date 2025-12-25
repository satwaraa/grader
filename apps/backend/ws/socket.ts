import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { redis } from "../utils/redis";
import {
    chatHandlers,
    notificationHandlers,
    presenceHandlers,
    submissionHandlers,
} from "./handlers";

let io: Server;

export const initializeSocketIO = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Create a dedicated Redis subscriber
    const sub = redis.duplicate();

    sub.psubscribe("submission:*", (err, count) => {
        if (err) {
            console.error("Failed to subscribe: %s", err.message);
        } else {
            console.log(
                `Subscribed to ${count} channels. Listening for updates on submission:*`,
            );
        }
    });

    sub.on("pmessage", (pattern, channel, message) => {
        // channel format: submission:<submissionId>
        const submissionId = channel.split(":")[1];
        if (submissionId) {
            try {
                const event = JSON.parse(message);
                // Include submissionId in the event for teacher dashboard
                const eventWithId = { ...event, submissionId };
                io.to(submissionId).emit("submission-progress", event);

                // If event has assignmentId, also emit to assignment room for teachers
                if (event.assignmentId) {
                    io.to(`assignment:${event.assignmentId}`).emit(
                        "assignment-grading-progress",
                        eventWithId,
                    );
                }
            } catch {
                console.error("Failed to parse message:", message);
            }
        }
    });

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Register handlers
        submissionHandlers(socket);
        chatHandlers(socket);
        notificationHandlers(socket);
        presenceHandlers(socket);

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
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
