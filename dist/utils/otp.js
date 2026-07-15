"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpCode = exports.storeOtp = exports.generateOtp = void 0;
const OTP_TTL_MS = 10 * 60 * 1000;
const otpStore = new Map();
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
exports.generateOtp = generateOtp;
const storeOtp = (phone, code) => {
    otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
};
exports.storeOtp = storeOtp;
const verifyOtpCode = (phone, code) => {
    const entry = otpStore.get(phone);
    if (!entry)
        return false;
    if (Date.now() > entry.expiresAt) {
        otpStore.delete(phone);
        return false;
    }
    const valid = entry.code === code;
    if (valid)
        otpStore.delete(phone);
    return valid;
};
exports.verifyOtpCode = verifyOtpCode;
