import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

// Live chat updates. The chat also polls slowly as a safety net, so a dropped
// socket never leaves a conversation stale.
//
// Customers join a room of their own, staff and admins share the "shop" room.
// Every event carries the same JSON the REST routes return, so the clients can
// reuse the shapes they already know.
let io = null;

export function initRealtime(httpServer, allowedOrigins) {
    io = new Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true },
    });

    // Same JWT the REST routes use, sent in the handshake instead of a header
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Not authorized."));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("_id role isActive");
            if (!user) return next(new Error("Not authorized."));
            if (user.isActive === false) return next(new Error("This account has been deactivated."));

            socket.data.user = { id: String(user._id), role: user.role };
            return next();
        } catch {
            return next(new Error("Not authorized."));
        }
    });

    io.on("connection", (socket) => {
        const { id, role } = socket.data.user;
        socket.join(`user:${id}`);
        if (role === "staff" || role === "admin") socket.join("shop");
    });

    return io;
}

export const emitToCustomer = (customerId, event, payload) => {
    io?.to(`user:${customerId}`).emit(event, payload);
};

export const emitToShop = (event, payload) => {
    io?.to("shop").emit(event, payload);
};
