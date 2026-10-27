"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorsOrigins = exports.DEV_CORS_ORIGINS = exports.loadEnv = void 0;
const zod_1 = require("zod");
const csv = zod_1.z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const schema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(5001),
    MONGO_URI: zod_1.z.string().min(1, "MONGO_URI is required"),
    JWT_SECRET: zod_1.z.string().min(1, "JWT_SECRET is required"),
    JWT_EXPIRES_IN: zod_1.z.string().default("7d"),
    CORS_ORIGINS: csv,
    TRUST_PROXY: zod_1.z.string().optional(),
    GOOGLE_CLIENT_IDS: zod_1.z.string().optional(),
    AUTH_RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(20),
    API_RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(600),
})
    .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production")
        return;
    if (env.JWT_SECRET.length < 32 || /change|secret|example|placeholder/i.test(env.JWT_SECRET)) {
        ctx.addIssue({
            code: "custom",
            path: ["JWT_SECRET"],
            message: "must be a random value of at least 32 characters in production",
        });
    }
    if (env.CORS_ORIGINS.length === 0) {
        ctx.addIssue({
            code: "custom",
            path: ["CORS_ORIGINS"],
            message: "must list the allowed web origins in production",
        });
    }
});
/** Parses process.env; throws a readable error listing every bad variable (values never printed). */
const loadEnv = (source = process.env) => {
    const parsed = schema.safeParse(source);
    if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
        throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
    }
    return parsed.data;
};
exports.loadEnv = loadEnv;
exports.DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8081",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:8081",
];
/** Allowed browser origins: CORS_ORIGINS, or localhost dev ports outside production. */
const getCorsOrigins = () => {
    const list = (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length)
        return list;
    return process.env.NODE_ENV === "production" ? [] : exports.DEV_CORS_ORIGINS;
};
exports.getCorsOrigins = getCorsOrigins;
