"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthConfig = exports.googleAuth = exports.uploadAvatar = exports.updateUserProfile = exports.getUserProfile = exports.changePassword = exports.loginUser = exports.registerUser = void 0;
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
const jwt_1 = require("../utils/jwt");
const expertProfileService_1 = require("../services/expertProfileService");
const http_1 = require("../utils/http");
const storageService_1 = require("../services/storageService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const googleAuth_1 = require("../services/googleAuth");
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
        hideName: expert.hideName ?? false,
        displayName: expert.displayName,
        customCategory: expert.customCategory,
        rate: expert.rate,
        workHistory: expert.workHistory ?? [],
        categories: expert.categories,
        experience: expert.experience,
        expertProfile: {
            _id: expert._id,
            bio: expert.bio,
            categories: expert.categories,
            customCategory: expert.customCategory,
            experience: expert.experience,
            rate: expert.rate,
            rating: expert.rating,
            hideName: expert.hideName ?? false,
            displayName: expert.displayName,
            workHistory: expert.workHistory ?? [],
            available: expert.available ?? true,
        },
    };
    if (token)
        payload.token = token;
    return payload;
};
const emailTaken = async (email) => {
    const [user, expert] = await Promise.all([
        User_1.User.findOne({ email }),
        ExpertProfile_1.ExpertProfile.findOne({ email }),
    ]);
    return Boolean(user || expert);
};
// @desc    Register with email + password (customer or expert)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, password, role } = req.body;
    const email = String(req.body.email).trim().toLowerCase();
    if (await emailTaken(email)) {
        return res
            .status(409)
            .json({ message: "An account with this email already exists" });
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    if (role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.create({
            name,
            email,
            password: hashedPassword,
            profileComplete: false,
        });
        return res
            .status(201)
            .json(formatExpertResponse(expert, (0, jwt_1.generateToken)(String(expert._id), User_1.UserRole.EXPERT, expert.tokenVersion ?? 0)));
    }
    const user = await User_1.User.create({
        name,
        email,
        password: hashedPassword,
        role: User_1.UserRole.CUSTOMER,
    });
    res
        .status(201)
        .json(formatUserResponse(user, (0, jwt_1.generateToken)(String(user._id), user.role, user.tokenVersion ?? 0)));
};
exports.registerUser = registerUser;
// @desc    Login with email + password (any role). Legacy: admin may also
//          login with phone + password.
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, phone, password } = req.body;
    const invalid = () => res.status(401).json({ message: "Invalid email or password" });
    if (email) {
        const normalized = email.trim().toLowerCase();
        const user = await User_1.User.findOne({ email: normalized });
        if (user) {
            if (!user.password || !(await bcryptjs_1.default.compare(password, user.password))) {
                return invalid();
            }
            return res.json(formatUserResponse(user, (0, jwt_1.generateToken)(String(user._id), user.role, user.tokenVersion ?? 0)));
        }
        const expert = await ExpertProfile_1.ExpertProfile.findOne({ email: normalized });
        if (expert) {
            if (!expert.password || !(await bcryptjs_1.default.compare(password, expert.password))) {
                return invalid();
            }
            return res.json(formatExpertResponse(expert, (0, jwt_1.generateToken)(String(expert._id), User_1.UserRole.EXPERT, expert.tokenVersion ?? 0)));
        }
        return invalid();
    }
    // Legacy admin phone + password login
    const admin = await User_1.User.findOne({ phone, role: User_1.UserRole.ADMIN });
    if (!admin || !admin.password || !(await bcryptjs_1.default.compare(password, admin.password))) {
        return res.status(401).json({ message: "Invalid phone or password" });
    }
    res.json(formatUserResponse(admin, (0, jwt_1.generateToken)(String(admin._id), admin.role, admin.tokenVersion ?? 0)));
};
exports.loginUser = loginUser;
// @desc    Change own password
// @route   PUT /api/auth/change-password  (POST also accepted)
// @access  Private
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const account = req.user.role === User_1.UserRole.EXPERT
        ? await ExpertProfile_1.ExpertProfile.findById(req.user._id)
        : await User_1.User.findById(req.user._id);
    if (!account) {
        throw new http_1.HttpError(404, "Account not found");
    }
    if (!account.password ||
        !(await bcryptjs_1.default.compare(currentPassword, account.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
    }
    if (currentPassword === newPassword) {
        return res
            .status(400)
            .json({ message: "New password must be different from the current one" });
    }
    account.password = await bcryptjs_1.default.hash(newPassword, 10);
    // Invalidate every existing session for this account.
    account.tokenVersion = (account.tokenVersion ?? 0) + 1;
    await account.save();
    const role = req.user.role === User_1.UserRole.EXPERT ? User_1.UserRole.EXPERT : account.role;
    res.json({
        success: true,
        message: "Password updated",
        // Fresh token for the device that changed the password.
        token: (0, jwt_1.generateToken)(String(account._id), role, account.tokenVersion),
    });
};
exports.changePassword = changePassword;
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
        await (0, expertProfileService_1.applyExpertProfileUpdate)(expert, req.body, false);
        return res.json(formatExpertResponse(expert));
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const { name, email, avatarUri, location, headline, available, bio, profileComplete, } = req.body;
    if (name !== undefined)
        user.name = name;
    if (email !== undefined && email !== "") {
        const normalized = String(email).trim().toLowerCase();
        if (normalized !== user.email) {
            const [inUsers, inExperts] = await Promise.all([
                User_1.User.findOne({ email: normalized, _id: { $ne: user._id } }),
                ExpertProfile_1.ExpertProfile.findOne({ email: normalized }),
            ]);
            if (inUsers || inExperts) {
                return res
                    .status(409)
                    .json({ message: "An account with this email already exists" });
            }
            user.email = normalized;
        }
    }
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
// @desc    Sign in / sign up with a Google ID token (customers and experts).
//          First-time users must choose a role: the first call without
//          `role` answers { needsRole: true } and the client calls again.
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
    if (!(0, googleAuth_1.isGoogleAuthConfigured)()) {
        return res
            .status(503)
            .json({ message: "Google sign-in is not configured on this server" });
    }
    const { idToken, role } = req.body;
    let identity;
    try {
        identity = await (0, googleAuth_1.verifyGoogleIdToken)(idToken);
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired Google token" });
    }
    if (!identity.email || !identity.emailVerified) {
        return res.status(401).json({
            message: "Your Google email address is not verified",
        });
    }
    const email = identity.email.toLowerCase();
    const [user, expert] = await Promise.all([
        User_1.User.findOne({ $or: [{ googleId: identity.sub }, { email }] }),
        ExpertProfile_1.ExpertProfile.findOne({ $or: [{ googleId: identity.sub }, { email }] }),
    ]);
    const linkGoogle = async (account) => {
        if (account.googleId && account.googleId !== identity.sub) {
            return false;
        }
        if (!account.googleId) {
            account.googleId = identity.sub;
            if (!account.avatarUri && identity.picture)
                account.avatarUri = identity.picture;
            await account.save();
        }
        return true;
    };
    const conflict = (existing) => res.status(409).json({
        message: `This email is already registered as ${existing === "expert" ? "an expert" : "a customer"}. Sign in as ${existing === "expert" ? "an expert" : "a customer"} instead.`,
        existingRole: existing,
    });
    if (user) {
        if (user.role === User_1.UserRole.ADMIN) {
            return res.status(403).json({
                message: "Admin accounts must sign in with email/phone and password",
            });
        }
        if (user.available === false) {
            return res.status(403).json({ message: "This account has been disabled" });
        }
        if (role && role !== User_1.UserRole.CUSTOMER)
            return conflict("customer");
        if (!(await linkGoogle(user))) {
            return res
                .status(409)
                .json({ message: "This email is linked to a different Google account" });
        }
        return res.json(formatUserResponse(user, (0, jwt_1.generateToken)(String(user._id), user.role, user.tokenVersion ?? 0)));
    }
    if (expert) {
        if (role && role !== User_1.UserRole.EXPERT)
            return conflict("expert");
        if (!(await linkGoogle(expert))) {
            return res
                .status(409)
                .json({ message: "This email is linked to a different Google account" });
        }
        return res.json(formatExpertResponse(expert, (0, jwt_1.generateToken)(String(expert._id), User_1.UserRole.EXPERT, expert.tokenVersion ?? 0)));
    }
    // New account: ask the client to pick a role first.
    if (!role) {
        return res.json({
            needsRole: true,
            email,
            name: identity.name ?? null,
            picture: identity.picture ?? null,
        });
    }
    const name = (identity.name || email.split("@")[0]).slice(0, 100);
    if (role === User_1.UserRole.EXPERT) {
        const created = await ExpertProfile_1.ExpertProfile.create({
            name,
            email,
            googleId: identity.sub,
            avatarUri: identity.picture,
            profileComplete: false,
        });
        return res.status(201).json({
            ...formatExpertResponse(created, (0, jwt_1.generateToken)(String(created._id), User_1.UserRole.EXPERT, 0)),
            isNewUser: true,
        });
    }
    const created = await User_1.User.create({
        name,
        email,
        googleId: identity.sub,
        avatarUri: identity.picture,
        role: User_1.UserRole.CUSTOMER,
    });
    res.status(201).json({
        ...formatUserResponse(created, (0, jwt_1.generateToken)(String(created._id), created.role, 0)),
        isNewUser: true,
    });
};
exports.googleAuth = googleAuth;
// @desc    Public auth config (which providers are enabled)
// @route   GET /api/auth/config
// @access  Public
const getAuthConfig = (_req, res) => {
    res.json({ google: (0, googleAuth_1.isGoogleAuthConfigured)() });
};
exports.getAuthConfig = getAuthConfig;
