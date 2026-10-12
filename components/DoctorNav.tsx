"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  QrCode,
  FileCheck2,
  Award,
  UploadCloud,
  MessagesSquare,
  LogOut,
} from "lucide-react";
import { logoutUser, User } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

interface DoctorNavProps {
  user?: User | null;
}

export default function DoctorNav({ user }: DoctorNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const navItems = [
    { label: "لوحة التدريسي", href: "/dashboard/doctor", icon: LayoutDashboard },
    { label: "المقررات والجداول والطلبة", href: "/dashboard/doctor/courses", icon: BookOpen },
    { label: "إدارة الحضور الحي", href: "/dashboard/doctor/attendance", icon: QrCode },
    { label: "الواجبات والتصحيح", href: "/dashboard/doctor/assignments", icon: FileCheck2 },
    { label: "رصد الدرجات والسعي", href: "/dashboard/doctor/grades", icon: Award },
    { label: "المحاضرات والملازم", href: "/dashboard/doctor/materials", icon: UploadCloud },
    { label: "مناقشات الشعبة", href: "/dashboard/doctor/questions", icon: MessagesSquare },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/dashboard/doctor" className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-[#14352c] text-white flex items-center justify-center shadow-sm">
            <GraduationCap className="size-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              الجامعة المستنصرية
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              بوابة الكادر التدريسي والأكاديمي
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <NotificationBell theme="light" />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="size-7 rounded-lg bg-[#14352c] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name ? user.name[0] : "د"}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden md:inline">
              {user?.name || "د. تدريسي"}
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
