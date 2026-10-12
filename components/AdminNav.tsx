"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Megaphone,
  History,
  LogOut,
} from "lucide-react";
import { logoutUser, User } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

interface AdminNavProps {
  user?: User | null;
}

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const navItems = [
    { label: "اللوحة المركزية", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "إدارة الحسابات", href: "/dashboard/admin/users", icon: Users },
    { label: "الأقسام والشعب", href: "/dashboard/admin/academic", icon: Building2 },
    { label: "الجداول والقاعات", href: "/dashboard/admin/schedule", icon: CalendarDays },
    { label: "التعميمات والإعلانات", href: "/dashboard/admin/announcements", icon: Megaphone },
    { label: "سجل الرقابة والأمان", href: "/dashboard/admin/audit", icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/dashboard/admin" className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-[#14352c] text-white flex items-center justify-center shadow-sm">
            <ShieldAlert className="size-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              الجامعة المستنصرية
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              لوحة الإدارة المركزية ورئاسة القسم
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <NotificationBell theme="light" />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="size-7 rounded-lg bg-[#14352c] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name ? user.name[0] : "م"}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden md:inline">
              {user?.name || "إدارة القسم"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent transition"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto no-scrollbar border-t border-slate-100 flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                isActive
                  ? "border-[#14352c] text-[#14352c] bg-emerald-50/60"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#14352c]" : "text-slate-500"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
