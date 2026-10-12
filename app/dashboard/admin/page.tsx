"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import { formatAcademicTime } from "@/lib/date";
import AdminNav from "@/components/AdminNav";
import {
  Building,
  GraduationCap,
  Users,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  CalendarDays,
  Megaphone,
} from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredUser();
    // Security check: Only ADMIN role allowed
    if (!stored || stored.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Smart Caching (RAM + SessionStorage)
    const cached = smartCache.get("/dashboards/admin");
    if (cached?.data) {
      setData(cached.data);
      setLoading(false);
    }

    apiFetch("/dashboards/admin")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || "تعذر تحميل لوحة الإدارة المركزية.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  const counts = data?.counts || {};
  const auditLogs = data?.recentAuditLogs || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col" dir="rtl">
      <AdminNav user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="font-bold underline text-red-700"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200 border-t-2 border-t-[#14352c] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              الرقابة والحوكمة الجامعية المعتمدة
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              لوحة الإدارة المركزية ورئاسة الأقسام
            </h2>
            <p className="text-sm text-slate-600">
              إدارة الهيكل الأكاديمي، الحسابات الرسمية، والمراقبة الأمنية اللحظية للنظام
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/admin/academic"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 shadow-xs flex items-center gap-2 transition"
            >
              <Building className="w-4 h-4 text-[#14352c]" />
              الأقسام والشعب
            </Link>
            <Link
              href="/dashboard/admin/users"
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition"
            >
              <Users className="w-4 h-4" />
              إدارة المستخدمين
            </Link>
          </div>
        </div>

        {/* Statistics KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-emerald-600 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              إجمالي الطلبة
            </span>
            <p className={`text-2xl font-bold text-emerald-700 pt-1 ${mono.className}`}>
              {counts.students || 0}
            </p>
            <span className="text-xs text-slate-500 block">حسابات مقيدة ونشطة</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#14352c]" />
              الكادر التدريسي
            </span>
            <p className={`text-2xl font-bold text-slate-900 pt-1 ${mono.className}`}>
              {counts.doctors || 0}
            </p>
            <span className="text-xs text-slate-500 block">أستاذ وتدريسي معتمد</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-blue-600 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              الأقسام العلمية
            </span>
            <p className={`text-2xl font-bold text-blue-700 pt-1 ${mono.className}`}>
              {counts.departments || 0}
            </p>
            <span className="text-xs text-slate-500 block">أقسام أكاديمية مفعلة</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-purple-600 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              المقررات والشعب
            </span>
            <p className={`text-2xl font-bold text-purple-700 pt-1 ${mono.className}`}>
              {counts.courses || 0}
            </p>
            <span className="text-xs text-slate-500 block">مناهج وشعب دراسية</span>
          </div>
        </div>

        {/* Action Shortcuts & Recent Audits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Audit Logs Stream */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#14352c]" />
                سجل الرقابة الأمنية اللحظي (Audit Stream)
              </h3>
              <Link
                href="/dashboard/admin/audit"
                className="text-xs text-[#14352c] hover:underline font-bold flex items-center gap-1"
              >
                عرض السجل الكامل <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pl-2 pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-10">
                  لا توجد حركات أمنية مسجلة حالياً.
                </p>
              ) : (
                auditLogs.map((log: any, idx: number) => {
                  const displayIp = (!log.ipAddress || log.ipAddress === "::1" || log.ipAddress === "127.0.0.1") 
                    ? "127.0.0.1" 
                    : log.ipAddress.replace(/^::ffff:/, "");
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-100/70 transition"
                    >
                      <div className="space-y-0.5 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 font-mono text-[11px]">{log.action}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({log.resource || "SYSTEM"})</span>
                        </div>
                        <p className="text-slate-600 text-[11px] truncate">
                          المستخدم: {log.user?.name || log.user?.email || "إدارة النظام"}
                        </p>
                      </div>

                      <div className="text-left font-mono flex flex-col items-end gap-0.5 shrink-0" dir="ltr">
                        <span className="text-[10px] text-slate-500 block">
                          {formatAcademicTime(log.createdAt)}
                        </span>
                        <span 
                          className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold inline-block"
                        >
                          {displayIp}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#14352c]" />
              الوظائف والإجراءات المباشرة
            </h3>

            <div className="space-y-2.5 text-xs">
              <Link
                href="/dashboard/admin/users"
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#14352c]" />
                  <span>إدارة حسابات الكادر والطلبة</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/dashboard/admin/academic"
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#14352c]" />
                  <span>هيكلة الأقسام والمناهج والشعب</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/dashboard/admin/schedule"
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#14352c]" />
                  <span>الجداول الأسبوعية وحجز القاعات</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/dashboard/admin/announcements"
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#14352c]" />
                  <span>إصدار التعميمات والأوامر الرسمية</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
