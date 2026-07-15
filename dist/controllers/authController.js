"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.updateUserProfile = exports.getUserProfile = exports.loginUser = exports.registerUser = exports.verifyOtp = exports.sendOtp = void 0;
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
const jwt_1 = require("../utils/jwt");
const otp_1 = require("../utils/otp");
const storageService_1 = require("../services/storageService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const resolveAvatar = (uri) => (0, storageService_1.resolveStoredAssetUrl)(uri) ?? uri;
const formatUserResponse = (user, token) => {
    const payload = {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatarUri: resolveAvatar(user.avatarUri),
        location: user.location,
        headline: user.headline,
        bio: user.bio,
        available: user.available ?? true,
        profileComplete: user.profileComplete ?? false,
        createdAt: user.createdAt,
        savedExpertIds: (user.savedExpertIds ?? []).map(String),
    };
    if (token)
        payload.token = token;
    return payload;
};
const formatExpertResponse = (expert, token) => {
    const payload = {
        _id: expert._id,
        name: expert.name,
        phone: expert.phone,
        email: expert.email,
        role: User_1.UserRole.EXPERT,
        avatarUri: resolveAvatar(expert.avatarUri),
        location: expert.location,
        headline: expert.headline,
        bio: expert.bio,
        available: expert.available ?? true,
        profileComplete: expert.profileComplete ?? false,
        createdAt: expert.createdAt,
        expertProfile: {
            _id: expert._id,
            bio: expert.bio,
            categories: expert.categories,
            experience: expert.experience,
            rating: expert.rating,
            available: expert.available ?? true,
        },
    };
    if (token)
        payload.token = token;
    return payload;
};
// @desc    Send OTP to phone
// @route   POST /api/auth/otp/send
// @access  Public
const sendOtp = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
    }
    const code = (0, otp_1.generateOtp)();
    (0, otp_1.storeOtp)(phone, code);
    if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] ${phone} => ${code}`);
    }
    res.json({
        success: true,
        message: "Verification code sent",
        ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
};
exports.sendOtp = sendOtp;
// @desc    Verify OTP and authenticate
// @route   POST /api/auth/otp/verify
// @access  Public
const verifyOtp = async (req, res) => {
    const { phone, code, role, name } = req.body;
    if (!phone || !code) {
        return res.status(400).json({ message: "Phone and code are required" });
    }
    if (!(0, otp_1.verifyOtpCode)(phone, code)) {
        return res.status(401).json({ message: "Invalid or expired verification code" });
    }
    const requestedRole = role === User_1.UserRole.EXPERT ? User_1.UserRole.EXPERT : User_1.UserRole.CUSTOMER;
    if (requestedRole === User_1.UserRole.EXPERT) {
        let expert = await ExpertProfile_1.ExpertProfile.findOne({ phone });
        if (!expert) {
            expert = await ExpertProfile_1.ExpertProfile.create({
                phone,
                name: name || "New User",
                profileComplete: false,
            });
        }
        return res.json(formatExpertResponse(expert, (0, jwt_1.generateToken)(String(expert._id), User_1.UserRole.EXPERT)));
    }
    let user = await User_1.User.findOne({ phone });
    if (!user) {
        user = await User_1.User.create({
            phone,
            name: name || "New User",
            role: User_1.UserRole.CUSTOMER,
        });
    }
    res.json(formatUserResponse(user, (0, jwt_1.generateToken)(String(user._id), user.role)));
};
exports.verifyOtp = verifyOtp;
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, phone, email, password, role } = req.body;
    if (role === User_1.UserRole.EXPERT) {
        return res.status(400).json({
            message: "Expert accounts are managed via expert profiles only",
        });
    }
    const userExists = await User_1.User.findOne({ phone });
    if (userExists) {
        return res
            .status(400)
            .json({ message: "User already exists with this phone number" });
    }
    let hashedPassword = undefined;
    if (password) {
        const salt = await bcryptjs_1.default.genSalt(10);
        hashedPassword = await bcryptjs_1.default.hash(password, salt);
    }
    const user = await User_1.User.create({
        name,
        phone,
        email,
        password: hashedPassword,
        role: User_1.UserRole.CUSTOMER,
    });
    if (user) {
        res
            .status(201)
            .json(formatUserResponse(user, (0, jwt_1.generateToken)(String(user._id), user.role)));
    }
    else {
        res.status(400).json({ message: "Invalid user data" });
    }
};
exports.registerUser = registerUser;
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { phone, password } = req.body;
    const user = await User_1.User.findOne({ phone });
    if (!user) {
        return res.status(401).json({ message: "Invalid phone or password" });
    }
    if (user.password && password) {
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid phone or password" });
        }
    }
    res.json(formatUserResponse(user, (0, jwt_1.generateToken)(String(user._id), user.role)));
};
exports.loginUser = loginUser;
// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    if (req.user.role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
        if (!expert) {
            return res.status(404).json({ message: "Expert profile not found" });
        }
        return res.json(formatExpertResponse(expert));
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json(formatUserResponse(user));
};
exports.getUserProfile = getUserProfile;
// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    if (req.user.role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
        if (!expert) {
            return res.status(404).json({ message: "Expert profile not found" });
        }
        const { name, email, avatarUri, location, headline, available, bio, categories, expertise, experience, profileComplete, } = req.body;
        if (name !== undefined)
            expert.name = name;
        if (email !== undefined)
            expert.email = email;
        if (avatarUri !== undefined)
            expert.avatarUri = avatarUri;
        if (location !== undefined)
            expert.location = location;
        if (headline !== undefined)
            expert.headline = headline;
        if (bio !== undefined)
            expert.bio = bio;
        if (available !== undefined)
            expert.available = available;
        if (experience !== undefined)
            expert.experience = experience;
        const cats = categories || expertise;
        if (cats !== undefined)
            expert.categories = cats;
        if (profileComplete !== undefined)
            expert.profileComplete = profileComplete;
        const hasName = expert.name && expert.name !== "New User";
        if (hasName && profileComplete !== false) {
            expert.profileComplete = true;
        }
        await expert.save();
        return res.json(formatExpertResponse(expert));
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const { name, email, avatarUri, location, headline, available, bio, profileComplete, } = req.body;
    if (name !== undefined)
        user.name = name;
    if (email !== undefined)
        user.email = email;
    if (avatarUri !== undefined)
        user.avatarUri = avatarUri;
    if (location !== undefined)
        user.location = location;
    if (headline !== undefined)
        user.headline = headline;
    if (bio !== undefined)
        user.bio = bio;
    if (available !== undefined)
        user.available = available;
    if (profileComplete !== undefined)
        user.profileComplete = profileComplete;
    const hasName = user.name && user.name !== "New User";
    if (hasName && profileComplete !== false) {
        user.profileComplete = true;
    }
    await user.save();
    res.json(formatUserResponse(user));
};
exports.updateUserProfile = updateUserProfile;
// @desc    Upload profile avatar
// @route   POST /api/auth/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const avatarPath = await (0, storageService_1.uploadMulterFile)(file, "avatars");
    if (req.user.role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
        if (!expert) {
            return res.status(404).json({ message: "Expert profile not found" });
        }
        expert.avatarUri = avatarPath;
        await expert.save();
        return res.json(formatExpertResponse(expert));
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    user.avatarUri = avatarPath;
    await user.save();
    res.json(formatUserResponse(user));
};
exports.uploadAvatar = uploadAvatar;
