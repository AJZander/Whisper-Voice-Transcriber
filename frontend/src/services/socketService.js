import { io } from "socket.io-client";

let socket;

export const initSocket = () => {
    const socketUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5001";
    socket = io(socketUrl, {
        transports: ["websocket"],
        upgrade: false,
    });
    return socket;
};

export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket not initialized! Call initSocket first.");
    }
    return socket;
};

export const disconnectSocket = (s) => {
    if (s) {
        s.disconnect();
    }
};
