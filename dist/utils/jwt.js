"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenVersionMatches = exports.verifyToken = exports.generateToken = exports.getJwtSecret = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/** Returns the JWT secret or throws. There is intentionally no fallback. */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || !secret.trim()) {
        throw new Error("JWT_SECRET environment variable is required");
    }
    return secret;
};
exports.getJwtSecret = getJwtSecret;
const generateToken = (id, role, tokenVersion = 0) => {
    return jsonwebtoken_1.default.sign({ id, role, tv: tokenVersion }, (0, exports.getJwtSecret)(), {
        algorithm: "HS256",
        expiresIn: (process.env.JWT_EXPIRES_IN || "7d"),
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, (0, exports.getJwtSecret)(), { algorithms: ["HS256"] });
};
exports.verifyToken = verifyToken;
/** True when the token's version matches the account's current version. */
const tokenVersionMatches = (decoded, account) => (decoded.tv ?? 0) === (account?.tokenVersion ?? 0);
exports.tokenVersionMatches = tokenVersionMatches;
