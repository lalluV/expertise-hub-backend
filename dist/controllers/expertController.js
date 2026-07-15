"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpertById = exports.getMyExpertProfile = exports.getExpertCategories = exports.getExperts = exports.createExpert = void 0;
const ExpertProfile_1 = require("../models/ExpertProfile");
const expertProfileService_1 = require("../services/expertProfileService");
const storageService_1 = require("../services/storageService");
const categoryService_1 = require("../services/categoryService");
const createExpert = async (req, res) => {
    const { name, phone, email, avatarUri, headline, location, categories, experience, bio, available, } = req.body;
    const existing = await ExpertProfile_1.ExpertProfile.findOne({ phone });
    if (existing) {
        return res
            .status(400)
            .json({ message: "An expert with this phone number already exists" });
    }
    const expert = await ExpertProfile_1.ExpertProfile.create({
        name,
        phone,
        email,
        avatarUri,
        headline,
        location,
        categories: categories ?? [],
        experience: experience ?? 0,
        bio: bio ?? "",
        available: available ?? true,
        profileComplete: true,
        rating: 0,
    });
    res.status(201).json(expert);
};
exports.createExpert = createExpert;
// @desc    Get all experts
// @route   GET /api/experts
// @access  Public
const getExperts = async (_req, res) => {
    const [experts, completedCounts, reviewCounts, reviewAverages] = await Promise.all([
        ExpertProfile_1.ExpertProfile.find({}),
        (0, expertProfileService_1.getCompletedJobsCountsByExpert)(),
        (0, expertProfileService_1.getReviewCountsByExpert)(),
        (0, expertProfileService_1.getReviewAveragesByExpert)(),
    ]);
    res.json(experts.map((expert) => {
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
    }));
};
exports.getExperts = getExperts;
// @desc    Get pickable category names (active taxonomy + legacy in-use tags)
// @route   GET /api/experts/categories/list
// @access  Public
const getExpertCategories = async (_req, res) => {
    const categories = await (0, categoryService_1.getPickableCategoryNames)();
    res.json(categories);
};
exports.getExpertCategories = getExpertCategories;
// @desc    Get current expert's profile
// @route   GET /api/experts/me/profile
// @access  Private/Expert
const getMyExpertProfile = async (req, res) => {
    const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
    if (!expert) {
        return res.status(404).json({ message: "Expert profile not found" });
    }
    res.json(await (0, expertProfileService_1.buildExpertPublicProfile)(expert));
};
exports.getMyExpertProfile = getMyExpertProfile;
// @desc    Get expert by ID
// @route   GET /api/experts/:id
// @access  Public
const getExpertById = async (req, res) => {
    const expert = await ExpertProfile_1.ExpertProfile.findById(req.params.id);
    if (!expert) {
        return res.status(404).json({ message: "Expert not found" });
    }
    res.json(await (0, expertProfileService_1.buildExpertPublicProfile)(expert));
};
exports.getExpertById = getExpertById;
