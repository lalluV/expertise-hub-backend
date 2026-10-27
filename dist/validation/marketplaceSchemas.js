"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRequestReviewSchema = exports.googleAuthSchema = exports.rescheduleRequestSchema = exports.expertRespondRequestSchema = exports.updateTaskSchema = exports.rejectReviewSchema = exports.adminCreateReviewSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = exports.updateProfileSchema = exports.updateExpertSchema = exports.createExpertSchema = exports.workHistoryItemSchema = exports.updateManagedUserStatusSchema = exports.createManagedUserSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.assignExpertSchema = exports.assignTaskSchema = exports.updateRequestStatusSchema = exports.processPaymentSchema = exports.updateQuoteStatusSchema = exports.createQuoteSchema = exports.cancelRequestSchema = exports.updateRequestSchema = exports.createRequestSchema = exports.isSafeUrl = exports.LIMITS = exports.OTHER_CATEGORY = void 0;
const zod_1 = require("zod");
const parseableDateString = zod_1.z
    .string()
    .min(1)
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date format");
exports.OTHER_CATEGORY = "Other";
/** Shared length limits (keep in sync with web/admin/mobile maxLength). */
exports.LIMITS = {
    name: 100,
    email: 254,
    description: 5000,
    title: 200,
    category: 100,
    notes: 2000,
    url: 2000,
    phone: 20,
    search: 100,
};
/** Allow up to 24h in the past to tolerate client time zones / date-only input. */
const PAST_TOLERANCE_MS = 24 * 60 * 60 * 1000;
const notInPast = (val) => Date.parse(val) >= Date.now() - PAST_TOLERANCE_MS;
const futureDateField = zod_1.z
    .union([zod_1.z.string().datetime(), parseableDateString])
    .refine(notInPast, "Date cannot be in the past");
/** Multipart sends numbers as strings; empty string means "not provided". */
const optionalPositiveNumber = zod_1.z.preprocess((v) => (v === "" || v === null ? undefined : v), zod_1.z.coerce.number().positive().optional());
/**
 * A link we will render as <a href>/<img src>: http(s) URLs or relative upload paths only.
 * Blocks javascript:, data:, vbscript:, file: and similar schemes (stored XSS / phishing).
 */
const isSafeUrl = (v) => {
    const s = v.trim();
    const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(s)?.[1]?.toLowerCase();
    if (!scheme)
        return !s.startsWith("//") && !/[\u0000-\u001f]/.test(s);
    return scheme === "http" || scheme === "https";
};
exports.isSafeUrl = isSafeUrl;
const safeUrl = zod_1.z
    .string()
    .trim()
    .max(exports.LIMITS.url)
    .refine((v) => v === "" || (0, exports.isSafeUrl)(v), "Only http(s) links or uploaded files are allowed");
/** Multipart sends a single string or repeated fields for arrays. */
const stringArray = zod_1.z.preprocess((v) => (v === undefined || v === "" ? undefined : Array.isArray(v) ? v : [v]), zod_1.z.array(safeUrl).max(20).optional());
const nameField = zod_1.z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(exports.LIMITS.name, `Name must be at most ${exports.LIMITS.name} characters`);
const descriptionField = zod_1.z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(exports.LIMITS.description, `Description must be at most ${exports.LIMITS.description} characters`);
const emailField = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .max(exports.LIMITS.email)
    .email("A valid email is required");
const passwordField = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128);
const customCategoryField = zod_1.z.string().trim().min(1).max(100);
exports.createRequestSchema = zod_1.z
    .object({
    description: descriptionField,
    expertId: zod_1.z.string().max(64).optional(), // ExpertProfile _id
    category: zod_1.z.string().trim().min(1).max(exports.LIMITS.category).optional(),
    customCategory: customCategoryField.optional(),
    scheduledDate: futureDateField.optional(),
    budget: optionalPositiveNumber,
    attachments: stringArray,
})
    // `priority` (and any other unknown key) is silently stripped by zod.
    .superRefine((val, ctx) => {
    if (val.category === exports.OTHER_CATEGORY && !val.customCategory) {
        ctx.addIssue({
            code: "custom",
            path: ["customCategory"],
            message: "customCategory is required when category is 'Other'",
        });
    }
});
/** PATCH /api/requests/:id (customer edit while still pending/reviewed). */
exports.updateRequestSchema = zod_1.z
    .object({
    description: descriptionField.optional(),
    category: zod_1.z.string().trim().min(1).max(exports.LIMITS.category).optional(),
    customCategory: customCategoryField.optional().or(zod_1.z.literal("")),
    scheduledDate: futureDateField.optional(),
    budget: optionalPositiveNumber,
    attachments: stringArray,
})
    .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nothing to update",
})
    .superRefine((val, ctx) => {
    if (val.category === exports.OTHER_CATEGORY && !val.customCategory) {
        ctx.addIssue({
            code: "custom",
            path: ["customCategory"],
            message: "customCategory is required when category is 'Other'",
        });
    }
});
exports.cancelRequestSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().max(500).optional(),
});
exports.createQuoteSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    basePrice: zod_1.z.coerce.number().positive(),
    commission: zod_1.z.coerce.number().min(0),
    taxPercent: zod_1.z.coerce.number().min(0).max(100).optional().default(0),
    advancePercent: zod_1.z.coerce.number().min(0).max(100).optional().default(0),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.updateQuoteStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["accepted", "rejected"]),
});
exports.processPaymentSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    type: zod_1.z.enum(["advance", "final"]).optional().default("final"),
    // Total (incl. tax) being paid. Optional: when omitted the server uses the
    // amount due for the chosen payment type. When present it must match.
    amount: zod_1.z.number().positive().optional(),
});
exports.updateRequestStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "pending",
        "reviewed",
        "quoted",
        "accepted",
        "rejected",
        "assigned",
        "completed",
    ]),
});
exports.assignTaskSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    expertId: zod_1.z.string().min(1),
});
exports.assignExpertSchema = zod_1.z.object({
    expertId: zod_1.z.string().min(1),
});
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(exports.LIMITS.category),
    label: zod_1.z.string().trim().min(2).max(exports.LIMITS.category).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
});
exports.updateCategorySchema = zod_1.z.object({
    label: zod_1.z.string().trim().min(2).max(exports.LIMITS.category).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
});
exports.createManagedUserSchema = zod_1.z
    .object({
    name: nameField,
    phone: zod_1.z.string().min(7).max(exports.LIMITS.phone).optional(),
    email: emailField.optional().or(zod_1.z.literal("")),
    password: passwordField.optional(),
})
    .refine((v) => Boolean(v.phone || v.email), {
    message: "Either phone or email is required",
    path: ["email"],
});
exports.updateManagedUserStatusSchema = zod_1.z.object({
    role: zod_1.z.enum(["customer", "expert"]),
    status: zod_1.z.enum(["active", "pending", "inactive"]),
});
const currentYear = new Date().getFullYear();
exports.workHistoryItemSchema = zod_1.z
    .object({
    company: zod_1.z.string().trim().min(1, "Company is required").max(200),
    role: zod_1.z.string().trim().min(1, "Role is required").max(200),
    startYear: zod_1.z.number().int().min(1950).max(currentYear + 1),
    endYear: zod_1.z
        .number()
        .int()
        .min(1950)
        .max(currentYear + 1)
        .nullable()
        .optional()
        .transform((v) => v ?? null),
    description: zod_1.z.string().max(1000).optional().default(""),
})
    .refine((v) => v.endYear === null || v.endYear >= v.startYear, {
    message: "endYear must be null or >= startYear",
    path: ["endYear"],
});
const expertEditableFields = {
    name: nameField,
    avatarUri: safeUrl,
    photoUrl: safeUrl,
    headline: zod_1.z.string().max(200),
    location: zod_1.z.string().max(200),
    categories: zod_1.z.array(zod_1.z.string().trim().min(1)).max(50),
    skills: zod_1.z.array(zod_1.z.string().trim().min(1)).max(50),
    customCategory: customCategoryField.or(zod_1.z.literal("")),
    experience: zod_1.z.coerce.number().min(0).max(80),
    rate: zod_1.z.coerce.number().min(0).max(1_000_000),
    bio: zod_1.z.string().max(2000),
    available: zod_1.z.boolean(),
    hideName: zod_1.z.boolean(),
    displayName: zod_1.z.string().trim().max(100),
    workHistory: zod_1.z.array(exports.workHistoryItemSchema).max(30),
};
exports.createExpertSchema = zod_1.z
    .object({
    name: expertEditableFields.name,
    phone: zod_1.z.string().min(7, "Phone number is required").max(exports.LIMITS.phone).optional(),
    email: emailField.optional().or(zod_1.z.literal("")),
    password: passwordField.optional(),
    avatarUri: expertEditableFields.avatarUri.optional(),
    photoUrl: expertEditableFields.photoUrl.optional(),
    headline: expertEditableFields.headline.optional(),
    location: expertEditableFields.location.optional(),
    categories: expertEditableFields.categories.optional(),
    skills: expertEditableFields.skills.optional(),
    customCategory: expertEditableFields.customCategory.optional(),
    experience: expertEditableFields.experience.optional(),
    rate: expertEditableFields.rate.optional(),
    bio: expertEditableFields.bio.optional(),
    available: expertEditableFields.available.optional(),
    hideName: expertEditableFields.hideName.optional(),
    displayName: expertEditableFields.displayName.optional(),
    workHistory: expertEditableFields.workHistory.optional(),
})
    .refine((v) => Boolean(v.phone || v.email), {
    message: "Either phone or email is required",
    path: ["email"],
})
    .superRefine((val, ctx) => {
    const cats = val.categories ?? val.skills ?? [];
    if (cats.includes(exports.OTHER_CATEGORY) && !val.customCategory) {
        ctx.addIssue({
            code: "custom",
            path: ["customCategory"],
            message: "customCategory is required when categories include 'Other'",
        });
    }
});
/** PUT /api/experts/:id and /api/experts/me/profile (all fields optional). */
exports.updateExpertSchema = zod_1.z.object({
    name: expertEditableFields.name.optional(),
    phone: zod_1.z.string().min(7).max(exports.LIMITS.phone).optional(), // admin only (ignored for experts)
    email: emailField.optional().or(zod_1.z.literal("")),
    avatarUri: expertEditableFields.avatarUri.optional(),
    photoUrl: expertEditableFields.photoUrl.optional(),
    headline: expertEditableFields.headline.optional(),
    location: expertEditableFields.location.optional(),
    categories: expertEditableFields.categories.optional(),
    skills: expertEditableFields.skills.optional(),
    customCategory: expertEditableFields.customCategory.optional(),
    experience: expertEditableFields.experience.optional(),
    rate: expertEditableFields.rate.optional(),
    bio: expertEditableFields.bio.optional(),
    available: expertEditableFields.available.optional(),
    hideName: expertEditableFields.hideName.optional(),
    displayName: expertEditableFields.displayName.optional(),
    workHistory: expertEditableFields.workHistory.optional(),
});
/** PATCH /api/auth/profile (customers and experts). */
exports.updateProfileSchema = exports.updateExpertSchema
    .omit({ phone: true })
    .extend({
    expertise: expertEditableFields.categories.optional(),
    profileComplete: zod_1.z.boolean().optional(),
});
exports.registerSchema = zod_1.z.object({
    name: nameField,
    email: emailField,
    password: passwordField,
    role: zod_1.z.enum(["customer", "expert"]).optional().default("customer"),
});
exports.loginSchema = zod_1.z
    .object({
    email: emailField.optional(),
    // Legacy admin login (phone + password)
    phone: zod_1.z.string().min(1).max(exports.LIMITS.phone).optional(),
    password: zod_1.z.string().min(1, "Password is required").max(128),
})
    .refine((v) => Boolean(v.email || v.phone), {
    message: "Email is required",
    path: ["email"],
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required").max(128),
    newPassword: passwordField,
});
exports.adminCreateReviewSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().min(10, "Review must be at least 10 characters").max(2000),
    customerName: zod_1.z.string().trim().min(1).max(100).optional(),
});
exports.rejectReviewSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
exports.updateTaskSchema = zod_1.z.object({
    status: zod_1.z.enum(["assigned", "in_progress", "completed"]).optional(),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.expertRespondRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(["accept", "decline"]),
});
exports.rescheduleRequestSchema = zod_1.z.object({
    scheduledDate: futureDateField,
});
/** POST /api/auth/google */
exports.googleAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(20).max(5000),
    /** Required only the first time (new account). */
    role: zod_1.z.enum(["customer", "expert"]).optional(),
});
exports.submitRequestReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().min(10, "Review must be at least 10 characters").max(2000),
});
