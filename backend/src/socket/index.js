import { Server } from "socket.io";
import { registerDeliverySocket } from "./delivery.telemetry.socket.js";

export const attachSocket = (httpServer, { cors } = {}) => {
    const io = new Server(httpServer, {
        cors: {
            origin: cors?.origin || ["http://localhost:5173"],
            credentials: true,
        },
    });

    // Make io reachable from controllers
    // eslint-disable-next-line no-param-reassign
    httpServer.io = io;

    registerDeliverySocket(io);

    return io;
};

