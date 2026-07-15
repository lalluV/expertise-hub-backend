import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { User, UserRole } from "../models/User";
import { ExpertProfile } from "../models/ExpertProfile";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = verifyToken(token);

      if (decoded.role === UserRole.EXPERT) {
        const expert = await ExpertProfile.findById(decoded.id);
        if (!expert) {
          return res
            .status(401)
            .json({ message: "Not authorized, expert profile not found" });
        }
        req.user = { ...expert.toObject(), role: UserRole.EXPERT };
      } else {
        req.user = await User.findById(decoded.id).select("-password");
        if (!req.user) {
          return res
            .status(401)
            .json({ message: "Not authorized, user not found" });
        }
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user?.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
