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
exports.getReviewCountsByExpert = getReviewCountsByExpert;
exports.getCompletedJobsCountsByExpert = getCompletedJobsCountsByExpert;
exports.mapExpertListItem = mapExpertListItem;
exports.loadExpertStats = loadExpertStats;
exports.buildExpertPublicProfile = buildExpertPublicProfile;
exports.applyExpertProfileUpdate = applyExpertProfileUpdate;
const mongoose_1 = __importDefault(require("mongoose"));
const ExpertProfile_1 = require("../models/ExpertProfile");
const User_1 = require("../models/User");
const Request_1 = require("../models/Request");
const storageService_1 = require("./storageService");
const expertPrivacy_1 = require("../utils/expertPrivacy");
const requestShape_1 = require("../utils/requestShape");
const http_1 = require("../utils/http");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const expertMatchFilter = (expertId) => {
    const oid = new mongoose_1.default.Types.ObjectId(expertId);
    return {
        $or: [{ expert: oid }, { "task.expert": oid }],
    };
};
/** Only approved (or legacy status-less) reviews on completed requests. */
const countedReviewFilter = (expertId) => ({
    status: Request_1.RequestStatus.COMPLETED,
    ...requestShape_1.APPROVED_REVIEW_MATCH,
    ...expertMatchFilter(expertId),
});
async function getCompletedJobsCount(expertId) {
    return Request_1.RequestModel.countDocuments({
        status: Request_1.RequestStatus.COMPLETED,
        ...expertMatchFilter(expertId),
    });
}
async function getReviewCount(expertId) {
    return Request_1.RequestModel.countDocuments(countedReviewFilter(expertId));
}
const parseCategory = (description) => {
    const match = description?.match(/^\[([^\]]+)\]/);
    return match?.[1]?.trim() || "Verified Client";
};
/** Public (approved-only) testimonials for an expert. */
async function getExpertTestimonials(expertId, limit = 20) {
    const requests = await Request_1.RequestModel.find(countedReviewFilter(expertId))
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
            adminWritten: Boolean(review.adminWritten),
            createdAt: review.createdAt?.toISOString() ||
                request.updatedAt?.toISOString() ||
                new Date().toISOString(),
        };
    });
}
/** Recomputes the stored expert rating from approved reviews only. */
async function recalculateExpertRating(expertId) {
    const requests = await Request_1.RequestModel.find(countedReviewFilter(expertId)).select("review.rating");
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
                ...requestShape_1.APPROVED_REVIEW_MATCH,
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
async function getReviewCountsByExpert() {
    const rows = await Request_1.RequestModel.aggregate([
        {
            $match: {
                status: Request_1.RequestStatus.COMPLETED,
                ...requestShape_1.APPROVED_REVIEW_MATCH,
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
/** List item (no testimonials), shaped for the viewer. */
function mapExpertListItem(expert, stats, viewer) {
    const expertId = String(expert._id);
    const reviewCount = stats.reviewCounts.get(expertId) ?? 0;
    const shaped = (0, expertPrivacy_1.shapeExpertForViewer)(expert, viewer);
    return {
        ...shaped,
        avatarUri: (0, storageService_1.resolveStoredAssetUrl)(expert.avatarUri) ?? expert.avatarUri,
        completedJobs: stats.completedCounts.get(expertId) ?? 0,
        reviewCount,
        rating: reviewCount > 0 ? (stats.reviewAverages.get(expertId) ?? 0) : 0,
    };
}
async function loadExpertStats() {
    const [completedCounts, reviewCounts, reviewAverages] = await Promise.all([
        getCompletedJobsCountsByExpert(),
        getReviewCountsByExpert(),
        getReviewAveragesByExpert(),
    ]);
    return { completedCounts, reviewCounts, reviewAverages };
}
async function buildExpertPublicProfile(expert, viewer) {
    const expertId = String(expert._id);
    const [completedJobs, reviewCount, testimonials, ratingRows] = await Promise.all([
        getCompletedJobsCount(expertId),
        getReviewCount(expertId),
        getExpertTestimonials(expertId),
        getReviewAveragesByExpert(),
    ]);
    const shaped = (0, expertPrivacy_1.shapeExpertForViewer)(expert, viewer);
    return {
        ...shaped,
        avatarUri: (0, storageService_1.resolveStoredAssetUrl)(expert.avatarUri) ?? expert.avatarUri,
        completedJobs,
        reviewCount,
        rating: reviewCount > 0 ? (ratingRows.get(expertId) ?? 0) : 0,
        testimonials,
    };
}
/**
 * Applies editable profile fields from a validated body onto an expert doc.
 * `isAdmin` additionally allows phone changes. Throws HttpError on conflicts.
 */
async function applyExpertProfileUpdate(expert, body, isAdmin) {
    const { name, phone, email, avatarUri, photoUrl, headline, location, categories, skills, expertise, customCategory, experience, rate, bio, available, hideName, displayName, workHistory, profileComplete, } = body;
    if (name !== undefined)
        expert.name = name;
    if (email !== undefined && email !== "") {
        const normalized = String(email).trim().toLowerCase();
        if (normalized !== expert.email) {
            const [inUsers, inExperts] = await Promise.all([
                User_1.User.findOne({ email: normalized }),
                ExpertProfile_1.ExpertProfile.findOne({ email: normalized, _id: { $ne: expert._id } }),
            ]);
            if (inUsers || inExperts) {
                throw new http_1.HttpError(409, "An account with this email already exists");
            }
            expert.email = normalized;
        }
    }
    if (isAdmin && phone !== undefined && phone !== expert.phone) {
        const taken = await ExpertProfile_1.ExpertProfile.findOne({
            phone,
            _id: { $ne: expert._id },
        });
        if (taken) {
            throw new http_1.HttpError(409, "An expert with this phone number already exists");
        }
        expert.phone = phone;
    }
    const avatar = avatarUri ?? photoUrl;
    if (avatar !== undefined)
        expert.avatarUri = avatar;
    if (headline !== undefined)
        expert.headline = headline;
    if (location !== undefined)
        expert.location = location;
    const cats = categories ?? skills ?? expertise;
    if (cats !== undefined) {
        expert.categories = Array.from(new Set(cats));
    }
    if (customCategory !== undefined) {
        expert.customCategory = customCategory || undefined;
    }
    if (experience !== undefined)
        expert.experience = experience;
    if (rate !== undefined)
        expert.rate = rate;
    if (bio !== undefined)
        expert.bio = bio;
    if (available !== undefined)
        expert.available = available;
    if (hideName !== undefined)
        expert.hideName = hideName;
    if (displayName !== undefined)
        expert.displayName = displayName || undefined;
    if (workHistory !== undefined) {
        expert.workHistory = workHistory.map((item) => ({
            company: item.company,
            role: item.role,
            startYear: item.startYear,
            endYear: item.endYear ?? null,
            description: item.description ?? "",
        }));
    }
    if (profileComplete !== undefined)
        expert.profileComplete = profileComplete;
    if ((expert.categories ?? []).includes(marketplaceSchemas_1.OTHER_CATEGORY) && !expert.customCategory) {
        throw new http_1.HttpError(400, "customCategory is required when categories include 'Other'");
    }
    if (!(expert.categories ?? []).includes(marketplaceSchemas_1.OTHER_CATEGORY)) {
        expert.customCategory = undefined;
    }
    if (expert.name && profileComplete !== false) {
        expert.profileComplete = true;
    }
    await expert.save();
    return expert;
}
