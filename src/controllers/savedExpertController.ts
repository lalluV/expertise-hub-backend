import { Response } from "express";
import mongoose from "mongoose";
import { User, UserRole } from "../models/User";
import { ExpertProfile } from "../models/ExpertProfile";
import {
  getCompletedJobsCountsByExpert,
  getReviewAveragesByExpert,
  getReviewCountsByExpert,
} from "../services/expertProfileService";
import { resolveStoredAssetUrl } from "../services/storageService";

const mapExpertListItem = (
  expert: InstanceType<typeof ExpertProfile>,
  completedCounts: Map<string, number>,
  reviewCounts: Map<string, number>,
  reviewAverages: Map<string, number>,
) => {
  const expertId = String(expert._id);
  const reviewCount = reviewCounts.get(expertId) ?? 0;

  return {
    ...expert.toObject(),
    avatarUri: resolveStoredAssetUrl(expert.avatarUri) ?? expert.avatarUri,
    completedJobs: completedCounts.get(expertId) ?? 0,
    reviewCount,
    rating: reviewCount > 0 ? (reviewAverages.get(expertId) ?? 0) : 0,
    responseTime: expert.available !== false ? "< 2h" : "< 24h",
  };
};

export const getSavedExperts = async (req: any, res: Response) => {
  if (req.user.role !== UserRole.CUSTOMER) {
    return res.status(403).json({ message: "Customers only" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const ids = user.savedExpertIds ?? [];
  if (ids.length === 0) {
    return res.json({ data: [], savedExpertIds: [] });
  }

  const [experts, completedCounts, reviewCounts, reviewAverages] =
    await Promise.all([
      ExpertProfile.find({ _id: { $in: ids } }),
      getCompletedJobsCountsByExpert(),
      getReviewCountsByExpert(),
      getReviewAveragesByExpert(),
    ]);

  const order = new Map(ids.map((id, index) => [String(id), index]));
  const sorted = [...experts].sort(
    (a, b) =>
      (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0),
  );

  res.json({
    data: sorted.map(expert =>
      mapExpertListItem(expert, completedCounts, reviewCounts, reviewAverages),
    ),
    savedExpertIds: ids.map(String),
  });
};

export const toggleSavedExpert = async (req: any, res: Response) => {
  if (req.user.role !== UserRole.CUSTOMER) {
    return res.status(403).json({ message: "Customers only" });
  }

  const { expertId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(expertId)) {
    return res.status(400).json({ message: "Invalid expert id" });
  }

  const expert = await ExpertProfile.findById(expertId);
  if (!expert) {
    return res.status(404).json({ message: "Expert not found" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const current = (user.savedExpertIds ?? []).map(String);
  const exists = current.includes(expertId);
  user.savedExpertIds = exists
    ? user.savedExpertIds!.filter(id => String(id) !== expertId)
    : [...(user.savedExpertIds ?? []), expert._id];

  await user.save();

  const savedExpertIds = (user.savedExpertIds ?? []).map(String);

  res.json({
    saved: !exists,
    savedExpertIds,
    message: exists ? "Expert removed from saved" : "Expert saved",
  });
};
