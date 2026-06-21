import { TrendingUp, Users, RefreshCw, Target } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Incent — Sales Commission Tracker</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          🚧 หน้านี้อยู่ระหว่างการพัฒนา — Phase 1 prototype
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: "Agents", value: "3", desc: "registered" },
            { icon: RefreshCw, label: "Last Sync", value: "–", desc: "not synced yet" },
            { icon: Target, label: "Active Goals", value: "3", desc: "configured" },
          ].map(({ icon: Icon, label, value, desc }) => (
            <div key={label} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                  <Icon className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm text-center text-slate-400 py-16">
          <p className="text-sm">Coming soon: agent management, customer assignment, data sync</p>
        </div>
      </div>
    </div>
  )
}
