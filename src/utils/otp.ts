const OTP_TTL_MS = 10 * 60 * 1000;
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Temporary fixed OTP until SMS provider is wired up
export const DEV_OTP = "123456";

export const generateOtp = (): string => DEV_OTP;

export const storeOtp = (phone: string, code: string) => {
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
};

export const verifyOtpCode = (phone: string, code: string): boolean => {
  // Accept fixed OTP for all numbers until SMS registration is ready
  if (code === DEV_OTP) {
    otpStore.delete(phone);
    return true;
  }

  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  const valid = entry.code === code;
  if (valid) otpStore.delete(phone);
  return valid;
};
