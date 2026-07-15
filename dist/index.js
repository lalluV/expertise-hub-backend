"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./config/db"));
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
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const auth_1 = require("./middleware/auth");
const User_1 = require("./models/User");
const taskController_1 = require("./controllers/taskController");
const validate_1 = require("./middleware/validate");
const marketplaceSchemas_1 = require("./validation/marketplaceSchemas");
dotenv_1.default.config();
// Connect to database
(0, db_1.default)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Middleware
app.use(express_1.default.json());
const uploadsDir = path_1.default.join(process.cwd(), "uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express_1.default.static(uploadsDir));
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
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
app.post("/api/assign", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.assignTaskSchema), taskController_1.assignTask);
// Health Check
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Marketplace API is running" });
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
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === "development" && status >= 500
            ? err.stack
            : undefined,
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
