"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import { formatAcademicDate, formatAcademicTime } from "@/lib/date";
import AdminNav from "@/components/AdminNav";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import {
  History,
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldCheck,
  Calendar,
  Activity,
  Layers,
} from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function AdminAuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    // Security check: Only ADMIN role allowed
    if (!stored || stored.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Smart Caching
    const cached = smartCache.get<any[]>("/admin/audit-logs");
    if (cached?.data) {
      setLogs(cached.data);
      setLoading(false);
    }

    loadAuditLogs();
  }, [router]);

  const severityOptions: SelectOption[] = [
    { value: "", label: "كافة مستويات الخطورة" },
    { value: "INFO", label: "اعتيادي (INFO)" },
    { value: "WARNING", label: "تحذير (WARNING)" },
    { value: "CRITICAL", label: "خطير (CRITICAL)" },
  ];

  const loadAuditLogs = async (overrideSeverity?: string) => {
    setFetching(true);
    try {
      const activeSev = overrideSeverity !== undefined ? overrideSeverity : severityFilter;
      const params = new URLSearchParams();
      if (activeSev) params.append("severity", activeSev);
      if (actionFilter) params.append("action", actionFilter);
      const query = params.toString() ? `?${params.toString()}` : "";

      const res = await apiFetch(`/admin/audit-logs${query}`);
      const logList = res.data?.logs || res.data || [];
      setLogs(logList);

      if (!activeSev && !actionFilter) {
        smartCache.set("/admin/audit-logs", logList);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  const severityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold font-mono inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> خطير (CRITICAL)
          </span>
        );
      case "WARNING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold font-mono inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> تحذير (WARNING)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold font-mono inline-flex items-center gap-1">
            <Info className="w-3 h-3 text-[#14352c]" /> اعتيادي (INFO)
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col" dir="rtl">
      <AdminNav user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/admin" className="hover:text-[#14352c] transition">
                لوحة الإدارة
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">سجل الرقابة والتدقيق الأمني</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-[#14352c]" />
              سجل العمليات والرقابة الأمنية (Audit Trail)
            </h1>
            <p className="text-sm text-slate-600">
              متابعة التدقيق الأمني لجميع حركات النظام، عناوين IP، والتعديلات الحساسة لحظيًا
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CustomSelect
              options={severityOptions}
              value={severityFilter}
              onChange={(val) => {
                setSeverityFilter(val);
                loadAuditLogs(val);
              }}
              className="min-w-[220px]"
              theme="light"
            />

            <button
              onClick={() => loadAuditLogs()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-[#14352c]" : ""}`} />
              تحديث السجل
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">العملية (Action)</th>
                  <th className="py-3.5 px-4">الهدف (Resource)</th>
                  <th className="py-3.5 px-4">المستخدم الفاعل</th>
                  <th className="py-3.5 px-4">عنوان IP</th>
                  <th className="py-3.5 px-4">مستوى الأهمية</th>
                  <th className="py-3.5 px-4">التوقيت الزمني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500">
                      لا توجد سجلات أمنية مسجلة حاليًا.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition font-mono">
                      <td className="py-3 px-4 font-bold text-slate-900">{log.action}</td>
                      <td className="py-3 px-4 text-slate-500">{log.resource || "SYSTEM"}</td>
                      <td className="py-3 px-4 font-sans text-slate-800 font-medium">
                        {log.user?.name || log.user?.email || "إدارة النظام"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold inline-block font-mono"
                          dir="ltr"
                        >
                          {(!log.ipAddress || log.ipAddress === "::1" || log.ipAddress === "127.0.0.1")
                            ? "127.0.0.1"
                            : log.ipAddress.replace(/^::ffff:/, "")}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">{severityBadge(log.severity)}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                        {formatAcademicDate(log.createdAt)} {formatAcademicTime(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
