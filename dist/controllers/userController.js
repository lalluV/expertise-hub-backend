"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateManagedUserStatus = exports.createManagedUser = exports.getManagedUsers = void 0;
const listQuery_1 = require("../utils/listQuery");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
function resolveStatus(entity) {
    if (entity.available === false)
        return "inactive";
    if (entity.profileComplete === false)
        return "pending";
    return "active";
}
function formatCustomer(user) {
    return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "customer",
        status: resolveStatus(user),
        avatarUri: user.avatarUri,
        createdAt: user.createdAt,
    };
}
function formatExpert(expert) {
    return {
        _id: String(expert._id),
        name: expert.name,
        email: expert.email,
        phone: expert.phone,
        role: "expert",
        status: resolveStatus(expert),
        avatarUri: expert.avatarUri,
        createdAt: expert.createdAt,
    };
}
// @desc    Get managed users (customers + experts)
// @route   GET /api/users
// @access  Private/Admin
const getManagedUsers = async (req, res) => {
    const [customers, experts] = await Promise.all([
        User_1.User.find({ role: User_1.UserRole.CUSTOMER }).select("-password").sort({ createdAt: -1 }),
        ExpertProfile_1.ExpertProfile.find({}).sort({ createdAt: -1 }),
    ]);
    const users = [
        ...customers.map(formatCustomer),
        ...experts.map(formatExpert),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const q = (0, listQuery_1.parseListQuery)(req.query);
    const role = (0, listQuery_1.queryString)(req.query.role);
    let items = users;
    if (role)
        items = items.filter((u) => u.role === role);
    if (q.search) {
        const needle = q.search.toLowerCase();
        items = items.filter((u) => [u.name, u.email, u.phone].filter(Boolean).some((x) => String(x).toLowerCase().includes(needle)));
    }
    res.json((0, listQuery_1.paginate)(res, items, q));
};
exports.getManagedUsers = getManagedUsers;
// @desc    Create customer user
// @route   POST /api/users
// @access  Private/Admin
const createManagedUser = async (req, res) => {
    const { name, phone, password } = req.body;
    const email = req.body.email
        ? String(req.body.email).trim().toLowerCase()
        : undefined;
    if (phone) {
        const existing = await User_1.User.findOne({ phone });
        if (existing) {
            return res
                .status(400)
                .json({ message: "A user with this phone number already exists" });
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
    const user = await User_1.User.create({
        name,
        phone: phone || undefined,
        email,
        password: password ? await bcryptjs_1.default.hash(password, 10) : undefined,
        role: User_1.UserRole.CUSTOMER,
        profileComplete: true,
        available: true,
    });
    res.status(201).json(formatCustomer(user));
};
exports.createManagedUser = createManagedUser;
// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
const updateManagedUserStatus = async (req, res) => {
    const { role, status } = req.body;
    if (role === "expert") {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.params.id);
        if (!expert) {
            return res.status(404).json({ message: "User not found" });
        }
        if (status === "inactive") {
            expert.available = false;
        }
        else if (status === "pending") {
            expert.available = true;
            expert.profileComplete = false;
        }
        else {
            expert.available = true;
            expert.profileComplete = true;
        }
        await expert.save();
        return res.json(formatExpert(expert));
    }
    const user = await User_1.User.findOne({
        _id: req.params.id,
        role: User_1.UserRole.CUSTOMER,
    });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    if (status === "inactive") {
        user.available = false;
    }
    else if (status === "pending") {
        user.available = true;
        user.profileComplete = false;
    }
    else {
        user.available = true;
        user.profileComplete = true;
    }
    await user.save();
    res.json(formatCustomer(user));
};
exports.updateManagedUserStatus = updateManagedUserStatus;
