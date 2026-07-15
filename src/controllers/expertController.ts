import { Request, Response } from "express";
import { ExpertProfile } from "../models/ExpertProfile";
import {
  buildExpertPublicProfile,
  getCompletedJobsCountsByExpert,
  getReviewAveragesByExpert,
  getReviewCountsByExpert,
} from "../services/expertProfileService";
import { resolveStoredAssetUrl } from "../services/storageService";
import { getPickableCategoryNames } from "../services/categoryService";

export const createExpert = async (req: Request, res: Response) => {
  const {
    name,
    phone,
    email,
    avatarUri,
    headline,
    location,
    categories,
    experience,
    bio,
    available,
  } = req.body;

  const existing = await ExpertProfile.findOne({ phone });
  if (existing) {
    return res
      .status(400)
      .json({ message: "An expert with this phone number already exists" });
  }

  const expert = await ExpertProfile.create({
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

// @desc    Get all experts
// @route   GET /api/experts
// @access  Public
export const getExperts = async (_req: Request, res: Response) => {
  const [experts, completedCounts, reviewCounts, reviewAverages] =
    await Promise.all([
      ExpertProfile.find({}),
      getCompletedJobsCountsByExpert(),
      getReviewCountsByExpert(),
      getReviewAveragesByExpert(),
    ]);

  res.json(
    experts.map((expert) => {
      const expertId = String(expert._id);
      const reviewCount = reviewCounts.get(expertId) ?? 0;

      return {
        ...expert.toObject(),
        avatarUri: resolveStoredAssetUrl(expert.avatarUri) ?? expert.avatarUri,
        completedJobs: completedCounts.get(expertId) ?? 0,
        reviewCount,
        rating:
          reviewCount > 0 ? (reviewAverages.get(expertId) ?? 0) : 0,
        responseTime: expert.available !== false ? "< 2h" : "< 24h",
      };
    }),
  );
};

// @desc    Get pickable category names (active taxonomy + legacy in-use tags)
// @route   GET /api/experts/categories/list
// @access  Public
export const getExpertCategories = async (_req: Request, res: Response) => {
  const categories = await getPickableCategoryNames();
  res.json(categories);
};

// @desc    Get current expert's profile
// @route   GET /api/experts/me/profile
// @access  Private/Expert
export const getMyExpertProfile = async (req: any, res: Response) => {
  const expert = await ExpertProfile.findById(req.user._id);

  if (!expert) {
    return res.status(404).json({ message: "Expert profile not found" });
  }

  res.json(await buildExpertPublicProfile(expert));
};

// @desc    Get expert by ID
// @route   GET /api/experts/:id
// @access  Public
export const getExpertById = async (req: Request, res: Response) => {
  const expert = await ExpertProfile.findById(req.params.id);

  if (!expert) {
    return res.status(404).json({ message: "Expert not found" });
  }

  res.json(await buildExpertPublicProfile(expert));
};
