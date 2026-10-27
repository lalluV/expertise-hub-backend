"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpertProfile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
function stripSecrets(_doc, ret) {
    delete ret.password;
    return ret;
}
const WorkHistorySchema = new mongoose_1.Schema({
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, default: null },
    description: { type: String, default: "" },
}, { _id: false });
const ExpertProfileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
    },
    password: { type: String }, // bcrypt hash
    avatarUri: { type: String },
    headline: { type: String },
    location: { type: String },
    categories: [{ type: String }],
    customCategory: { type: String, trim: true },
    experience: { type: Number, default: 0 },
    rate: { type: Number, min: 0 },
    rating: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    hideName: { type: Boolean, default: false },
    displayName: { type: String, trim: true },
    workHistory: { type: [WorkHistorySchema], default: [] },
    available: { type: Boolean, default: true },
    profileComplete: { type: Boolean, default: false },
    readNotificationIds: [{ type: String }],
    declinedRequestIds: [{ type: String }],
    tokenVersion: { type: Number, default: 0 },
    googleId: { type: String, unique: true, sparse: true },
}, {
    timestamps: true,
    strict: true,
    toJSON: { transform: stripSecrets },
    toObject: { transform: stripSecrets },
});
exports.ExpertProfile = mongoose_1.default.model("ExpertProfile", ExpertProfileSchema);
