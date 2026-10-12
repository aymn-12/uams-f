"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  Award,
  BookOpen,
  QrCode,
  MessageSquare,
  LogOut,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { logoutUser, type User } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Dialog from "@/components/Dialog";
import NotificationBell from "@/components/NotificationBell";

interface StudentNavProps {
  user?: User | null;
  onOpenProfile?: () => void;
  onOpenCard?: () => void;
}

const navItems = [
  {
    label: "الرئيسية",
    href: "/dashboard/student",
    icon: LayoutDashboard,
  },
  {
    label: "الواجبات",
    href: "/dashboard/student/assignments",
    icon: FileText,
  },
  {
    label: "كشف الدرجات",
    href: "/dashboard/student/grades",
    icon: Award,
  },
  {
    label: "المحاضرات والملازم",
    href: "/dashboard/student/materials",
    icon: BookOpen,
  },
  {
    label: "تسجيل الحضور",
    href: "/dashboard/student/attendance",
    icon: QrCode,
  },
  {
    label: "حائط الأسئلة",
    href: "/dashboard/student/questions",
    icon: MessageSquare,
  },
];

export default function StudentNav({
  user,
  onOpenProfile,
  onOpenCard,
}: StudentNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  // Profile Dropdown state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Digital Card Modal state
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const [rotating, setRotating] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard/student" && pathname.startsWith(`${href}/`));

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(false);

    try {
      await logoutUser();
      router.replace("/");
    } catch {
      setLogoutError(true);
      setIsLoggingOut(false);
    }
  };

  const handleOpenCard = async () => {
    setIsProfileMenuOpen(false);
    if (onOpenCard) {
      onOpenCard();
      return;
    }

    setShowCardModal(true);
    if (!cardData) {
      setCardLoading(true);
      setCardError("");
      try {
        const res = await apiFetch("/digital-id/my-card");
        setCardData(res.data);
      } catch (err: any) {
        setCardError(err.message || "تعذر تحميل البطاقة الجامعية.");
      } finally {
        setCardLoading(false);
      }
    }
  };

  const handleRotateCardToken = async () => {
    setRotating(true);
    setCardError("");
    try {
      const res = await apiFetch("/digital-id/rotate-token", { method: "POST" });
      if (res.data?.qrImage) {
        setCardData((prev: any) => ({
          ...prev,
          qrImage: res.data.qrImage,
          tokenRotatedAt: res.data.tokenRotatedAt,
        }));
      }
    } catch (err: any) {
      setCardError(err.message || "تعذر تجديد الرمز.");
    } finally {
      setRotating(false);
    }
  };

  const initial = user?.name?.trim()?.charAt(0) || "ط";

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-40 border-b border-white/[0.08]
          bg-[#0b1120]/95 text-white shadow-lg shadow-black/10
          backdrop-blur-xl"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          {/* Brand & Actions */}
          <div className="flex min-h-[76px] items-center justify-between gap-3 py-3">
            <Link
              href="/dashboard/student"
              aria-label="الجامعة المستنصرية - الرئيسية"
              className="group flex min-w-0 items-center gap-3 rounded-xl
                outline-none focus-visible:ring-2
                focus-visible:ring-emerald-400 focus-visible:ring-offset-4
                focus-visible:ring-offset-[#0b1120]"
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center
                  rounded-2xl border border-emerald-400/20
                  bg-gradient-to-br from-emerald-400/20
                  to-teal-500/5 text-emerald-300
                  transition-colors group-hover:border-emerald-400/40"
              >
                <GraduationCap
                  size={25}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
                  الجامعة المستنصرية
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
                  بوابة الطالب الأكاديمية
                </p>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2.5">
              {/* Notification Bell */}
              <NotificationBell theme="dark" />

              {/* Digital Card Quick Trigger */}
              <button
                type="button"
                onClick={handleOpenCard}
                aria-label="عرض البطاقة الجامعية"
                title="البطاقة الجامعية الإلكترونية"
                className="flex size-10 items-center justify-center
                  rounded-xl border border-white/[0.08]
                  bg-white/[0.03] text-slate-300
                  transition-colors hover:border-emerald-400/30
                  hover:bg-emerald-400/10 hover:text-emerald-300
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-emerald-400"
              >
                <QrCode size={19} aria-hidden="true" />
              </button>

              {/* Official Academic Profile Dropdown Button */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                  className={`group flex items-center gap-2.5 rounded-2xl border px-3 py-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isProfileMenuOpen
                      ? "border-emerald-500/50 bg-slate-800/90 shadow-lg shadow-emerald-950/20"
                      : "border-slate-700/70 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-800/70"
                  }`}
                >
                  {/* Monogram Badge */}
                  <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-emerald-400 shadow-inner">
                    {initial}
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                  </div>

                  {/* Name and Designation */}
                  <div className="hidden max-w-40 text-right sm:block">
                    <span className="block truncate text-xs font-bold text-slate-100 tracking-tight">
                      {user?.name || "الملف الشخصي"}
                    </span>
                    <span className="block truncate text-[10px] text-emerald-400/90 font-medium">
                      طالب منتظم
                    </span>
                  </div>

                  {/* Animated Chevron */}
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 group-hover:text-slate-200 ${
                      isProfileMenuOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Clean, Non-Redundant Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div
                    className="absolute left-0 mt-2.5 w-64 rounded-2xl border border-slate-700/80 bg-[#0c1324]/98 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 text-right"
                  >
                    {/* Header: Academic Status only */}
                    <div className="px-3 py-2 bg-slate-900/70 rounded-xl border border-slate-800/80">
                      <p className="text-[10px] text-slate-400 font-bold">
                        الحالة الأكاديمية
                      </p>
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">
                        طالب نظامي • الجامعة المستنصرية
                      </p>
                    </div>

                    {/* Account actions only */}
                    <div className="pt-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={handleOpenCard}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent transition text-right"
                      >
                        <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>البطاقة الجامعية الإلكترونية</span>
                      </button>

                      <Link
                        href="/dashboard/student/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-teal-500/10 hover:border-teal-500/20 border border-transparent transition text-right"
                      >
                        <GraduationCap className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>بيانات السجل الأكاديمي</span>
                      </Link>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-800/80 my-1" />

                    {/* Logout Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-right disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <LoaderCircle className="w-4 h-4 animate-spin shrink-0" />
                      ) : (
                        <LogOut className="w-4 h-4 shrink-0" />
                      )}
                      <span>تسجيل الخروج من البوابة</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items Bar */}
          <nav
            aria-label="أقسام بوابة الطالب"
            className="-mx-1 flex items-center gap-1 overflow-x-auto
              border-t border-white/[0.07] px-1 py-2
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative flex shrink-0 items-center gap-2",
                    "rounded-xl border px-3 py-2.5 text-xs font-semibold",
                    "outline-none transition-colors duration-200",
                    "focus-visible:ring-2 focus-visible:ring-emerald-400",
                    active
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-100",
                  ].join(" ")}
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2 : 1.8}
                    className={
                      active ? "text-emerald-300" : "text-slate-500"
                    }
                    aria-hidden="true"
                  />

                  <span>{item.label}</span>

                  {active && (
                    <span
                      className="absolute inset-x-3 -bottom-[9px]
                        h-0.5 rounded-full bg-emerald-400"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {logoutError && (
            <p
              role="alert"
              className="border-t border-rose-400/10 py-2 text-xs text-rose-300"
            >
              تعذر تسجيل الخروج. تحقق من الاتصال وحاول مجددًا.
            </p>
          )}
        </div>
      </header>

      {/* Built-in Digital Card Dialog */}
      <Dialog
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        title="البطاقة الجامعية الإلكترونية"
      >
        {cardLoading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold">جارٍ استدعاء بيانات الهوية المشفرة...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 overflow-hidden bg-slate-900/90 shadow-xl">
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 px-5 py-3.5 border-b border-emerald-500/20 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">الجامعة المستنصرية</h4>
                  <p className="text-[11px] text-emerald-400 font-medium">بطاقة الهوية الأكاديمية الذكية</p>
                </div>
                <GraduationCap className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="p-6 flex flex-col items-center gap-4 text-center">
                {cardData?.qrImage ? (
                  <div className="p-2.5 bg-white rounded-2xl shadow-lg border border-slate-300">
                    <img
                      src={cardData.qrImage}
                      alt="رمز QR للبطاقة الجامعية"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center rounded-2xl border border-dashed border-slate-700 text-xs text-slate-500">
                    الرمز غير متوفر
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {user?.name}
                  </h3>
                  <p className="text-xs text-emerald-400 font-mono font-bold" dir="ltr">
                    {cardData?.studentId || "UOM-STUDENT"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {cardData?.department || "كلية العلوم"}
                    {cardData?.stage ? ` • المرحلة ${cardData.stage}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {cardError && (
              <p className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl text-center">
                {cardError}
              </p>
            )}

            <button
              type="button"
              onClick={handleRotateCardToken}
              disabled={rotating}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              {rotating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              )}
              تجديد رمز التحقق الآمن (Rotate Token)
            </button>
          </div>
        )}
      </Dialog>
    </>
  );
}
