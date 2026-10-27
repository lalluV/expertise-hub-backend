"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authorize = exports.protect = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = (0, jwt_1.verifyToken)(token);
            if (decoded.role === User_1.UserRole.EXPERT) {
                const expert = await ExpertProfile_1.ExpertProfile.findById(decoded.id);
                if (!expert) {
                    return res
                        .status(401)
                        .json({ message: "Not authorized, expert profile not found" });
                }
                if (!(0, jwt_1.tokenVersionMatches)(decoded, expert)) {
                    return res
                        .status(401)
                        .json({ message: "Session expired, please sign in again" });
                }
                req.user = { ...expert.toObject(), role: User_1.UserRole.EXPERT };
            }
            else {
                req.user = await User_1.User.findById(decoded.id).select("-password");
                if (!req.user) {
                    return res
                        .status(401)
                        .json({ message: "Not authorized, user not found" });
                }
                if (!(0, jwt_1.tokenVersionMatches)(decoded, req.user)) {
                    return res
                        .status(401)
                        .json({ message: "Session expired, please sign in again" });
                }
            }
            return next();
        }
        catch {
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};
exports.protect = protect;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user?.role} is not authorized to access this route`,
            });
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Like `protect`, but never rejects: sets req.user when a valid Bearer token
 * is present and continues anonymously otherwise. Used by public endpoints
 * that shape output per viewer (e.g. expert name privacy).
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const header = req.headers.authorization;
        if (header && header.startsWith("Bearer")) {
            const decoded = (0, jwt_1.verifyToken)(header.split(" ")[1]);
            if (decoded.role === User_1.UserRole.EXPERT) {
                const expert = await ExpertProfile_1.ExpertProfile.findById(decoded.id);
                if (expert && (0, jwt_1.tokenVersionMatches)(decoded, expert))
                    req.user = { ...expert.toObject(), role: User_1.UserRole.EXPERT };
            }
            else {
                const user = await User_1.User.findById(decoded.id).select("-password");
                if (user && (0, jwt_1.tokenVersionMatches)(decoded, user))
                    req.user = user;
            }
        }
    }
    catch {
        // ignore invalid tokens on public routes
    }
    next();
};
exports.optionalAuth = optionalAuth;
