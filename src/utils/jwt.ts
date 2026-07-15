import jwt from "jsonwebtoken";
import { UserRole } from "../models/User";

export interface JwtPayload {
  id: string;
  role: UserRole;
}

export const generateToken = (id: string, role: UserRole): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || "fallback_secret",
  ) as JwtPayload;
};
