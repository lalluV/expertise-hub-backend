"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const expertRoutes_1 = __importDefault(require("./routes/expertRoutes"));
const requestRoutes_1 = __importDefault(require("./routes/requestRoutes"));
const quoteRoutes_1 = __importDefault(require("./routes/quoteRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const auth_1 = require("./middleware/auth");
const User_1 = require("./models/User");
const taskController_1 = require("./controllers/taskController");
const validate_1 = require("./middleware/validate");
const marketplaceSchemas_1 = require("./validation/marketplaceSchemas");
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const sanitize_1 = require("./middleware/sanitize");
const rateLimit_1 = require("./middleware/rateLimit");
/** Builds the Express app (no DB connection, no listen) so tests can use it. */
const createApp = () => {
    const app = (0, express_1.default)();
    const isProd = process.env.NODE_ENV === "production";
    app.disable("x-powered-by");
    // Behind a load balancer / reverse proxy set TRUST_PROXY (e.g. "1") so rate limits see real IPs.
    if (process.env.TRUST_PROXY) {
        const tp = process.env.TRUST_PROXY;
        app.set("trust proxy", /^\d+$/.test(tp) ? Number(tp) : tp === "true" ? true : tp);
    }
    // Security headers. Images/PDFs are loaded cross-origin by the web/admin apps.
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    // CORS: explicit allow-list (CORS_ORIGINS); requests without Origin (mobile, curl) are allowed.
    const allowed = new Set((0, env_1.getCorsOrigins)());
    app.use((0, cors_1.default)({
        origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
        credentials: false,
        exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit"],
    }));
    if (process.env.NODE_ENV !== "test") {
        // Default formats never log headers/bodies, so tokens and passwords stay out of logs.
        app.use((0, morgan_1.default)(isProd ? "combined" : "dev"));
    }
    // Local uploads (dev / no R2). Served as inert files: no sniffing, sandboxed if opened directly.
    const uploadsDir = path_1.default.join(process.cwd(), "uploads");
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    app.use("/uploads", express_1.default.static(uploadsDir, {
        dotfiles: "deny",
        index: false,
        setHeaders: (res) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        },
    }));
    // Health probes (before the rate limiter so monitors are never throttled).
    app.get("/api/health", (_req, res) => {
        res.status(200).json({ status: "OK", message: "Marketplace API is running" });
    });
    app.get("/api/health/ready", (_req, res) => {
        const ready = (0, db_1.dbReadyState)() === 1;
        res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready", db: ready });
    });
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use(express_1.default.urlencoded({ extended: false, limit: "1mb" }));
    app.use(sanitize_1.sanitizeInput);
    app.use("/api", rateLimit_1.apiLimiter);
    // API Routes
    app.use("/api/auth", authRoutes_1.default);
    app.use("/api/experts", expertRoutes_1.default);
    app.use("/api/requests", requestRoutes_1.default);
    app.use("/api/quotes", quoteRoutes_1.default);
    app.use("/api/tasks", taskRoutes_1.default);
    app.use("/api/payments", paymentRoutes_1.default);
    app.use("/api/notifications", notificationRoutes_1.default);
    app.use("/api/categories", categoryRoutes_1.default);
    app.use("/api/uploads", uploadRoutes_1.default);
    app.use("/api/users", userRoutes_1.default);
    app.use("/api/admin/reviews", reviewRoutes_1.default);
    app.post("/api/assign", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.assignTaskSchema), taskController_1.assignTask);
    // Unknown API routes -> JSON 404 (instead of Express' HTML page)
    app.use("/api", (req, res) => {
        res.status(404).json({
            success: false,
            message: `Route not found: ${req.method} ${req.originalUrl}`,
        });
    });
    // Error handling middleware
    app.use((err, req, res, next) => {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File is too large. Maximum size is 10MB.",
            });
        }
        if (err.message?.startsWith("Unsupported file type")) {
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        }
        if (err.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid id or value",
            });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        }
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Duplicate value (email or phone already in use)",
            });
        }
        if (err.type === "entity.parse.failed") {
            return res.status(400).json({ success: false, message: "Malformed JSON body" });
        }
        if (err.type === "entity.too.large") {
            return res.status(413).json({ success: false, message: "Request body too large" });
        }
        const status = err.status || err.statusCode || 500;
        if (status >= 500)
            console.error(`[${req.method} ${req.originalUrl}]`, err);
        res.status(status).json({
            success: false,
            // Never leak internal error text for 5xx in production.
            message: status >= 500 && isProd
                ? "Internal Server Error"
                : err.message || "Internal Server Error",
            stack: process.env.NODE_ENV === "development" && status >= 500
                ? err.stack
                : undefined,
        });
    });
    return app;
};
exports.createApp = createApp;
