# WebSocket (Socket.IO) Documentation

## Overview

This project uses Socket.IO for real-time bidirectional communication between clients and the server.

## Setup

Socket.IO is already integrated into the backend. The server initializes on the same HTTP server as Express.

## Connection

### Backend

Socket.IO is initialized in `index.ts` and listening on the same port as the HTTP server.

### Frontend Connection Example

```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
    withCredentials: true,
    autoConnect: true,
});

socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
});
```

## Available Events

### Core Events

#### `join-room`

Join a specific room.

**Client emits:**

```typescript
socket.emit("join-room", "room-123");
```

**Server responds:**

```typescript
socket.on("joined-room", (data) => {
    console.log("Joined room:", data.roomId);
});
```

#### `leave-room`

Leave a specific room.

**Client emits:**

```typescript
socket.emit("leave-room", "room-123");
```

**Server responds:**

```typescript
socket.on("left-room", (data) => {
    console.log("Left room:", data.roomId);
});
```

#### `message`

Send a message to a room.

**Client emits:**

```typescript
socket.emit("message", {
    roomId: "room-123",
    message: "Hello everyone!",
});
```

**Client receives:**

```typescript
socket.on("message", (data) => {
    console.log(`From ${data.from}: ${data.message}`);
    console.log(`Sent at: ${data.timestamp}`);
});
```

### Chat Events

#### `send-message`

Send a chat message to a room.

**Client emits:**

```typescript
socket.emit("send-message", {
    room: "chat-room-1",
    message: "Hello!",
    user: "John Doe",
});
```

**Client receives:**

```typescript
socket.on("receive-message", (data) => {
    console.log(`${data.user}: ${data.message}`);
    console.log(`Time: ${data.timestamp}`);
});
```

#### `typing`

Notify others that user is typing.

**Client emits:**

```typescript
socket.emit("typing", {
    room: "chat-room-1",
    user: "John Doe",
});
```

**Client receives:**

```typescript
socket.on("user-typing", (data) => {
    console.log(`${data.user} is typing...`);
});
```

#### `stop-typing`

Notify others that user stopped typing.

**Client emits:**

```typescript
socket.emit("stop-typing", {
    room: "chat-room-1",
    user: "John Doe",
});
```

**Client receives:**

```typescript
socket.on("user-stop-typing", (data) => {
    console.log(`${data.user} stopped typing`);
});
```

### Notification Events

#### `subscribe-notifications`

Subscribe to user-specific notifications.

**Client emits:**

```typescript
socket.emit("subscribe-notifications", "user-123");
```

**Client receives:**

```typescript
socket.on("notification", (notification) => {
    console.log("New notification:", notification);
});
```

#### `unsubscribe-notifications`

Unsubscribe from notifications.

**Client emits:**

```typescript
socket.emit("unsubscribe-notifications", "user-123");
```

### Presence Events

#### `user-online`

Broadcast that user is online.

**Client emits:**

```typescript
socket.emit("user-online", "user-123");
```

**Client receives:**

```typescript
socket.on("user-status-change", (data) => {
    console.log(`${data.userId} is now ${data.status}`);
});
```

#### `user-away`

Broadcast that user is away.

**Client emits:**

```typescript
socket.emit("user-away", "user-123");
```

## Server-Side Usage

### Sending Events from Backend Code

```typescript
import { sendNotificationToUser, sendMessageToRoom, broadcastToAll } from "./src/ws";

// Send notification to specific user
sendNotificationToUser("user-123", {
    title: "New Message",
    message: "You have a new message!",
    type: "info",
});

// Send message to a room
sendMessageToRoom("room-123", {
    from: "system",
    message: "Welcome to the room!",
    timestamp: new Date(),
});

// Broadcast to all connected clients
broadcastToAll("announcement", {
    message: "Server maintenance in 5 minutes",
});
```

### Get Connected Sockets

```typescript
import { getConnectedSockets, getSocketsInRoom } from "./src/ws";

// Get all connected sockets
const allSockets = await getConnectedSockets();
console.log(`Total connected clients: ${allSockets.length}`);

// Get sockets in a specific room
const roomSockets = await getSocketsInRoom("room-123");
console.log(`Clients in room: ${roomSockets.length}`);
```

## Adding Custom Events

### 1. Create Handler Function

Edit `src/ws/handlers.ts`:

```typescript
export const customHandlers = (socket: Socket) => {
    socket.on("custom-event", (data) => {
        // Handle the event
        socket.emit("custom-response", { success: true });
    });
};
```

### 2. Register Handler

Edit `src/ws/socket.ts` in the `initializeSocketIO` function:

```typescript
io.on("connection", (socket) => {
    // Existing handlers...

    // Add your custom handlers
    customHandlers(socket);
});
```

## Frontend Setup (React Example)

Install Socket.IO client:

```bash
npm install socket.io-client
```

Create a hook:

```typescript
// useSocket.ts
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io("http://localhost:3000");

        socketInstance.on("connect", () => {
            setIsConnected(true);
            console.log("Connected:", socketInstance.id);
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
            console.log("Disconnected");
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.close();
        };
    }, []);

    return { socket, isConnected };
};
```

Use in component:

```typescript
function Chat() {
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on("receive-message", (data) => {
            console.log("New message:", data);
        });

        return () => {
            socket.off("receive-message");
        };
    }, [socket]);

    const sendMessage = () => {
        socket?.emit("send-message", {
            room: "chat-1",
            message: "Hello!",
            user: "John",
        });
    };

    return (
        <div>
            <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
            <button onClick={sendMessage}>Send Message</button>
        </div>
    );
}
```

## CORS Configuration

CORS is configured in `src/ws/socket.ts`. Update the origin as needed:

```typescript
cors: {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST"],
  credentials: true,
}
```

## Environment Variables

Add to your `.env` file:

```env
CORS_ORIGIN=http://localhost:5173
```

## Testing with Postman

1. Create a new WebSocket request
2. Connect to: `ws://localhost:3000`
3. Send JSON events:

```json
{
    "event": "join-room",
    "data": "room-123"
}
```

## Production Considerations

1. **Authentication**: Implement socket authentication
2. **Rate Limiting**: Add rate limiting for events
3. **Rooms**: Clean up empty rooms periodically
4. **Scaling**: Use Redis adapter for multi-server setups
5. **Monitoring**: Log socket events and errors

## Utilities Reference

| Function                                 | Description           |
| ---------------------------------------- | --------------------- |
| `sendNotificationToUser(userId, data)`   | Send to specific user |
| `sendMessageToRoom(roomId, data)`        | Send to room          |
| `broadcastToAll(event, data)`            | Broadcast to all      |
| `broadcastExcept(socketId, event, data)` | Broadcast except one  |
| `getConnectedSockets()`                  | Get all sockets       |
| `getSocketsInRoom(roomId)`               | Get room sockets      |
