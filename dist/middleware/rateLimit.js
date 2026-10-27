"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const isTest = () => process.env.NODE_ENV === "test" && !process.env.RATE_LIMIT_IN_TESTS;
const json = (message) => ({ success: false, message });
/** Brute-force guard for login / register / Google / change-password (per IP, 15 min). */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: () => Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: isTest,
    message: json("Too many sign-in attempts. Please wait a few minutes and try again."),
});
/** General API ceiling per IP (15 min). */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: () => Number(process.env.API_RATE_LIMIT_MAX) || 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: isTest,
    message: json("Too many requests. Please slow down."),
});
