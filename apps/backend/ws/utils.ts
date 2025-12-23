import { getIO } from "./socket";

// Send notification to a specific user
/* eslint-disable @typescript-eslint/no-explicit-any */
export const sendNotificationToUser = (userId: string, notification: any) => {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", notification);
};

// Send message to a room
/* eslint-disable @typescript-eslint/no-explicit-any */
export const sendMessageToRoom = (roomId: string, message: any) => {
    const io = getIO();
    io.to(roomId).emit("message", message);
};

// Broadcast to all connected clients
/* eslint-disable @typescript-eslint/no-explicit-any */
export const broadcastToAll = (event: string, data: any) => {
    const io = getIO();
    io.emit(event, data);
};

// Broadcast to all except specific socket
/* eslint-disable @typescript-eslint/no-explicit-any */
export const broadcastExcept = (socketId: string, event: string, data: any) => {
    const io = getIO();
    io.except(socketId).emit(event, data);
};

// Get all connected sockets
export const getConnectedSockets = async () => {
    const io = getIO();
    const sockets = await io.fetchSockets();
    return sockets;
};

// Get sockets in a specific room
export const getSocketsInRoom = async (roomId: string) => {
    const io = getIO();
    const sockets = await io.in(roomId).fetchSockets();
    return sockets;
};

export default {
    sendNotificationToUser,
    sendMessageToRoom,
    broadcastToAll,
    broadcastExcept,
    getConnectedSockets,
    getSocketsInRoom,
};
