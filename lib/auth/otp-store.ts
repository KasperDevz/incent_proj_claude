import { randomInt } from "crypto"

interface OtpEntry {
  otp: string
  expiresAt: Date
  attempts: number
}

// In-memory store — fine for test/prototype (resets on server restart)
const store = new Map<string, OtpEntry>()

const OTP_EXPIRY_MS = (parseInt(process.env.OTP_EXPIRY_MINUTES ?? "10")) * 60 * 1000
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS ?? "5")

export function generateOtp(email: string): string {
  const otp = String(randomInt(100000, 999999))
  store.set(email.toLowerCase(), {
    otp,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    attempts: 0,
  })
  return otp
}

export type VerifyResult =
  | { success: true }
  | { success: false; reason: "invalid" | "expired" | "locked" }

export function verifyOtp(email: string, code: string): VerifyResult {
  const key = email.toLowerCase()
  const entry = store.get(key)

  if (!entry) return { success: false, reason: "expired" }
  if (entry.expiresAt < new Date()) {
    store.delete(key)
    return { success: false, reason: "expired" }
  }
  if (entry.attempts >= MAX_ATTEMPTS) return { success: false, reason: "locked" }

  if (entry.otp !== code) {
    entry.attempts += 1
    if (entry.attempts >= MAX_ATTEMPTS) store.delete(key)
    return { success: false, reason: "invalid" }
  }

  store.delete(key)
  return { success: true }
}
