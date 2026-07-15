"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpCode = exports.storeOtp = exports.generateOtp = exports.DEV_OTP = void 0;
const OTP_TTL_MS = 10 * 60 * 1000;
const otpStore = new Map();
// Temporary fixed OTP until SMS provider is wired up
exports.DEV_OTP = "123456";
const generateOtp = () => exports.DEV_OTP;
exports.generateOtp = generateOtp;
const storeOtp = (phone, code) => {
    otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
};
exports.storeOtp = storeOtp;
const verifyOtpCode = (phone, code) => {
    // Accept fixed OTP for all numbers until SMS registration is ready
    if (code === exports.DEV_OTP) {
        otpStore.delete(phone);
        return true;
    }
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
