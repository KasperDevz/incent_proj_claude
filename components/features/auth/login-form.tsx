"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Step = "email" | "password" | "otp"

const emailSchema = z.object({ email: z.string().email("กรุณากรอก email ให้ถูกต้อง") })
const passwordSchema = z.object({ password: z.string().min(1, "กรุณากรอกรหัสผ่าน") })
const otpSchema = z.object({ otp: z.string().length(6, "OTP ต้องมี 6 หลัก") })

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "agent" | null>(null)
  const [testOtp, setTestOtp] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const emailForm = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } })
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { password: "" } })
  const otpForm = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } })

  async function onEmailSubmit({ email }: { email: string }) {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setEmail(email)
      setRole(data.role)
      if (data.role === "agent") {
        await requestOtp(email)
      } else {
        setStep("password")
      }
    } finally {
      setLoading(false)
    }
  }

  async function requestOtp(email: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.testOtp) setTestOtp(data.testOtp)
      setStep("otp")
    } finally {
      setLoading(false)
    }
  }

  async function onPasswordSubmit({ password }: { password: string }) {
    setLoading(true)
    setError("")
    try {
      const result = await signIn("credentials", {
        email, password, authType: "password", redirect: false,
      })
      if (result?.error) { setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); return }
      router.push("/admin/dashboard")
    } finally {
      setLoading(false)
    }
  }

  async function onOtpSubmit({ otp }: { otp: string }) {
    setLoading(true)
    setError("")
    try {
      const result = await signIn("credentials", {
        email, otp, authType: "otp", redirect: false,
      })
      if (result?.error) { setError("OTP ไม่ถูกต้องหรือหมดอายุแล้ว"); return }
      router.push("/agent/dashboard")
    } finally {
      setLoading(false)
    }
  }

  function goBack() {
    setStep("email")
    setError("")
    setTestOtp(null)
    setRole(null)
    emailForm.setValue("email", email)
  }

  return (
    <Card className="border-slate-200/20 bg-white/95 backdrop-blur-sm shadow-2xl shadow-black/20">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800">
            {step === "email" && "เข้าสู่ระบบ"}
            {step === "password" && "ยืนยันตัวตน"}
            {step === "otp" && "กรอก OTP"}
          </CardTitle>
          {role && (
            <Badge variant={role === "admin" ? "default" : "secondary"} className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              {role === "admin" ? "Admin" : "Agent"}
            </Badge>
          )}
        </div>
        <CardDescription className="text-slate-500">
          {step === "email" && "กรอกอีเมลของคุณเพื่อเริ่มต้น"}
          {step === "password" && `เข้าสู่ระบบด้วยรหัสผ่าน`}
          {step === "otp" && `ส่ง OTP ไปยัง ${email} แล้ว`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Test mode OTP banner */}
        {testOtp && step === "otp" && (
          <div className="animate-fade-in flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-800">TEST MODE — OTP ของคุณคือ</p>
              <div className="mt-1 flex gap-1.5">
                {testOtp.split("").map((d, i) => (
                  <span
                    key={i}
                    className="flex h-8 w-7 items-center justify-center rounded bg-amber-100 font-mono text-lg font-bold text-amber-900 ring-1 ring-amber-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-amber-600">OTP นี้จะไม่แสดงใน production</p>
            </div>
          </div>
        )}

        {/* Email step */}
        {step === "email" && (
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="animate-fade-in space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoFocus
                className="h-11 border-slate-200 focus-visible:ring-indigo-500"
                {...emailForm.register("email")}
              />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ดำเนินการต่อ"}
            </Button>
          </form>
        )}

        {/* Password step (admin) */}
        {step === "password" && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600 flex-1 truncate">{email}</span>
              <button type="button" onClick={goBack} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0">
                <ArrowLeft className="h-3 w-3" /> เปลี่ยน
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">รหัสผ่าน</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoFocus
                  className="h-11 border-slate-200 pr-10 focus-visible:ring-indigo-500"
                  {...passwordForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-red-500">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบ"}
            </Button>
          </form>
        )}

        {/* OTP step (agent) */}
        {step === "otp" && (
          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600 flex-1 truncate">{email}</span>
              <button type="button" onClick={goBack} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0">
                <ArrowLeft className="h-3 w-3" /> เปลี่ยน
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-slate-700">รหัส OTP 6 หลัก</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="_ _ _ _ _ _"
                autoFocus
                className={cn(
                  "h-11 border-slate-200 text-center text-2xl font-mono tracking-[0.5em] focus-visible:ring-indigo-500",
                )}
                {...otpForm.register("otp")}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-xs text-red-500">{otpForm.formState.errors.otp.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยัน OTP"}
            </Button>
            <button
              type="button"
              onClick={() => requestOtp(email)}
              disabled={loading}
              className="w-full text-center text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ขอ OTP ใหม่
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
