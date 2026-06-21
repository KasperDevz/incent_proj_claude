import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { findUserByEmail } from "@/lib/auth/mock-users"

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })

  const user = findUserByEmail(parsed.data.email)
  if (!user) return NextResponse.json({ error: "ไม่พบบัญชีนี้ในระบบ" }, { status: 404 })

  return NextResponse.json({ role: user.role })
}
