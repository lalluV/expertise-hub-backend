import mongoose from "mongoose";
import { ExpertProfile } from "../models/ExpertProfile";
import { RequestModel, RequestStatus } from "../models/Request";
import { resolveStoredAssetUrl } from "./storageService";

export interface ExpertTestimonialDto {
  id: string;
  quote: string;
  clientName: string;
  clientRole: string;
  clientImage?: string;
  rating: number;
  createdAt: string;
}

const expertMatchFilter = (expertId: string) => {
  const oid = new mongoose.Types.ObjectId(expertId);
  return {
    $or: [{ expert: oid }, { "task.expert": oid }],
  };
};

export async function getCompletedJobsCount(expertId: string): Promise<number> {
  return RequestModel.countDocuments({
    status: RequestStatus.COMPLETED,
    ...expertMatchFilter(expertId),
  });
}

export async function getReviewCount(expertId: string): Promise<number> {
  return RequestModel.countDocuments({
    status: RequestStatus.COMPLETED,
    "review.rating": { $exists: true },
    ...expertMatchFilter(expertId),
  });
}

const parseCategory = (description?: string) => {
  const match = description?.match(/^\[([^\]]+)\]/);
  return match?.[1]?.trim() || "Verified Client";
};

export async function getExpertTestimonials(
  expertId: string,
  limit = 20,
): Promise<ExpertTestimonialDto[]> {
  const requests = await RequestModel.find({
    status: RequestStatus.COMPLETED,
    "review.rating": { $exists: true },
    ...expertMatchFilter(expertId),
  })
    .sort({ "review.createdAt": -1, updatedAt: -1 })
    .limit(limit)
    .populate("customer", "name avatarUri")
    .lean();

  return requests.map((request) => {
    const customer = request.customer as
      | { name?: string; avatarUri?: string }
      | undefined;
    const review = request.review!;

    return {
      id: String(request._id),
      quote: review.comment,
      clientName: review.customerName || customer?.name || "Verified Client",
      clientRole: parseCategory(request.description),
      clientImage: resolveStoredAssetUrl(customer?.avatarUri) ?? customer?.avatarUri,
      rating: review.rating,
      createdAt:
        review.createdAt?.toISOString() ||
        request.updatedAt?.toISOString() ||
        new Date().toISOString(),
    };
  });
}

export async function recalculateExpertRating(expertId: string): Promise<number> {
  const requests = await RequestModel.find({
    status: RequestStatus.COMPLETED,
    "review.rating": { $exists: true },
    ...expertMatchFilter(expertId),
  }).select("review.rating");

  if (requests.length === 0) {
    await ExpertProfile.findByIdAndUpdate(expertId, { rating: 0 });
    return 0;
  }

  const sum = requests.reduce((acc, request) => acc + (request.review?.rating ?? 0), 0);
  const avg = Math.round((sum / requests.length) * 10) / 10;
  await ExpertProfile.findByIdAndUpdate(expertId, { rating: avg });
  return avg;
}

export async function getReviewAveragesByExpert(): Promise<Map<string, number>> {
  const rows = await RequestModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    avgRating: number;
  }>([
    {
      $match: {
        status: RequestStatus.COMPLETED,
        "review.rating": { $exists: true },
      },
    },
    {
      $project: {
        expertId: { $ifNull: ["$expert", "$task.expert"] },
        rating: "$review.rating",
      },
    },
    { $match: { expertId: { $ne: null } } },
    { $group: { _id: "$expertId", avgRating: { $avg: "$rating" } } },
  ]);

  return new Map(
    rows.map((row) => [
      String(row._id),
      Math.round(row.avgRating * 10) / 10,
    ]),
  );
}

const computeRatingFromTestimonials = (
  testimonials: ExpertTestimonialDto[],
): number => {
  if (testimonials.length === 0) return 0;
  const sum = testimonials.reduce((acc, item) => acc + item.rating, 0);
  return Math.round((sum / testimonials.length) * 10) / 10;
};

export async function buildExpertPublicProfile(
  expert: InstanceType<typeof ExpertProfile>,
) {
  const expertId = String(expert._id);
  const [completedJobs, reviewCount, testimonials] = await Promise.all([
    getCompletedJobsCount(expertId),
    getReviewCount(expertId),
    getExpertTestimonials(expertId),
  ]);

  return {
    ...expert.toObject(),
    avatarUri: resolveStoredAssetUrl(expert.avatarUri) ?? expert.avatarUri,
    completedJobs,
    reviewCount,
    rating: computeRatingFromTestimonials(testimonials),
    responseTime: expert.available !== false ? "< 2h" : "< 24h",
    testimonials,
  };
}

export async function getReviewCountsByExpert(): Promise<Map<string, number>> {
  const rows = await RequestModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    {
      $match: {
        status: RequestStatus.COMPLETED,
        "review.rating": { $exists: true },
      },
    },
    {
      $project: {
        expertId: { $ifNull: ["$expert", "$task.expert"] },
      },
    },
    { $match: { expertId: { $ne: null } } },
    { $group: { _id: "$expertId", count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export async function getCompletedJobsCountsByExpert(): Promise<
  Map<string, number>
> {
  const rows = await RequestModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { status: RequestStatus.COMPLETED } },
    {
      $project: {
        expertId: { $ifNull: ["$expert", "$task.expert"] },
      },
    },
    { $match: { expertId: { $ne: null } } },
    { $group: { _id: "$expertId", count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
}
