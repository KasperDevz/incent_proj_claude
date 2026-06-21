import { TrendingUp } from "lucide-react"
import { LoginForm } from "@/components/features/auth/login-form"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-900/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-500/30 backdrop-blur-sm">
            <TrendingUp className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Incent</h1>
            <p className="text-sm text-slate-400 mt-1">Sales Commission Tracker</p>
          </div>
        </div>

        <LoginForm />

        {/* Test accounts hint */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 text-xs text-slate-400 space-y-1.5">
          <p className="font-medium text-slate-300">บัญชีทดสอบ</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">Admin</span>
            <span className="font-mono text-slate-300">admin@mail.com</span>
            <span className="text-slate-500">รหัสผ่าน</span>
            <span className="font-mono text-slate-300">password</span>
          </div>
          <div className="h-px bg-slate-700/50 my-1" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">Agent 1</span>
            <span className="font-mono text-slate-300">agent1@mail.com</span>
            <span className="text-slate-500">Agent 2</span>
            <span className="font-mono text-slate-300">agent2@mail.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}
