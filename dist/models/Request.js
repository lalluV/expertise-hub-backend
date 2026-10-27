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
exports.RequestModel = exports.ReviewStatus = exports.TaskStatus = exports.QuoteStatus = exports.RequestStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["PENDING"] = "pending";
    RequestStatus["REVIEWED"] = "reviewed";
    RequestStatus["QUOTED"] = "quoted";
    RequestStatus["ACCEPTED"] = "accepted";
    RequestStatus["REJECTED"] = "rejected";
    RequestStatus["ASSIGNED"] = "assigned";
    RequestStatus["COMPLETED"] = "completed";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["PENDING"] = "pending";
    QuoteStatus["ACCEPTED"] = "accepted";
    QuoteStatus["REJECTED"] = "rejected";
})(QuoteStatus || (exports.QuoteStatus = QuoteStatus = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["ASSIGNED"] = "assigned";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["PENDING"] = "pending";
    ReviewStatus["APPROVED"] = "approved";
    ReviewStatus["REJECTED"] = "rejected";
})(ReviewStatus || (exports.ReviewStatus = ReviewStatus = {}));
const QuoteEmbedSchema = new mongoose_1.Schema({
    basePrice: { type: Number, required: true },
    commission: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    advancePercent: { type: Number, default: 0, min: 0, max: 100 },
    advanceAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    status: {
        type: String,
        enum: Object.values(QuoteStatus),
        default: QuoteStatus.PENDING,
        required: true,
    },
}, { timestamps: true, _id: false });
const TaskEmbedSchema = new mongoose_1.Schema({
    expert: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ExpertProfile",
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(TaskStatus),
        default: TaskStatus.ASSIGNED,
        required: true,
    },
    notes: { type: String, default: "" },
}, { timestamps: true, _id: false });
const ReviewEmbedSchema = new mongoose_1.Schema({
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000 },
    customerName: { type: String },
    status: {
        type: String,
        enum: Object.values(ReviewStatus),
        default: ReviewStatus.PENDING,
    },
    adminWritten: { type: Boolean, default: false },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false }, _id: false });
const RequestSchema = new mongoose_1.Schema({
    customer: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    expert: { type: mongoose_1.Schema.Types.ObjectId, ref: "ExpertProfile", required: false },
    description: { type: String, required: true },
    category: { type: String, trim: true },
    customCategory: { type: String, trim: true },
    attachments: [{ type: String }],
    status: {
        type: String,
        enum: Object.values(RequestStatus),
        default: RequestStatus.PENDING,
        required: true,
    },
    scheduledDate: { type: Date, required: true },
    budget: { type: Number },
    quote: { type: QuoteEmbedSchema, required: false },
    task: { type: TaskEmbedSchema, required: false },
    review: { type: ReviewEmbedSchema, required: false },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["customer", "admin"] },
    cancelReason: { type: String, maxlength: 500 },
}, { timestamps: true, strict: true });
exports.RequestModel = mongoose_1.default.model("Request", RequestSchema);
