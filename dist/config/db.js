"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbReadyState = exports.syncAccountIndexes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
/** Aligns unique/sparse indexes (phone/email) with the current schemas. */
const syncAccountIndexes = async () => {
    try {
        await Promise.all([User_1.User.syncIndexes(), ExpertProfile_1.ExpertProfile.syncIndexes()]);
    }
    catch (error) {
        console.error(`Index sync warning: ${error.message}`);
    }
};
exports.syncAccountIndexes = syncAccountIndexes;
/** 1 = connected (used by the readiness probe). */
const dbReadyState = () => mongoose_1.default.connection.readyState;
exports.dbReadyState = dbReadyState;
const connectDB = async () => {
    try {
        // No fallback: a missing MONGO_URI must never silently point at a real database.
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI)
            throw new Error("MONGO_URI environment variable is required");
        const conn = await mongoose_1.default.connect(mongoURI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await (0, exports.syncAccountIndexes)();
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
exports.default = connectDB;
