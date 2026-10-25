"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import {
  GraduationCap,
  Building2,
  Calendar,
  Clock,
  BookOpen,
  Award,
  QrCode,
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
  UserCheck,
  FileBadge,
} from "lucide-react";

export default function StudentProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    // Fetch official profile data
    apiFetch("/student/profile")
      .then((res) => {
        setProfileData(res.data);
      })
      .catch(() => {
        // Fallback to student dashboard data
        apiFetch("/dashboards/student")
          .then((res) => {
            const d = res.data;
            setProfileData({
              user: stored,
              profile: {
                studentId: d?.studentInfo?.studentId || "STD_2022101",
                stage: d?.studentInfo?.stage || 1,
                studyType: d?.studentInfo?.studyType || "MORNING",
                academicStatus: "REGULAR",
                admissionYear: 2024,
                college: d?.studentInfo?.college || "الجامعة المستنصرية",
                department: d?.studentInfo?.department || "قسم تقنيات الحاسوب",
              },
              stats: {
                enrolledCoursesCount: d?.metrics?.enrolledCoursesCount || 0,
                totalCredits: d?.metrics?.totalEnrolledCredits || 0,
                attendanceRate: d?.metrics?.overallAttendanceRate || "100%",
                attendedSessions: d?.metrics?.attendedSessions || 0,
                totalSessions: d?.metrics?.totalAttendanceSessions || 0,
              },
              enrolledSections: d?.enrolledSections || [],
            });
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [router]);

  const copyStudentId = async () => {
    const sId = profileData?.profile?.studentId;
    if (!sId) return;
    try {
      await navigator.clipboard.writeText(sId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#14352c] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">جارٍ تحميل بيانات السجل الأكاديمي...</p>
        </div>
      </div>
    );
  }

  const p = profileData?.profile || {};
  const stats = profileData?.stats || {};
  const sections = profileData?.enrolledSections || [];
  const initial = (user?.name || "ط").trim().charAt(0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/dashboard/student" className="hover:text-[#14352c] transition">
                بوابة الطالب
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">السجل الأكاديمي والملف</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-[#14352c]" />
              بيانات السجل الأكاديمي والقيد الجامعي
            </h1>
            <p className="text-xs text-slate-600">
              البيانات الرسمية المعتمدة لدى شعبة التسجيل وشؤون الطلبة في الجامعة المستنصرية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              قيد أكاديمي منتظم ومفعّل
            </span>
          </div>
        </div>

        {/* Student Official University Badge Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          {/* Subtle University Accent Header Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#14352c] via-[#1b4a3d] to-[#b8923f]" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            {/* Avatar & Student Names */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="size-20 sm:size-24 rounded-2xl bg-[#14352c] text-white flex items-center justify-center text-3xl font-extrabold shadow-md shrink-0">
                {initial}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {user?.name || "طالب جامعي"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    طالب منتظم
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-mono" dir="ltr">
                  {user?.email || "—"}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {p.college || "الجامعة المستنصرية"}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {p.department || "القسم الأكاديمي"}
                  </span>
                </div>
              </div>
            </div>

            {/* University ID Container */}
            <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  الرقم الجامعي الرسمي
                </span>
                <span className="text-base font-mono font-bold text-slate-900 tracking-wider">
                  {p.studentId || "STD_2022101"}
                </span>
              </div>
              {p.studentId && (
                <button
                  type="button"
                  onClick={copyStudentId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200 shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>نسخ الرقم</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Academic Details Grid (8 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-[#14352c]">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">الكلية</span>
            </div>
            <p className="text-sm font-bold text-slate-900 pr-0.5">{p.college || "—"}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-[#14352c]">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">القسم العلمي</span>
            </div>
            <p className="text-sm font-bold text-slate-900 pr-0.5">{p.department || "—"}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">المرحلة الدراسية</span>
            </div>
            <p className="text-sm font-bold text-slate-900 pr-0.5">
              {p.stage ? `المرحلة ${p.stage}` : "—"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">نوع الدراسة</span>
            </div>
            <p className="text-sm font-bold text-slate-900 pr-0.5">
              {p.studyType === "EVENING" ? "الدراسة المسائية" : "الدراسة الصباحية"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">سنة القبول</span>
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono pr-0.5">
              {p.admissionYear || "2024"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">الحالة الأكاديمية</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 pr-0.5">طالب نظامي مستمر</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">الوحدات المعتمدة</span>
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono pr-0.5">
              {stats.totalCredits || 15} ساعة معتمدة
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">نسبة الحضور التراكمية</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 font-mono pr-0.5">
              {stats.attendanceRate || "100%"}
            </p>
          </div>
        </div>

        {/* Enrolled Courses in Record */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#14352c]" />
                المقررات الدراسية المسجلة في القيد
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                قائمة المواد المعتمدة للفصل الدراسي الحالي
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200/80">
              {sections.length} مواد مسجلة
            </span>
          </div>

          {sections.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-500">
              لا توجد مقررات مسجلة في القيد الحالي.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sections.map((sec: any, idx: number) => {
                const course = sec.course || sec.section?.course || {};
                const doctor = sec.doctor || sec.section?.doctor || {};
                return (
                  <div
                    key={sec._id || idx}
                    className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-[#14352c]/30 hover:bg-slate-50 transition flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {course.name || "مقرر دراسي"}
                        </span>
                        {course.code && (
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200">
                            {course.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {doctor.name ? `أستاذ المادة: ${doctor.name}` : "مقرر معتمد"}
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xs font-bold text-[#14352c] font-mono block">
                        {course.credits ? `${course.credits} وحدات` : "3 وحدات"}
                      </span>
                      {sec.sectionNumber && (
                        <span className="text-[11px] text-slate-500 font-semibold">
                          شعبة {sec.sectionNumber}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Portal Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/student/grades"
            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#14352c] hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-[#14352c]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">كشف السعي والدرجات</span>
                <span className="text-[11px] text-slate-500">عرض تفاصيل السعي الفصلي</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#14352c] group-hover:-translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dashboard/student/attendance"
            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#14352c] hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">سجل الحضور والغيابات</span>
                <span className="text-[11px] text-slate-500">متابعة نسب الحضور والحرمان</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:-translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dashboard/student/materials"
            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#14352c] hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">المحاضرات والملازم</span>
                <span className="text-[11px] text-slate-500">تحميل ملفات المقررات</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
