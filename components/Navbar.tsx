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
  CalendarDays,
  MessageSquare,
  LogOut,
  ChevronDown,
  RefreshCw,
  BookmarkCheck,
  Menu,
  X,
  User as UserIcon,
  ShieldAlert,
  Users,
  Building2,
  Megaphone,
  History,
  FileCheck2,
  UploadCloud,
  MessagesSquare,
  ArrowUpRight,
} from "lucide-react";
import { logoutUser, getStoredUser, type User } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Dialog from "@/components/Dialog";
import NotificationBell from "@/components/NotificationBell";
import DigitalIdModal from "@/components/DigitalIdModal";

export interface NavbarProps {
  user?: User | null;
  onOpenProfile?: () => void;
  onOpenCard?: () => void;
  onLoginClick?: () => void;
  ctaText?: string;
  ctaHref?: string;
}

interface NavGroup {
  label: string;
  align: "right" | "center" | "left";
  items: {
    label: string;
    href: string;
    icon: any;
    desc?: string;
  }[];
}

// ─────────────────────────────────────────────
// ROLE-SPECIFIC MENU GROUPS
// ─────────────────────────────────────────────
const studentNavGroups: NavGroup[] = [
  {
    label: "الجداول والمخطط",
    align: "right",
    items: [
      {
        label: "الجدول الأسبوعي المركزي",
        href: "/dashboard/student/schedule",
        icon: CalendarDays,
        desc: "الجدول الرسمي المعتمد من القسم",
      },
      {
        label: "المخطط والجدول الذاتي",
        href: "/dashboard/student/planner",
        icon: BookmarkCheck,
        desc: "جدولك الخاص، الملاحظات وتتبع الغيابات",
      },
    ],
  },
  {
    label: "المقررات والدراسة",
    align: "center",
    items: [
      {
        label: "المحاضرات والملازم",
        href: "/dashboard/student/materials",
        icon: BookOpen,
        desc: "المصادر التعليمية والمحاضرات",
      },
      {
        label: "الواجبات والتكليفات",
        href: "/dashboard/student/assignments",
        icon: FileText,
        desc: "تسليم التكليفات والمهام الدراسية",
      },
      {
        label: "كشف الدرجات",
        href: "/dashboard/student/grades",
        icon: Award,
        desc: "نتائج الامتحانات والأعمال الفصلية",
      },
    ],
  },
  {
    label: "الخدمات الذكية",
    align: "left",
    items: [
      {
        label: "تسجيل الحضور الإلكتروني",
        href: "/dashboard/student/attendance",
        icon: QrCode,
        desc: "مسح رمز QR وإثبات الحضور",
      },
      {
        label: "حائط الأسئلة والمناقشة",
        href: "/dashboard/student/questions",
        icon: MessageSquare,
        desc: "طرح الأسئلة ومناقشة التدريسيين",
      },
    ],
  },
];

const doctorNavGroups: NavGroup[] = [
  {
    label: "التدريس والمقررات",
    align: "right",
    items: [
      {
        label: "المقررات والجداول والطلبة",
        href: "/dashboard/doctor/courses",
        icon: BookOpen,
        desc: "الشعب والقاعات والطلاب المسجلين",
      },
      {
        label: "المحاضرات والملازم",
        href: "/dashboard/doctor/materials",
        icon: UploadCloud,
        desc: "رفع المصادر والملفات التعليمية",
      },
      {
        label: "الواجبات والتصحيح",
        href: "/dashboard/doctor/assignments",
        icon: FileCheck2,
        desc: "إدارة التكليفات وتصحيح الحلول",
      },
      {
        label: "رصد الدرجات والسعي",
        href: "/dashboard/doctor/grades",
        icon: Award,
        desc: "إدخال درجات الفصول والامتحانات",
      },
    ],
  },
  {
    label: "الطلاب والمناقشة",
    align: "left",
    items: [
      {
        label: "إدارة الحضور الحي (QR)",
        href: "/dashboard/doctor/attendance",
        icon: QrCode,
        desc: "بدء جلسة الحضور وتوليد الرمز",
      },
      {
        label: "مناقشات الشعبة",
        href: "/dashboard/doctor/questions",
        icon: MessagesSquare,
        desc: "الإجابة على أسئلة واستفسارات الطلبة",
      },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    label: "الإدارة الأكاديمية",
    align: "right",
    items: [
      {
        label: "الأقسام والمقررات والشعب",
        href: "/dashboard/admin/academic",
        icon: Building2,
        desc: "هيكلة الأقسام والمراحل الدراسية",
      },
      {
        label: "الجداول الأسبوعية وتوزيع القاعات",
        href: "/dashboard/admin/schedule",
        icon: CalendarDays,
        desc: "توزيع القاعات ومنع تعارض الأساتذة",
      },
    ],
  },
  {
    label: "النظام والرقابة",
    align: "left",
    items: [
      {
        label: "إدارة حسابات المستخدمين",
        href: "/dashboard/admin/users",
        icon: Users,
        desc: "الطلاب والأساتذة والمشرفين",
      },
      {
        label: "التعميمات والإعلانات",
        href: "/dashboard/admin/announcements",
        icon: Megaphone,
        desc: "نشر التبليغات المركزية للجامعة",
      },
      {
        label: "سجل الرقابة والأمان (Audit)",
        href: "/dashboard/admin/audit",
        icon: History,
        desc: "تتبع نشاطات النظام وسجلات الدخول",
      },
    ],
  },
];

const guestNavLinks = [
  { label: "الرئيسية", href: "#home" },
  { label: "عن النظام", href: "#about" },
  { label: "الخدمات الأكاديمية", href: "#services" },
  { label: "البوابات", href: "#portals" },
  { label: "الدعم الجامعي", href: "#contact" },
];

export default function Navbar({
  user: initialUser,
  onOpenProfile,
  onOpenCard,
  onLoginClick,
  ctaText = "تسجيل الدخول",
  ctaHref = "#login",
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Resolve active user (from props or local storage)
  const [user, setUser] = useState<User | null>(initialUser || null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    } else {
      const stored = getStoredUser();
      setUser(stored);
    }
  }, [initialUser, pathname]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Single exclusive active menu state: null | "profile" | group.label
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Digital Card Modal state (for students)
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const [rotating, setRotating] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setActiveMenu(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  const role = user?.role;
  const isStudent = role === "STUDENT";
  const isDoctor = role === "DOCTOR";
  const isAdmin = role === "ADMIN";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isDashboard = Boolean(isDashboardRoute && (isStudent || isDoctor || isAdmin));

  // Determine home link & groups based on role
  const homeHref = isStudent
    ? "/dashboard/student"
    : isDoctor
    ? "/dashboard/doctor"
    : isAdmin
    ? "/dashboard/admin"
    : "/";

  const currentGroups = isStudent
    ? studentNavGroups
    : isDoctor
    ? doctorNavGroups
    : isAdmin
    ? adminNavGroups
    : [];

  const isItemActive = (href: string) =>
    pathname === href || (href !== homeHref && pathname.startsWith(`${href}/`));

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isItemActive(item.href));

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      router.replace("/");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleOpenCard = async () => {
    setActiveMenu(null);
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

  const getGroupPositionClasses = (align: "right" | "center" | "left") => {
    if (align === "right") return "right-0 origin-top-right";
    if (align === "center") return "right-1/2 translate-x-1/2 origin-top";
    return "left-0 origin-top-left";
  };

  return (
    <>
      {/* Floating Island Capsule Navbar (Universal across entire system) */}
      <header className="sticky top-4 z-50 flex justify-center px-3 sm:px-6 w-full pointer-events-none mb-3 print:hidden">
        <nav
          ref={navRef}
          dir="rtl"
          className="pointer-events-auto bg-[#18181b] border border-white/10 text-white rounded-full p-2 pl-2.5 pr-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-4 md:gap-6 max-w-fit w-full transition-all duration-300"
        >
          {/* Right: Circular Brand Button (Mustansiriyah University Official Emblem) */}
          <Link
            href={isDashboard ? homeHref : "/"}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-transform duration-200 p-1 overflow-hidden"
            title="الجامعة المستنصرية - UAMS"
          >
            <img
              src="/uom-logo.png"
              alt="شعار الجامعة المستنصرية"
              className="w-full h-full object-contain"
            />
          </Link>

          {/* Center: Desktop Navigation */}
          {isDashboard ? (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
              {/* Role Home Link */}
              <Link
                href={homeHref}
                className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  pathname === homeHref
                    ? "bg-white text-slate-950 font-bold shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                الرئيسية
              </Link>

              {/* Role Dropdown Groups */}
              {currentGroups.map((group) => {
                const active = isGroupActive(group);
                const isOpen = activeMenu === group.label;

                return (
                  <div key={group.label} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(isOpen ? null : group.label)}
                      className={`px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                        isOpen
                          ? "bg-white text-slate-950 font-bold shadow-xs"
                          : active
                          ? "bg-white/15 text-white font-bold"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isOpen ? "rotate-180" : "text-slate-400"
                        }`}
                      />
                    </button>

                    {/* Smooth Animated Dropdown Popover */}
                    <div
                      className={`absolute top-full mt-3 w-64 bg-white text-slate-900 rounded-2xl p-2 border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.18)] z-50 text-right space-y-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${getGroupPositionClasses(
                        group.align
                      )} ${
                        isOpen
                          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                          : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                      }`}
                    >
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const itemActive = isItemActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setActiveMenu(null)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 ease-out hover:scale-[1.01] ${
                              itemActive
                                ? "bg-slate-100 text-slate-950 font-bold"
                                : "text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[#14352c] mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs font-bold leading-tight">{item.label}</p>
                              {item.desc && (
                                <p className="text-[11px] text-slate-500 font-normal truncate">
                                  {item.desc}
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Guest / Landing Nav Links */
            <div className="hidden md:flex items-center gap-1.5 lg:gap-3 text-xs lg:text-sm font-medium text-slate-300">
              {guestNavLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Left: Utilities & White Pill Button */}
          <div className="flex items-center gap-2 shrink-0">
            {isDashboard ? (
              <>
                {/* Notification Bell */}
                <div className="hidden sm:block">
                  <NotificationBell theme="dark" />
                </div>

                {/* Digital Card Quick Trigger for Student */}
                {isStudent && (
                  <button
                    type="button"
                    onClick={handleOpenCard}
                    title="البطاقة الجامعية الإلكترونية"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                )}

                {/* White Capsule Pill Button (User Email / Profile Trigger) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenu(activeMenu === "profile" ? null : "profile")}
                    className={`rounded-full px-4 py-2 text-xs font-bold active:scale-95 transition-all duration-200 shadow-sm shrink-0 whitespace-nowrap flex items-center gap-2 ${
                      activeMenu === "profile"
                        ? "bg-slate-100 text-slate-950 ring-2 ring-white/20"
                        : "bg-white text-slate-950 hover:bg-slate-100"
                    }`}
                    title="الملف الشخصي"
                  >
                    <span className="max-w-[120px] sm:max-w-[160px] truncate" dir="ltr">
                      {user?.email || "user@uomustansiriyah.edu.iq"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        activeMenu === "profile" ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Smooth Animated Profile Dropdown Menu */}
                  <div
                    dir="rtl"
                    className={`absolute left-0 mt-3 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)] z-50 text-right space-y-1 origin-top-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeMenu === "profile"
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                    }`}
                  >
                    <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "المستخدم"}</p>
                      <p className="text-[11px] text-emerald-800 font-semibold">
                        {isStudent ? "طالب منتظم" : isDoctor ? "أستاذ جامعي" : "مدير النظام الأكاديمي"}
                      </p>
                    </div>

                    {isStudent && (
                      <>
                        <Link
                          href="/dashboard/student/profile"
                          onClick={() => setActiveMenu(null)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4 text-slate-500" />
                          <span>السجل الأكاديمي والملف</span>
                        </Link>

                        <button
                          type="button"
                          onClick={handleOpenCard}
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition flex items-center gap-2"
                        >
                          <QrCode className="w-4 h-4 text-[#14352c]" />
                          <span>عرض الهوية الرقمية</span>
                        </button>
                      </>
                    )}

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {isLoggingOut ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4 text-rose-600" />
                        )}
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Landing Mode Capsule Pill Button */
              <>
                {user ? (
                  <Link
                    href={homeHref}
                    className="bg-white text-slate-950 rounded-full px-5 py-2 text-xs sm:text-sm font-bold hover:bg-slate-100 active:scale-95 transition-all duration-200 shadow-sm shrink-0 whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>لوحة التحكم</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" />
                  </Link>
                ) : onLoginClick ? (
                  <button
                    type="button"
                    onClick={onLoginClick}
                    className="bg-white text-slate-950 rounded-full px-5 py-2 text-xs sm:text-sm font-bold hover:bg-slate-100 active:scale-95 transition-all duration-200 shadow-sm shrink-0 whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>{ctaText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                ) : (
                  <Link
                    href={ctaHref}
                    className="bg-white text-slate-950 rounded-full px-5 py-2 text-xs sm:text-sm font-bold hover:bg-slate-100 active:scale-95 transition-all duration-200 shadow-sm shrink-0 whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>{ctaText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" />
                  </Link>
                )}
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            dir="rtl"
            className="pointer-events-auto absolute top-16 inset-x-4 max-w-sm mx-auto bg-[#18181b]/98 border border-white/10 rounded-3xl p-4 text-white shadow-2xl backdrop-blur-xl md:hidden space-y-3 animate-in fade-in slide-in-from-top-4 duration-200"
          >
            {isDashboard ? (
              <>
                <Link
                  href={homeHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 text-white"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>الرئيسية</span>
                </Link>

                {currentGroups.map((group) => (
                  <div key={group.label} className="space-y-1 pt-2 border-t border-white/10">
                    <p className="text-[11px] font-bold text-slate-400 px-3">{group.label}</p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition ${
                            active
                              ? "bg-white text-slate-950 font-bold"
                              : "text-slate-300 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}

                {isStudent && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <p className="text-[11px] font-bold text-slate-400 px-3">الملف والبطاقة</p>
                    <Link
                      href="/dashboard/student/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        pathname === "/dashboard/student/profile"
                          ? "bg-white text-slate-950 font-bold"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>السجل الأكاديمي والملف</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleOpenCard();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition text-right"
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>عرض الهوية الرقمية</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              guestNavLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition"
                >
                  {link.label}
                </Link>
              ))
            )}
          </div>
        )}
      </header>

      {/* Digital ID Card Modal (Universal) */}
      <DigitalIdModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
      />
    </>
  );
}
