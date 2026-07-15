import { z } from "zod";

const parseableDateString = z
  .string()
  .min(1)
  .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date format");

export const createRequestSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  expertId: z.string().optional(), // ExpertProfile _id
  scheduledDate: z
    .union([z.string().datetime(), parseableDateString])
    .optional(),
  budget: z.number().positive().optional(),
  attachments: z.array(z.string()).optional(),
});

export const createQuoteSchema = z.object({
  requestId: z.string().min(1),
  basePrice: z.number().positive(),
  commission: z.number().min(0),
  notes: z.string().max(2000).optional(),
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export const processPaymentSchema = z.object({
  requestId: z.string().min(1),
  amount: z.number().positive(),
});

export const assignTaskSchema = z.object({
  requestId: z.string().min(1),
  expertId: z.string().min(1),
});

export const assignExpertSchema = z.object({
  expertId: z.string().min(1),
});

export const createCategorySchema = z.object({
  name: z.string().min(2),
  label: z.string().min(2).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateCategorySchema = z.object({
  label: z.string().min(2).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const createManagedUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
});

export const updateManagedUserStatusSchema = z.object({
  role: z.enum(["customer", "expert"]),
  status: z.enum(["active", "pending", "inactive"]),
});

export const createExpertSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  avatarUri: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  categories: z.array(z.string()).optional(),
  experience: z.number().min(0).optional(),
  bio: z.string().max(2000).optional(),
  available: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  status: z.enum(["assigned", "in_progress", "completed"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const expertRespondRequestSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const rescheduleRequestSchema = z.object({
  scheduledDate: z.union([z.string().datetime(), parseableDateString]),
});

export const submitRequestReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10, "Review must be at least 10 characters").max(2000),
});
