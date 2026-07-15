import { Request, Response } from "express";
import { User, UserRole } from "../models/User";
import { ExpertProfile } from "../models/ExpertProfile";
import { generateToken } from "../utils/jwt";
import { generateOtp, storeOtp, verifyOtpCode } from "../utils/otp";
import {
  uploadMulterFile,
  resolveStoredAssetUrl,
} from "../services/storageService";
import bcrypt from "bcryptjs";

const resolveAvatar = (uri?: string) => resolveStoredAssetUrl(uri) ?? uri;

const formatUserResponse = (user: InstanceType<typeof User>, token?: string) => {
  const payload: Record<string, unknown> = {
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
  if (token) payload.token = token;
  return payload;
};

const formatExpertResponse = (
  expert: InstanceType<typeof ExpertProfile>,
  token?: string,
) => {
  const payload: Record<string, unknown> = {
    _id: expert._id,
    name: expert.name,
    phone: expert.phone,
    email: expert.email,
    role: UserRole.EXPERT,
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
  if (token) payload.token = token;
  return payload;
};

// @desc    Send OTP to phone
// @route   POST /api/auth/otp/send
// @access  Public
export const sendOtp = async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  const code = generateOtp();
  storeOtp(phone, code);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP] ${phone} => ${code}`);
  }

  res.json({
    success: true,
    message: "Verification code sent",
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
  });
};

// @desc    Verify OTP and authenticate
// @route   POST /api/auth/otp/verify
// @access  Public
export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, code, role, name } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ message: "Phone and code are required" });
  }

  if (!verifyOtpCode(phone, code)) {
    return res.status(401).json({ message: "Invalid or expired verification code" });
  }

  const requestedRole =
    role === UserRole.EXPERT ? UserRole.EXPERT : UserRole.CUSTOMER;

  if (requestedRole === UserRole.EXPERT) {
    let expert = await ExpertProfile.findOne({ phone });
    if (!expert) {
      expert = await ExpertProfile.create({
        phone,
        name: name || "New User",
        profileComplete: false,
      });
    }

    return res.json(
      formatExpertResponse(
        expert,
        generateToken(String(expert._id), UserRole.EXPERT),
      ),
    );
  }

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      phone,
      name: name || "New User",
      role: UserRole.CUSTOMER,
    });
  }

  res.json(
    formatUserResponse(user, generateToken(String(user._id), user.role)),
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { name, phone, email, password, role } = req.body;

  if (role === UserRole.EXPERT) {
    return res.status(400).json({
      message: "Expert accounts are managed via expert profiles only",
    });
  }

  const userExists = await User.findOne({ phone });
  if (userExists) {
    return res
      .status(400)
      .json({ message: "User already exists with this phone number" });
  }

  let hashedPassword = undefined;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

  const user = await User.create({
    name,
    phone,
    email,
    password: hashedPassword,
    role: UserRole.CUSTOMER,
  });

  if (user) {
    res
      .status(201)
      .json(formatUserResponse(user, generateToken(String(user._id), user.role)));
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(401).json({ message: "Invalid phone or password" });
  }

  if (user.password && password) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }
  }

  res.json(formatUserResponse(user, generateToken(String(user._id), user.role)));
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: any, res: Response) => {
  if (req.user.role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(req.user._id);
    if (!expert) {
      return res.status(404).json({ message: "Expert profile not found" });
    }
    return res.json(formatExpertResponse(expert));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(formatUserResponse(user));
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
export const updateUserProfile = async (req: any, res: Response) => {
  if (req.user.role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(req.user._id);
    if (!expert) {
      return res.status(404).json({ message: "Expert profile not found" });
    }

    const {
      name,
      email,
      avatarUri,
      location,
      headline,
      available,
      bio,
      categories,
      expertise,
      experience,
      profileComplete,
    } = req.body;

    if (name !== undefined) expert.name = name;
    if (email !== undefined) expert.email = email;
    if (avatarUri !== undefined) expert.avatarUri = avatarUri;
    if (location !== undefined) expert.location = location;
    if (headline !== undefined) expert.headline = headline;
    if (bio !== undefined) expert.bio = bio;
    if (available !== undefined) expert.available = available;
    if (experience !== undefined) expert.experience = experience;
    const cats = categories || expertise;
    if (cats !== undefined) expert.categories = cats;
    if (profileComplete !== undefined) expert.profileComplete = profileComplete;

    const hasName = expert.name && expert.name !== "New User";
    if (hasName && profileComplete !== false) {
      expert.profileComplete = true;
    }

    await expert.save();
    return res.json(formatExpertResponse(expert));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const {
    name,
    email,
    avatarUri,
    location,
    headline,
    available,
    bio,
    profileComplete,
  } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (avatarUri !== undefined) user.avatarUri = avatarUri;
  if (location !== undefined) user.location = location;
  if (headline !== undefined) user.headline = headline;
  if (bio !== undefined) user.bio = bio;
  if (available !== undefined) user.available = available;
  if (profileComplete !== undefined) user.profileComplete = profileComplete;

  const hasName = user.name && user.name !== "New User";
  if (hasName && profileComplete !== false) {
    user.profileComplete = true;
  }

  await user.save();
  res.json(formatUserResponse(user));
};

// @desc    Upload profile avatar
// @route   POST /api/auth/avatar
// @access  Private
export const uploadAvatar = async (req: any, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const avatarPath = await uploadMulterFile(file, "avatars");

  if (req.user.role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(req.user._id);
    if (!expert) {
      return res.status(404).json({ message: "Expert profile not found" });
    }
    expert.avatarUri = avatarPath;
    await expert.save();
    return res.json(formatExpertResponse(expert));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.avatarUri = avatarPath;
  await user.save();
  res.json(formatUserResponse(user));
};
