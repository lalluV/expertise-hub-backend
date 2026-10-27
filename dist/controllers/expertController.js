"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpertReviews = exports.getExpertById = exports.updateExpert = exports.getMyExpertProfile = exports.getExpertCategories = exports.getExperts = exports.createExpert = void 0;
const listQuery_1 = require("../utils/listQuery");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const ExpertProfile_1 = require("../models/ExpertProfile");
const User_1 = require("../models/User");
const expertProfileService_1 = require("../services/expertProfileService");
const categoryService_1 = require("../services/categoryService");
const expertPrivacy_1 = require("../utils/expertPrivacy");
const http_1 = require("../utils/http");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
// @desc    Create expert (Admin)
// @route   POST /api/experts
// @access  Private/Admin
const createExpert = async (req, res) => {
    const { name, phone, avatarUri, photoUrl, headline, location, categories, skills, customCategory, experience, rate, bio, available, hideName, displayName, workHistory, password, } = req.body;
    const email = req.body.email
        ? String(req.body.email).trim().toLowerCase()
        : undefined;
    if (phone) {
        const existing = await ExpertProfile_1.ExpertProfile.findOne({ phone });
        if (existing) {
            return res
                .status(400)
                .json({ message: "An expert with this phone number already exists" });
        }
    }
    if (email) {
        const [inUsers, inExperts] = await Promise.all([
            User_1.User.findOne({ email }),
            ExpertProfile_1.ExpertProfile.findOne({ email }),
        ]);
        if (inUsers || inExperts) {
            return res
                .status(409)
                .json({ message: "An account with this email already exists" });
        }
    }
    const cats = Array.from(new Set(categories ?? skills ?? []));
    const expert = await ExpertProfile_1.ExpertProfile.create({
        name,
        phone: phone || undefined,
        email,
        password: password ? await bcryptjs_1.default.hash(password, 10) : undefined,
        avatarUri: avatarUri ?? photoUrl,
        headline,
        location,
        categories: cats,
        customCategory: cats.includes(marketplaceSchemas_1.OTHER_CATEGORY) ? customCategory : undefined,
        experience: experience ?? 0,
        rate,
        bio: bio ?? "",
        available: available ?? true,
        hideName: hideName ?? false,
        displayName: displayName || undefined,
        workHistory: (workHistory ?? []).map((w) => ({
            company: w.company,
            role: w.role,
            startYear: w.startYear,
            endYear: w.endYear ?? null,
            description: w.description ?? "",
        })),
        profileComplete: true,
        rating: 0,
    });
    res.status(201).json((0, expertPrivacy_1.shapeExpertForViewer)(expert, req.user));
};
exports.createExpert = createExpert;
// @desc    Get all experts (name privacy applied per viewer)
// @route   GET /api/experts
// @access  Public (optional auth)
const getExperts = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const [experts, stats] = await Promise.all([
        ExpertProfile_1.ExpertProfile.find(isAdmin
            ? {}
            : { profileComplete: true, "categories.0": { $exists: true } }),
        (0, expertProfileService_1.loadExpertStats)(),
    ]);
    const q = (0, listQuery_1.parseListQuery)(req.query);
    const category = (0, listQuery_1.queryString)(req.query.category);
    let items = experts.map((expert) => (0, expertProfileService_1.mapExpertListItem)(expert, stats, req.user));
    if (category) {
        const c = category.toLowerCase();
        items = items.filter((e) => [...(e.categories ?? []), e.customCategory ?? ""].some((x) => String(x).toLowerCase() === c));
    }
    if (req.query.available === "true") {
        items = items.filter((e) => e.available !== false);
    }
    if (q.search) {
        // Search the *shaped* (privacy-safe) fields only, so a hidden expert's
        // real name can never be discovered by searching for it.
        const needle = q.search.toLowerCase();
        items = items.filter((e) => [e.name, e.displayName, e.headline, e.bio, e.location, e.customCategory, ...(e.categories ?? [])]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(needle)));
    }
    res.json((0, listQuery_1.paginate)(res, items, q));
};
exports.getExperts = getExperts;
// @desc    Get pickable category names (active taxonomy + legacy in-use tags + 'Other')
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
    res.json(await (0, expertProfileService_1.buildExpertPublicProfile)(expert, req.user));
};
exports.getMyExpertProfile = getMyExpertProfile;
// @desc    Update an expert profile. Expert: own profile only. Admin: any.
// @route   PUT /api/experts/:id   and   PUT /api/experts/me/profile
// @access  Private/Expert, Admin
const updateExpert = async (req, res) => {
    const isAdmin = req.user.role === User_1.UserRole.ADMIN;
    const targetId = req.params.id === undefined || req.params.id === "me"
        ? String(req.user._id)
        : String(req.params.id);
    if (!mongoose_1.default.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ message: "Invalid expert id" });
    }
    if (!isAdmin && targetId !== String(req.user._id)) {
        return res
            .status(403)
            .json({ message: "You can only edit your own profile" });
    }
    const expert = await ExpertProfile_1.ExpertProfile.findById(targetId);
    if (!expert) {
        return res.status(404).json({ message: "Expert not found" });
    }
    await (0, expertProfileService_1.applyExpertProfileUpdate)(expert, req.body, isAdmin);
    res.json(await (0, expertProfileService_1.buildExpertPublicProfile)(expert, req.user));
};
exports.updateExpert = updateExpert;
// @desc    Get expert by ID (name privacy applied per viewer)
// @route   GET /api/experts/:id
// @access  Public (optional auth)
const getExpertById = async (req, res) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: "Expert not found" });
    }
    const expert = await ExpertProfile_1.ExpertProfile.findById(req.params.id);
    if (!expert) {
        return res.status(404).json({ message: "Expert not found" });
    }
    const privileged = req.user?.role === "admin" ||
        String(req.user?._id) === String(expert._id);
    const listedPublicly = expert.profileComplete && (expert.categories?.length ?? 0) > 0;
    if (!privileged && !listedPublicly) {
        return res.status(404).json({ message: "Expert not found" });
    }
    res.json(await (0, expertProfileService_1.buildExpertPublicProfile)(expert, req.user));
};
exports.getExpertById = getExpertById;
// @desc    Public (approved only) reviews for an expert
// @route   GET /api/experts/:id/reviews
// @access  Public
const getExpertReviews = async (req, res) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(String(req.params.id))) {
        throw new http_1.HttpError(404, "Expert not found");
    }
    const reviews = await (0, expertProfileService_1.getExpertTestimonials)(String(req.params.id), 100);
    res.json(reviews);
};
exports.getExpertReviews = getExpertReviews;
