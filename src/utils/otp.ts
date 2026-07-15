const OTP_TTL_MS = 10 * 60 * 1000;
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export const generateOtp = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

export const storeOtp = (phone: string, code: string) => {
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
};

export const verifyOtpCode = (phone: string, code: string): boolean => {
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
