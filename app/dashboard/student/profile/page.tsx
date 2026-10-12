"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import StudentNav from "@/components/StudentNav";
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
                studentId: d?.studentInfo?.studentId || "N/A",
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
      <div className="min-h-screen flex items-center justify-center bg-[#090f1d] text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const p = profileData?.profile || {};
  const stats = profileData?.stats || {};
  const sections = profileData?.enrolledSections || [];
  const initial = (user?.name || "ط").trim().charAt(0);

  return (
    <div className="min-h-screen bg-[#090f1d] text-slate-100 flex flex-col" dir="rtl">
      <StudentNav user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-5 sm:p-7 space-y-6">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link
                href="/dashboard/student"
                className="hover:text-emerald-400 transition"
              >
                الرئيسية
              </Link>
              <span>/</span>
              <span className="text-emerald-400">السجل الأكاديمي</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-emerald-400" />
              بيانات السجل الأكاديمي والقيد الجامعي
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              البيانات الرسمية المعتمدة لدى شعبة التسجيل وشؤون الطلبة في الجامعة المستنصرية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
              قيد أكاديمي منتظم ومفعل
            </span>
          </div>
        </div>

        {/* Student Identity Card */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="size-20 sm:size-24 rounded-3xl border-2 border-emerald-500/30 bg-slate-950 flex items-center justify-center text-3xl font-black text-emerald-400 shadow-inner">
                {initial}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user?.name || "طالب جامعي"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-mono">
                  {user?.email || "—"}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {p.college || "الجامعة المستنصرية"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {p.department || "القسم الأكاديمي"}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block">
                  الرقم الجامعي
                </span>
                <span className="text-base font-mono font-bold text-white tracking-wider">
                  {p.studentId || "—"}
                </span>
              </div>
              {p.studentId && (
                <button
                  type="button"
                  onClick={copyStudentId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>نسخ الرقم</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Academic Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              الكلية
            </span>
            <p className="text-sm font-bold text-white pt-1">{p.college || "—"}</p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              القسم العلمي
            </span>
            <p className="text-sm font-bold text-white pt-1">{p.department || "—"}</p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-teal-400" />
              المرحلة الدراسية
            </span>
            <p className="text-sm font-bold text-white pt-1">
              {p.stage ? `المرحلة ${p.stage}` : "—"}
            </p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              نوع الدراسة
            </span>
            <p className="text-sm font-bold text-white pt-1">
              {p.studyType === "EVENING" ? "الدراسة المسائية" : "الدراسة الصباحية"}
            </p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-400" />
              سنة القبول
            </span>
            <p className="text-sm font-bold text-white pt-1 font-mono">
              {p.admissionYear || "2024"}
            </p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              الحالة الأكاديمية
            </span>
            <p className="text-sm font-bold text-emerald-400 pt-1">طالب نظامي مستمر</p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              الوحدات المعتمدة
            </span>
            <p className="text-sm font-bold text-white pt-1 font-mono">
              {stats.totalCredits} ساعة معتمدة
            </p>
          </div>

          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-rose-400" />
              نسبة الحضور التراكمية
            </span>
            <p className="text-sm font-bold text-emerald-400 pt-1 font-mono">
              {stats.attendanceRate}
            </p>
          </div>
        </div>

        {/* Enrolled Courses in Record */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                المقررات الدراسية المسجلة في القيد
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                قائمة المواد المعتمدة للفصل الدراسي الحالي
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-xl">
              {sections.length} مواد مسجلة
            </span>
          </div>

          {sections.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-500">
              لا توجد مقررات مسجلة في القيد الحالي.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {sections.map((sec: any, idx: number) => {
                const course = sec.course || sec.section?.course || {};
                const doctor = sec.doctor || sec.section?.doctor || {};
                return (
                  <div
                    key={sec._id || idx}
                    className="p-4 rounded-2xl bg-slate-850/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {course.name || "مقرر دراسي"}
                        </span>
                        {course.code && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
                            {course.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {doctor.name ? `أستاذ المادة: ${doctor.name}` : "—"}
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xs font-bold text-emerald-400 font-mono block">
                        {course.credits ? `${course.credits} وحدات` : "—"}
                      </span>
                      {sec.sectionNumber && (
                        <span className="text-[10px] text-slate-400">
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
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">كشف السعي والدرجات</span>
                <span className="text-[11px] text-slate-400">عرض تفاصيل السعي الفصلي</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dashboard/student/attendance"
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">سجل الحضور والغيابات</span>
                <span className="text-[11px] text-slate-400">متابعة نسب الحضور والحرمان</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:-translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dashboard/student/materials"
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">المحاضرات والملازم</span>
                <span className="text-[11px] text-slate-400">تحميل ملفات المقررات</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
