"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletedJobsCount = getCompletedJobsCount;
exports.getReviewCount = getReviewCount;
exports.getExpertTestimonials = getExpertTestimonials;
exports.recalculateExpertRating = recalculateExpertRating;
exports.getReviewAveragesByExpert = getReviewAveragesByExpert;
exports.buildExpertPublicProfile = buildExpertPublicProfile;
exports.getReviewCountsByExpert = getReviewCountsByExpert;
exports.getCompletedJobsCountsByExpert = getCompletedJobsCountsByExpert;
const mongoose_1 = __importDefault(require("mongoose"));
const ExpertProfile_1 = require("../models/ExpertProfile");
const Request_1 = require("../models/Request");
const storageService_1 = require("./storageService");
const expertMatchFilter = (expertId) => {
    const oid = new mongoose_1.default.Types.ObjectId(expertId);
    return {
        $or: [{ expert: oid }, { "task.expert": oid }],
    };
};
async function getCompletedJobsCount(expertId) {
    return Request_1.RequestModel.countDocuments({
        status: Request_1.RequestStatus.COMPLETED,
        ...expertMatchFilter(expertId),
    });
}
async function getReviewCount(expertId) {
    return Request_1.RequestModel.countDocuments({
        status: Request_1.RequestStatus.COMPLETED,
        "review.rating": { $exists: true },
        ...expertMatchFilter(expertId),
    });
}
const parseCategory = (description) => {
    const match = description?.match(/^\[([^\]]+)\]/);
    return match?.[1]?.trim() || "Verified Client";
};
async function getExpertTestimonials(expertId, limit = 20) {
    const requests = await Request_1.RequestModel.find({
        status: Request_1.RequestStatus.COMPLETED,
        "review.rating": { $exists: true },
        ...expertMatchFilter(expertId),
    })
        .sort({ "review.createdAt": -1, updatedAt: -1 })
        .limit(limit)
        .populate("customer", "name avatarUri")
        .lean();
    return requests.map((request) => {
        const customer = request.customer;
        const review = request.review;
        return {
            id: String(request._id),
            quote: review.comment,
            clientName: review.customerName || customer?.name || "Verified Client",
            clientRole: parseCategory(request.description),
            clientImage: (0, storageService_1.resolveStoredAssetUrl)(customer?.avatarUri) ?? customer?.avatarUri,
            rating: review.rating,
            createdAt: review.createdAt?.toISOString() ||
                request.updatedAt?.toISOString() ||
                new Date().toISOString(),
        };
    });
}
async function recalculateExpertRating(expertId) {
    const requests = await Request_1.RequestModel.find({
        status: Request_1.RequestStatus.COMPLETED,
        "review.rating": { $exists: true },
        ...expertMatchFilter(expertId),
    }).select("review.rating");
    if (requests.length === 0) {
        await ExpertProfile_1.ExpertProfile.findByIdAndUpdate(expertId, { rating: 0 });
        return 0;
    }
    const sum = requests.reduce((acc, request) => acc + (request.review?.rating ?? 0), 0);
    const avg = Math.round((sum / requests.length) * 10) / 10;
    await ExpertProfile_1.ExpertProfile.findByIdAndUpdate(expertId, { rating: avg });
    return avg;
}
async function getReviewAveragesByExpert() {
    const rows = await Request_1.RequestModel.aggregate([
        {
            $match: {
                status: Request_1.RequestStatus.COMPLETED,
                "review.rating": { $exists: true },
            },
        },
        {
            $project: {
                expertId: { $ifNull: ["$expert", "$task.expert"] },
                rating: "$review.rating",
            },
        },
        { $match: { expertId: { $ne: null } } },
        { $group: { _id: "$expertId", avgRating: { $avg: "$rating" } } },
    ]);
    return new Map(rows.map((row) => [
        String(row._id),
        Math.round(row.avgRating * 10) / 10,
    ]));
}
const computeRatingFromTestimonials = (testimonials) => {
    if (testimonials.length === 0)
        return 0;
    const sum = testimonials.reduce((acc, item) => acc + item.rating, 0);
    return Math.round((sum / testimonials.length) * 10) / 10;
};
async function buildExpertPublicProfile(expert) {
    const expertId = String(expert._id);
    const [completedJobs, reviewCount, testimonials] = await Promise.all([
        getCompletedJobsCount(expertId),
        getReviewCount(expertId),
        getExpertTestimonials(expertId),
    ]);
    return {
        ...expert.toObject(),
        avatarUri: (0, storageService_1.resolveStoredAssetUrl)(expert.avatarUri) ?? expert.avatarUri,
        completedJobs,
        reviewCount,
        rating: computeRatingFromTestimonials(testimonials),
        responseTime: expert.available !== false ? "< 2h" : "< 24h",
        testimonials,
    };
}
async function getReviewCountsByExpert() {
    const rows = await Request_1.RequestModel.aggregate([
        {
            $match: {
                status: Request_1.RequestStatus.COMPLETED,
                "review.rating": { $exists: true },
            },
        },
        {
            $project: {
                expertId: { $ifNull: ["$expert", "$task.expert"] },
            },
        },
        { $match: { expertId: { $ne: null } } },
        { $group: { _id: "$expertId", count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.count]));
}
async function getCompletedJobsCountsByExpert() {
    const rows = await Request_1.RequestModel.aggregate([
        { $match: { status: Request_1.RequestStatus.COMPLETED } },
        {
            $project: {
                expertId: { $ifNull: ["$expert", "$task.expert"] },
            },
        },
        { $match: { expertId: { $ne: null } } },
        { $group: { _id: "$expertId", count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.count]));
}
