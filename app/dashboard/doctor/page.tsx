"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from '@/components/Navbar';
import Dialog from "@/components/Dialog";
import {
  Users,
  BookOpen,
  QrCode,
  FileCheck,
  Play,
  RefreshCw,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  MessagesSquare,
} from "lucide-react";

import { smartCache } from "@/lib/cache";

const mono = { className: "font-mono" };

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Attendance Session Dialog State
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sessionQr, setSessionQr] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    const cached = smartCache.get("/dashboards/doctor");
    if (cached?.data) {
      setData(cached.data);
      setLoading(false);
    }

    apiFetch("/dashboards/doctor")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || "تعذر تحميل بيانات اللوحة.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleOpenStartSession = (section: any) => {
    setSelectedSection(section);
    setSessionQr(null);
    setSessionId(null);
    setShowSessionModal(true);
  };

  const handleCreateSession = async () => {
    if (!selectedSection) return;
    setStartingSession(true);
    try {
      const res = await apiFetch("/attendance/sessions", {
        method: "POST",
        body: JSON.stringify({
          sectionId: selectedSection._id,
          sessionType: "LECTURE",
          durationMinutes: 90,
          latitude: 33.3128,
          longitude: 44.3615,
          radiusMeters: 50,
        }),
      });
      if (res.data?.qrImage) {
        setSessionQr(res.data.qrImage);
        setSessionId(res.data._id);
      }
    } catch (err: any) {
      setError(err.message || "فشل بدء الجلسة.");
    } finally {
      setStartingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  const sections = data?.sections || [];
  const metrics = data?.metrics || {};
  const totalStudents = metrics.totalStudentsTaught ?? metrics.totalStudents ?? 0;
  const pendingGrading = metrics.pendingGradingCount ?? metrics.activeAssignments ?? 0;
  const unansweredQuestions = metrics.unansweredQuestionsCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Notification */}
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
              المنظومة الأكاديمية الرسمية المعتمدة
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              أهلاً بك، {user?.name || "د. الأستاذ الجامعي"}
            </h2>
            <p className="text-sm text-slate-600">
              إدارة المحاضرات والشُعب، متابعة الحضور الذكي، وتقييم أعمال الطلبة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/doctor/courses"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 shadow-xs flex items-center gap-2 transition"
            >
              <BookOpen className="w-4 h-4 text-[#14352c]" />
              المقررات والطلبة والجداول
            </Link>
            <Link
              href="/dashboard/doctor/attendance"
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition"
            >
              <QrCode className="w-4 h-4" />
              غرفة الحضور الحي
            </Link>
          </div>
        </div>

        {/* Quick Metrics KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#14352c]" />
              الشعب المكلفة
            </span>
            <p className={`text-2xl font-bold text-slate-900 pt-1 ${mono.className}`}>
              {sections.length}
            </p>
            <span className="text-xs text-slate-500 block">شُعب دراسية نشطة</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-emerald-600 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              إجمالي الطلبة
            </span>
            <p className={`text-2xl font-bold text-emerald-700 pt-1 ${mono.className}`}>
              {totalStudents}
            </p>
            <span className="text-xs text-slate-500 block">طالب في مقرراتك</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-amber-500 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-amber-600" />
              واجبات للتصحيح
            </span>
            <p className={`text-2xl font-bold text-amber-700 pt-1 ${mono.className}`}>
              {pendingGrading}
            </p>
            <span className="text-xs text-slate-500 block">تسليمات بانتظار التقييم</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-[#b8923f] shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <MessagesSquare className="w-4 h-4 text-[#b8923f]" />
              استفسارات الطلاب
            </span>
            <p className={`text-2xl font-bold text-[#b8923f] pt-1 ${mono.className}`}>
              {unansweredQuestions}
            </p>
            <span className="text-xs text-slate-500 block">أسئلة بانتظار الإجابة</span>
          </div>
        </div>

        {/* Assigned Sections Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#14352c]" />
              المواد والشعب الدراسية المسندة إليك
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              إجمالي {sections.length} شعبة
            </span>
          </div>

          {sections.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد مواد مسندة حالياً</p>
              <p className="text-xs text-slate-500">يرجى مراجعة القسم الأكاديمي لتكليفك بالشعب الدراسية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sections.map((sec: any) => {
                const enrolledCount = sec.enrolledCount ?? sec.students?.length ?? 0;
                const capacity = sec.capacity || 60;
                const pct = Math.min(Math.round((enrolledCount / capacity) * 100), 100);

                return (
                  <div
                    key={sec._id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-5 shadow-sm transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                          شعبة {sec.sectionNumber || "1"}
                        </span>
                        <span className={`text-xs text-slate-500 ${mono.className}`}>
                          {enrolledCount} / {capacity} طالب
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900">
                          {sec.courseName || sec.course?.name || "المقرر الدراسي"}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          رمز المقرر: <span className="font-mono font-semibold text-slate-700">{sec.courseCode || sec.course?.code || "CS101"}</span>
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#14352c] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => handleOpenStartSession(sec)}
                        className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        بدء جلسة حضور ذكية
                      </button>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <Link
                          href={`/dashboard/doctor/courses?sectionId=${sec._id}&tab=students`}
                          className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#14352c] font-bold transition flex items-center justify-center gap-1"
                        >
                          <Users className="w-3 h-3 text-[#14352c]" />
                          الطلبة
                        </Link>
                        <Link
                          href={`/dashboard/doctor/assignments`}
                          className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition flex items-center justify-center gap-1"
                        >
                          الواجبات <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </Link>
                        <Link
                          href={`/dashboard/doctor/grades`}
                          className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition flex items-center justify-center gap-1"
                        >
                          رصد السعي <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Start Session Modal */}
      <Dialog
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title={`جلسة حضور: ${selectedSection?.courseName || selectedSection?.course?.name || "المادة"}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-5 text-center">
          {!sessionQr ? (
            <div className="space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto">
                <QrCode className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">تأكيد فتح جلسة الحضور الذكية</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  سيتم إنشاء رمز QR ديناميكي يتجدد بانتظام مع التحقق من النطاق الجغرافي للجامعة.
                </p>
              </div>

              <button
                onClick={handleCreateSession}
                disabled={startingSession}
                className="w-full py-3 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {startingSession ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                توليد الرمز وعرض الشاشة الحية
              </button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-white rounded-2xl inline-block shadow-md border border-slate-200">
                <img
                  src={sessionQr}
                  alt="QR Code"
                  className="w-56 h-56 mx-auto object-contain"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                  معرف الجلسة: {sessionId}
                </span>
                <p className="text-xs text-slate-600 pt-2">
                  اطلب من الطلبة مسح الرمز من خلال تطبيقهم الجامعي الآن.
                </p>
              </div>

              <Link
                href={`/dashboard/doctor/attendance`}
                className="block w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition text-center"
              >
                الانتقال لغرفة العرض المباشر والشاشة الكبيرة
              </Link>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
