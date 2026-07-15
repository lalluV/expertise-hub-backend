"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRequestReviewSchema = exports.rescheduleRequestSchema = exports.expertRespondRequestSchema = exports.updateTaskSchema = exports.createExpertSchema = exports.updateManagedUserStatusSchema = exports.createManagedUserSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.assignExpertSchema = exports.assignTaskSchema = exports.processPaymentSchema = exports.updateQuoteStatusSchema = exports.createQuoteSchema = exports.createRequestSchema = void 0;
const zod_1 = require("zod");
const parseableDateString = zod_1.z
    .string()
    .min(1)
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date format");
exports.createRequestSchema = zod_1.z.object({
    description: zod_1.z.string().min(10, "Description must be at least 10 characters"),
    expertId: zod_1.z.string().optional(), // ExpertProfile _id
    scheduledDate: zod_1.z
        .union([zod_1.z.string().datetime(), parseableDateString])
        .optional(),
    budget: zod_1.z.number().positive().optional(),
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.createQuoteSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    basePrice: zod_1.z.number().positive(),
    commission: zod_1.z.number().min(0),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.updateQuoteStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["accepted", "rejected"]),
});
exports.processPaymentSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
});
exports.assignTaskSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    expertId: zod_1.z.string().min(1),
});
exports.assignExpertSchema = zod_1.z.object({
    expertId: zod_1.z.string().min(1),
});
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    label: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
});
exports.updateCategorySchema = zod_1.z.object({
    label: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
});
exports.createManagedUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(7),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
exports.updateManagedUserStatusSchema = zod_1.z.object({
    role: zod_1.z.enum(["customer", "expert"]),
    status: zod_1.z.enum(["active", "pending", "inactive"]),
});
exports.createExpertSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    phone: zod_1.z.string().min(7, "Phone number is required"),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    avatarUri: zod_1.z.string().optional(),
    headline: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    experience: zod_1.z.number().min(0).optional(),
    bio: zod_1.z.string().max(2000).optional(),
    available: zod_1.z.boolean().optional(),
});
exports.updateTaskSchema = zod_1.z.object({
    status: zod_1.z.enum(["assigned", "in_progress", "completed"]).optional(),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.expertRespondRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(["accept", "decline"]),
});
exports.rescheduleRequestSchema = zod_1.z.object({
    scheduledDate: zod_1.z.union([zod_1.z.string().datetime(), parseableDateString]),
});
exports.submitRequestReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().min(10, "Review must be at least 10 characters").max(2000),
});
