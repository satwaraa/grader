import type { Socket } from "socket.io";

// Example: Chat event handlers
export const chatHandlers = (socket: Socket) => {
    socket.on("send-message", (data: { room: string; message: string; user: string }) => {
        socket.to(data.room).emit("receive-message", {
            user: data.user,
            message: data.message,
            timestamp: new Date(),
        });
    });

    socket.on("typing", (data: { room: string; user: string }) => {
        socket.to(data.room).emit("user-typing", {
            user: data.user,
        });
    });

    socket.on("stop-typing", (data: { room: string; user: string }) => {
        socket.to(data.room).emit("user-stop-typing", {
            user: data.user,
        });
    });
};

// Example: Notification handlers
export const notificationHandlers = (socket: Socket) => {
    socket.on("subscribe-notifications", (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`Socket ${socket.id} subscribed to notifications for user ${userId}`);
    });

    socket.on("unsubscribe-notifications", (userId: string) => {
        socket.leave(`user:${userId}`);
        console.log(
            `Socket ${socket.id} unsubscribed from notifications for user ${userId}`,
        );
    });
};

// Example: Presence handlers
export const presenceHandlers = (socket: Socket) => {
    socket.on("user-online", (userId: string) => {
        socket.broadcast.emit("user-status-change", {
            userId,
            status: "online",
        });
    });

    socket.on("user-away", (userId: string) => {
        socket.broadcast.emit("user-status-change", {
            userId,
            status: "away",
        });
    });
};

// Example: Submission handlers
export const submissionHandlers = (socket: Socket) => {
    socket.on("watch-submission", (submissionId: string) => {
        socket.join(submissionId);
        console.log(`Socket ${socket.id} watching submission ${submissionId}`);
    });

    // Teacher: Watch all submissions for an assignment
    socket.on("watch-assignment", (assignmentId: string) => {
        socket.join(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} watching assignment ${assignmentId}`);
    });

    // Teacher: Stop watching an assignment
    socket.on("unwatch-assignment", (assignmentId: string) => {
        socket.leave(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} stopped watching assignment ${assignmentId}`);
    });
};

export default {
    chatHandlers,
    notificationHandlers,
    presenceHandlers,
    submissionHandlers,
};
