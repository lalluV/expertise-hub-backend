"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGoogleVerifier = exports.verifyGoogleIdToken = exports.isGoogleAuthConfigured = exports.getGoogleClientIds = void 0;
const google_auth_library_1 = require("google-auth-library");
/** Comma-separated list from GOOGLE_CLIENT_IDS (or legacy GOOGLE_CLIENT_ID). */
const getGoogleClientIds = () => (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
exports.getGoogleClientIds = getGoogleClientIds;
const isGoogleAuthConfigured = () => (0, exports.getGoogleClientIds)().length > 0;
exports.isGoogleAuthConfigured = isGoogleAuthConfigured;
let client = null;
const defaultVerifier = async (idToken) => {
    client ??= new google_auth_library_1.OAuth2Client();
    // Verifies signature (Google certs), expiry, issuer and audience.
    const ticket = await client.verifyIdToken({
        idToken,
        audience: (0, exports.getGoogleClientIds)(),
    });
    const payload = ticket.getPayload();
    if (!payload?.sub)
        throw new Error("Invalid Google token payload");
    return {
        sub: payload.sub,
        email: payload.email?.toLowerCase(),
        emailVerified: payload.email_verified === true,
        name: payload.name,
        picture: payload.picture,
    };
};
let verifier = defaultVerifier;
const verifyGoogleIdToken = (idToken) => verifier(idToken);
exports.verifyGoogleIdToken = verifyGoogleIdToken;
/** Test hook: replace token verification (pass undefined to restore). */
const setGoogleVerifier = (v) => {
    verifier = v ?? defaultVerifier;
};
exports.setGoogleVerifier = setGoogleVerifier;
