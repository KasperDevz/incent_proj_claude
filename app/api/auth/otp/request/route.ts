import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { findUserByEmail } from "@/lib/auth/mock-users"
import { generateOtp } from "@/lib/auth/otp-store"

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })

  const { email } = parsed.data
  const user = findUserByEmail(email)

  if (!user) return NextResponse.json({ error: "ไม่พบบัญชีนี้ในระบบ" }, { status: 404 })
  if (user.role !== "agent") return NextResponse.json({ error: "กรุณาใช้ช่องทาง Admin login" }, { status: 400 })

  const otp = generateOtp(email)
  const isTestMode = process.env.NODE_ENV !== "production"

  // In production: send OTP via email service (not yet implemented)
  // In test mode: return OTP in response so it displays on screen
  return NextResponse.json({
    success: true,
    ...(isTestMode && { testOtp: otp }),
  })
}
