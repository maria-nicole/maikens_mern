import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            const token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            if (!req.user) {
                return res.status(401).json({ message: "Not authorized! User not found." });
            }
            // A deactivated account is locked out of every protected route
            if (req.user.isActive === false) {
                return res.status(403).json({ message: "This account has been deactivated. Please contact the boutique." });
            }
            return next();
        } catch (err) {
            console.error("Token verification failed: ", err.message);
            return res.status(401).json({ message: "Not authorized! Token failed." });
        }
    }
    return res.status(401).json({ message: "Not authorized! Token failed." });
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") return next();
    return res.status(403).json({ message: "Admins only." });
};

export const staffOrAdmin = (req, res, next) => {
    if (req.user && ["staff", "admin"].includes(req.user.role)) return next();
    return res.status(403).json({ message: "Staff only." });
};