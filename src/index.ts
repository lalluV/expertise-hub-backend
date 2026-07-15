import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import connectDB from "./config/db";

// Routes
import authRoutes from "./routes/authRoutes";
import expertRoutes from "./routes/expertRoutes";
import requestRoutes from "./routes/requestRoutes";
import quoteRoutes from "./routes/quoteRoutes";
import taskRoutes from "./routes/taskRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import userRoutes from "./routes/userRoutes";
import { protect, authorize } from "./middleware/auth";
import { UserRole } from "./models/User";
import { assignTask } from "./controllers/taskController";
import { validateBody } from "./middleware/validate";
import { assignTaskSchema } from "./validation/marketplaceSchemas";
import { HttpError } from "./utils/http";

dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/experts", expertRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/users", userRoutes);
app.post(
  "/api/assign",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(assignTaskSchema),
  assignTask,
);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Marketplace API is running" });
});

// Error handling middleware
app.use(
  (
    err: HttpError & { code?: string },
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
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
      stack:
        process.env.NODE_ENV === "development" && status >= 500
          ? err.stack
          : undefined,
    });
  },
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
