// src/services/socketService.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | undefined;

export const initSocket = (): Socket => {
    const socketUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL || "http://10.0.0.10:5001";
    socket = io(socketUrl, {
        transports: ["websocket"],
        upgrade: false,
    });
    return socket;
};

export const getSocket = (): Socket => {
    if (!socket) {
        throw new Error("Socket not initialized! Call initSocket first.");
    }
    return socket;
};

export const disconnectSocket = (s: Socket) => {
    if (s) {
        s.disconnect();
    }
};
