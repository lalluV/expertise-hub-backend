"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleSavedExpert = exports.getSavedExperts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
const expertProfileService_1 = require("../services/expertProfileService");
const storageService_1 = require("../services/storageService");
const mapExpertListItem = (expert, completedCounts, reviewCounts, reviewAverages) => {
    const expertId = String(expert._id);
    const reviewCount = reviewCounts.get(expertId) ?? 0;
    return {
        ...expert.toObject(),
        avatarUri: (0, storageService_1.resolveStoredAssetUrl)(expert.avatarUri) ?? expert.avatarUri,
        completedJobs: completedCounts.get(expertId) ?? 0,
        reviewCount,
        rating: reviewCount > 0 ? (reviewAverages.get(expertId) ?? 0) : 0,
        responseTime: expert.available !== false ? "< 2h" : "< 24h",
    };
};
const getSavedExperts = async (req, res) => {
    if (req.user.role !== User_1.UserRole.CUSTOMER) {
        return res.status(403).json({ message: "Customers only" });
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const ids = user.savedExpertIds ?? [];
    if (ids.length === 0) {
        return res.json({ data: [], savedExpertIds: [] });
    }
    const [experts, completedCounts, reviewCounts, reviewAverages] = await Promise.all([
        ExpertProfile_1.ExpertProfile.find({ _id: { $in: ids } }),
        (0, expertProfileService_1.getCompletedJobsCountsByExpert)(),
        (0, expertProfileService_1.getReviewCountsByExpert)(),
        (0, expertProfileService_1.getReviewAveragesByExpert)(),
    ]);
    const order = new Map(ids.map((id, index) => [String(id), index]));
    const sorted = [...experts].sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    res.json({
        data: sorted.map(expert => mapExpertListItem(expert, completedCounts, reviewCounts, reviewAverages)),
        savedExpertIds: ids.map(String),
    });
};
exports.getSavedExperts = getSavedExperts;
const toggleSavedExpert = async (req, res) => {
    if (req.user.role !== User_1.UserRole.CUSTOMER) {
        return res.status(403).json({ message: "Customers only" });
    }
    const { expertId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(expertId)) {
        return res.status(400).json({ message: "Invalid expert id" });
    }
    const expert = await ExpertProfile_1.ExpertProfile.findById(expertId);
    if (!expert) {
        return res.status(404).json({ message: "Expert not found" });
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const current = (user.savedExpertIds ?? []).map(String);
    const exists = current.includes(expertId);
    user.savedExpertIds = exists
        ? user.savedExpertIds.filter(id => String(id) !== expertId)
        : [...(user.savedExpertIds ?? []), expert._id];
    await user.save();
    const savedExpertIds = (user.savedExpertIds ?? []).map(String);
    res.json({
        saved: !exists,
        savedExpertIds,
        message: exists ? "Expert removed from saved" : "Expert saved",
    });
};
exports.toggleSavedExpert = toggleSavedExpert;
