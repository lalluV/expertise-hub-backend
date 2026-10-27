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
    const [experts, stats] = await Promise.all([
        ExpertProfile_1.ExpertProfile.find({ _id: { $in: ids } }),
        (0, expertProfileService_1.loadExpertStats)(),
    ]);
    const order = new Map(ids.map((id, index) => [String(id), index]));
    const sorted = [...experts].sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    res.json({
        // Customers get the privacy-shaped name (displayName / initials)
        data: sorted.map(expert => (0, expertProfileService_1.mapExpertListItem)(expert, stats, req.user)),
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
    // Atomic toggle: concurrent clicks (double-tap, two tabs) cannot hit a VersionError.
    const before = await User_1.User.findById(req.user._id).select("savedExpertIds").lean();
    if (!before) {
        return res.status(404).json({ message: "User not found" });
    }
    const exists = (before.savedExpertIds ?? []).map(String).includes(expertId);
    const user = await User_1.User.findByIdAndUpdate(req.user._id, exists ? { $pull: { savedExpertIds: expert._id } } : { $addToSet: { savedExpertIds: expert._id } }, { new: true }).select("savedExpertIds");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const savedExpertIds = (user.savedExpertIds ?? []).map(String);
    res.json({
        saved: !exists,
        savedExpertIds,
        message: exists ? "Expert removed from saved" : "Expert saved",
    });
};
exports.toggleSavedExpert = toggleSavedExpert;
