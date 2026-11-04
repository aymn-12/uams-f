"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import Navbar from "@/components/Navbar";
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import {
  BookOpen,
  Calendar,
  Users,
  Search,
  Filter,
  Clock,
  MapPin,
  GraduationCap,
  RefreshCw,
  QrCode,
  Award,
  UploadCloud,
  FileSpreadsheet,
  CalendarDays,
  Printer,
  ChevronLeft,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Eye,
  Sparkles,
  Layers,
} from "lucide-react";

const mono = { className: "font-mono" };

const toArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val?.data && Array.isArray(val.data.data)) return val.data.data;
  return [];
};

const DAY_LABELS: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الإثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

const STAGE_LABELS: Record<number, string> = {
  1: "المرحلة الأولى",
  2: "المرحلة الثانية",
  3: "المرحلة الثالثة",
  4: "المرحلة الرابعة",
  5: "المرحلة الخامسة",
};

function DoctorCoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Student Roster Modal State
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studyTypeFilter, setStudyTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WARNING">("ALL");
  const [exportingExcel, setExportingExcel] = useState(false);

  // Selected Student Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Initialize Auth & query params
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    const paramSection = searchParams.get("sectionId");
    if (paramSection) {
      setActiveSectionId(paramSection);
      setRosterModalOpen(true);
    }
  }, [router, searchParams]);

  // Load Sections & Schedule Slots
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const cachedSections = smartCache.get<any>("/doctor/sections");
        if (cachedSections?.data && isMounted) {
          const arr = toArray(cachedSections.data);
          if (arr.length > 0) {
            setSections(arr);
            setLoading(false);
          }
        }

        const cachedSlots = smartCache.get<any>("/doctor/schedule");
        if (cachedSlots?.data && isMounted) {
          const arrSlots = toArray(cachedSlots.data);
          if (arrSlots.length > 0) {
            setScheduleSlots(arrSlots);
          }
        }

        const [sectionsRes, scheduleRes] = await Promise.all([
          apiFetch("/doctor/sections"),
          apiFetch("/doctor/schedule").catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          setSections(toArray(sectionsRes));
          setScheduleSlots(toArray(scheduleRes));
        }
      } catch (err) {
        console.error("Failed to load doctor academic data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Student Roster when activeSectionId opens
  useEffect(() => {
    if (!activeSectionId || !rosterModalOpen) return;

    let isMounted = true;
    setStudentsLoading(true);

    apiFetch(`/doctor/sections/${activeSectionId}/students`)
      .then((res) => {
        if (isMounted) {
          setStudentsList(toArray(res));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch student roster:", err);
        if (isMounted) setStudentsList([]);
      })
      .finally(() => {
        if (isMounted) setStudentsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSectionId, rosterModalOpen]);

  // Export Section Attendance to Excel
  const handleExportExcel = async (secId: string, secNumber?: string) => {
    const targetId = secId || activeSectionId;
    if (!targetId) return;
    setExportingExcel(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("uams_access_token") : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiBase}/reports/attendance/${targetId}/excel`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("تعذر تحميل كشف الإكسل من الخادم.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `كشف_حضور_شعبة_${secNumber || "1"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تصدير ملف الإكسل");
    } finally {
      setExportingExcel(false);
    }
  };

  // Guaranteed safe arrays
  const sectionsList = useMemo(() => toArray(sections), [sections]);
  const slotsList = useMemo(() => toArray(scheduleSlots), [scheduleSlots]);
  const students = useMemo(() => toArray(studentsList), [studentsList]);

  // Active Section Object
  const currentActiveSection = useMemo(() => {
    return sectionsList.find((s) => s._id === activeSectionId) || null;
  }, [sectionsList, activeSectionId]);

  // Unique stages doctor teaches
  const stagesList = useMemo(() => {
    const set = new Set<number>();
    sectionsList.forEach((s) => {
      if (s.course?.stage) set.add(s.course.stage);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [sectionsList]);

  // Filtered Sections by Stage & Search Query
  const filteredSections = useMemo(() => {
    return sectionsList.filter((s) => {
      const matchStage = selectedStage === "ALL" || String(s.course?.stage) === selectedStage;
      const matchSearch =
        !searchQuery.trim() ||
        (s.course?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.course?.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.sectionNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [sectionsList, selectedStage, searchQuery]);

  // Today's Lectures
  const todayKey = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  }, []);

  const todaySlots = useMemo(() => {
    return slotsList.filter((slot) => (slot.dayOfWeek || "").toUpperCase() === todayKey);
  }, [slotsList, todayKey]);

  // Total Students Taught
  const totalStudentsCount = useMemo(() => {
    return sectionsList.reduce((acc, curr) => acc + (curr.enrolledCount || 0), 0);
  }, [sectionsList]);

  // Filtered Students in Roster Modal
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchQuery =
        !studentSearch.trim() ||
        (st.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.studentId || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.email || "").toLowerCase().includes(studentSearch.toLowerCase());

      const matchStudyType = studyTypeFilter === "ALL" || st.studyType === studyTypeFilter;

      const matchStatus =
        statusFilter === "ALL"
          ? true
          : st.warningLevel === "WARNING" || st.warningLevel === "DEPRIVED" || st.warningLevel === "ALERT";

      return matchQuery && matchStudyType && matchStatus;
    });
  }, [students, studentSearch, studyTypeFilter, statusFilter]);

  const atRiskCount = useMemo(() => {
    return students.filter(
      (s) => s.warningLevel === "WARNING" || s.warningLevel === "DEPRIVED" || s.warningLevel === "ALERT"
    ).length;
  }, [students]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Universal Island Capsule Navbar */}
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة التدريسي
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">المقررات والشُعب الدراسية</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-[#14352c]" />
              المقررات والشُعب الدراسية
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              إدارة المواد المكلفة، قوائم الطلبة، وتسجيل الحضور والسعي اليومي بسهولة ووضوح
            </p>
          </div>

          {/* Quick Header Actions & Stats */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">الشُعب المكلفة</span>
              <span className={`text-sm font-bold text-slate-900 ${mono.className}`}>
                {sectionsList.length} شُعب
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-700 block font-medium">إجمالي الطلبة</span>
              <span className={`text-sm font-bold text-emerald-900 ${mono.className}`}>
                {totalStudentsCount} طالب
              </span>
            </div>

            {/* Direct Link to the Official Timetable */}
            <Link
              href="/dashboard/doctor/schedule"
              className="px-3.5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="عرض الجدول الدراسي الأسبوعي المعتمد"
            >
              <CalendarDays className="w-4 h-4 text-emerald-300" />
              <span>الجدول الأسبوعي</span>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TODAY'S LECTURE HIGHLIGHT CAPSULE (شريط محاضرات اليوم الحية) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {todaySlots.length > 0 ? (
          <div className="bg-gradient-to-l from-emerald-50/90 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="size-10 rounded-xl bg-[#14352c] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    محاضراتك المجدولة اليوم ({DAY_LABELS[todayKey] || todayKey}):
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {todaySlots.length} محاضرة
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-700">
                  {todaySlots.map((slot, idx) => (
                    <span key={slot._id || idx} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                      <span className="font-bold text-[#14352c]">{slot.section?.course?.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-slate-600">{slot.startTime} - {slot.endTime}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">{slot.room || "قاعة المحاضرات"}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/doctor/attendance"
              className="px-4 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span>بدء جلسة الحضور الحي (QR)</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white p-3.5 px-5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>لا توجد محاضرات مجدولة لليوم ({DAY_LABELS[todayKey] || "اليوم"}). يمكنك استثمار الوقت في رصد السعي أو تجهيز الملازم.</span>
            </div>
            <Link
              href="/dashboard/doctor/schedule"
              className="text-[#14352c] font-bold hover:underline flex items-center gap-0.5 text-xs"
            >
              <span>معاينة باقي أيام الأسبوع</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FILTER & SEARCH BAR                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Quick Stage Filter Badges */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSelectedStage("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedStage === "ALL"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              الكل ({sectionsList.length})
            </button>
            {stagesList.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStage(String(st))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedStage === String(st)
                    ? "bg-[#14352c] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {STAGE_LABELS[st] || `المرحلة ${st}`}
              </button>
            ))}
          </div>

          {/* Quick Course Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مقرر أو كود المادة..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STREAMLINED COURSE CARDS GRID                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {filteredSections.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لا توجد مقررات دراسية مطابقة</h3>
            <p className="text-xs text-slate-500">جرب تغيير شروط التصفية أو البحث أعلاه.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map((sec) => {
              const enrolled = sec.enrolledCount || 0;
              const stageNum = sec.course?.stage || 1;
              const schedules = sec.schedule || [];

              return (
                <div
                  key={sec._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md p-5 flex flex-col justify-between space-y-4 transition group"
                >
                  <div className="space-y-3.5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#14352c] font-bold text-[11px]">
                          {STAGE_LABELS[stageNum] || `المرحلة ${stageNum}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] font-mono">
                          شعبة {sec.sectionNumber || "1"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        {sec.course?.code || "CPE"} • {sec.course?.credits || 3} وحدات
                      </span>
                    </div>

                    {/* Course Title & Department */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#14352c] transition leading-snug">
                        {sec.course?.name || "المقرر الدراسي"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>{sec.semester === "FIRST" ? "الكورس الأول" : "الكورس الثاني"}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">{sec.academicYear || "2025-2026"}</span>
                      </p>
                    </div>

                    {/* Schedule & Timing Box */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      {schedules.length > 0 ? (
                        schedules.map((sch: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-slate-700">
                            <span className="font-bold text-[#14352c]">
                              {DAY_LABELS[sch.dayOfWeek] || sch.dayOfWeek}
                            </span>
                            <span className="font-mono text-slate-600 text-[11px]">
                              {sch.startTime} - {sch.endTime}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[110px]">
                              {sch.room || "قاعة المحاضرات"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-center py-1">
                          لم يتم تحديد قاعة أو وقت بعد
                        </div>
                      )}
                    </div>

                    {/* Quick Student Count Bar */}
                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/60 px-3 py-2 rounded-xl">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        الطلبة المقبولين بالشعبة:
                      </span>
                      <span className={`font-bold text-slate-900 ${mono.className}`}>
                        {enrolled} طالب
                      </span>
                    </div>
                  </div>

                  {/* Actions Hub */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {/* Primary Green CTA: Instant Attendance */}
                    <Link
                      href="/dashboard/doctor/attendance"
                      className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-300" />
                      <span>تسجيل الحضور الذكي (QR)</span>
                    </Link>

                    {/* Secondary Clean Action Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      {/* View Student Roster */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSectionId(sec._id);
                          setRosterModalOpen(true);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center justify-center gap-1 border border-slate-200"
                        title="كشف طلبة هذه الشعبة"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        <span>الطلبة</span>
                      </button>

                      {/* Grades & Coursework */}
                      <Link
                        href={`/dashboard/doctor/grades?sectionId=${sec._id}`}
                        className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center justify-center gap-1 border border-slate-200"
                        title="رصد السعي والامتحانات"
                      >
                        <Award className="w-3.5 h-3.5 text-slate-600" />
                        <span>السعي</span>
                      </Link>

                      {/* Course Materials */}
                      <Link
                        href="/dashboard/doctor/materials"
                        className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center justify-center gap-1 border border-slate-200"
                        title="المحاضرات والملازم"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                        <span>الملازم</span>
                      </Link>

                      {/* Direct Excel Export */}
                      <button
                        type="button"
                        onClick={() => handleExportExcel(sec._id, sec.sectionNumber)}
                        disabled={exportingExcel}
                        className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition flex items-center justify-center gap-1 border border-emerald-200 disabled:opacity-50"
                        title="تنزيل كشف الحضور Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>إكسل</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* INTEGRATED STUDENT ROSTER MODAL                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={`كشف طلبة: ${currentActiveSection?.course?.name || "المقرر"} (شعبة ${currentActiveSection?.sectionNumber || "1"})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Quick Roster Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">المسجلين</span>
                <span className={`text-xs font-bold text-slate-900 ${mono.className}`}>
                  {students.length} طالب
                </span>
              </div>
              <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-emerald-700 block">صباحي</span>
                <span className={`text-xs font-bold text-emerald-900 ${mono.className}`}>
                  {students.filter((s) => s.studyType === "MORNING").length}
                </span>
              </div>
              <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-amber-700 block">مسائي</span>
                <span className={`text-xs font-bold text-amber-900 ${mono.className}`}>
                  {students.filter((s) => s.studyType === "EVENING").length}
                </span>
              </div>
              {atRiskCount > 0 && (
                <div className="text-center px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold block">إنذارات غياب</span>
                  <span className={`text-xs font-bold text-rose-900 ${mono.className}`}>
                    {atRiskCount} طالب
                  </span>
                </div>
              )}
            </div>

            {/* Direct Excel Download in Modal */}
            <button
              type="button"
              onClick={() => handleExportExcel(activeSectionId, currentActiveSection?.sectionNumber)}
              disabled={exportingExcel || students.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير كشف Excel</span>
            </button>
          </div>

          {/* Search & Filter Bar inside Modal */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="ابحث عن اسم الطالب، الرقم الجامعي..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] transition"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStudyTypeFilter("ALL")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  studyTypeFilter === "ALL" ? "bg-[#14352c] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setStudyTypeFilter("MORNING")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  studyTypeFilter === "MORNING" ? "bg-[#14352c] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                صباحي
              </button>
              <button
                type="button"
                onClick={() => setStudyTypeFilter("EVENING")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  studyTypeFilter === "EVENING" ? "bg-[#14352c] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                مسائي
              </button>
              {atRiskCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter((p) => (p === "WARNING" ? "ALL" : "WARNING"))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    statusFilter === "WARNING"
                      ? "bg-rose-700 text-white"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  إنذارات ({atRiskCount})
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[420px] overflow-y-auto">
            {studentsLoading ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#14352c]" />
                <p className="text-xs text-slate-500 font-medium">جارٍ تحميل قائمة الطلبة...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                لا يوجد طلاب مطابقين للبحث
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">الطالب والبريد الجامعي</th>
                    <th className="py-2.5 px-3">الرقم الجامعي</th>
                    <th className="py-2.5 px-3">الدراسة</th>
                    <th className="py-2.5 px-3">سجل الغيابات</th>
                    <th className="py-2.5 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st, idx) => (
                    <tr
                      key={st._id}
                      onClick={() => setSelectedStudent(st)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div>
                          <h5 className="font-bold text-slate-900">{st.name}</h5>
                          <span className="text-[10px] text-slate-500 font-mono block">{st.email}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{st.studentId || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.studyType === "MORNING"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {st.studyType === "MORNING" ? "صباحي" : "مسائي"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {st.warningLevel === "DEPRIVED" ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[10px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3" />
                            تجاوز الحرمان ({st.absentCount || 0}/{st.maxAbsences || 6})
                          </span>
                        ) : st.warningLevel === "WARNING" ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            إنذار نهائي ({st.absentCount || 0}/{st.maxAbsences || 6})
                          </span>
                        ) : st.warningLevel === "ALERT" ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[10px] bg-amber-50/60 border border-amber-200 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            إنذار أول ({st.absentCount || 0}/{st.maxAbsences || 6})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>منتظم ({st.absentCount || 0} غياب)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(st);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                            title="معاينة تفاصيل الملف"
                          >
                            ملف
                          </button>
                          <Link
                            href={`/dashboard/doctor/grades?sectionId=${activeSectionId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-[#14352c] text-[11px] font-bold border border-emerald-200"
                            title="رصد الدرجات والسعي"
                          >
                            سعي
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRosterModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STUDENT PROFILE DETAILS MODAL                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={`الملف الأكاديمي: ${selectedStudent?.name || "الطالب"}`}
        maxWidth="max-w-md"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="size-12 rounded-xl bg-[#14352c] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {selectedStudent.name ? selectedStudent.name[0] : "ط"}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900">{selectedStudent.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono">{selectedStudent.email}</p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800 inline-block mt-0.5">
                  ID: {selectedStudent.studentId || "N/A"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">المرحلة:</span>
                <span className="font-bold text-slate-900">{STAGE_LABELS[selectedStudent.stage] || `المرحلة ${selectedStudent.stage}`}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">نوع الدراسة:</span>
                <span className="font-bold text-slate-900">{selectedStudent.studyType === "MORNING" ? "صباحي" : "مسائي"}</span>
              </div>
            </div>

            {/* Attendance & Warning Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-[#14352c]" />
                  سجل الحضور والالتزام:
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    selectedStudent.warningLevel === "DEPRIVED"
                      ? "bg-rose-100 text-rose-800"
                      : selectedStudent.warningLevel === "WARNING"
                      ? "bg-amber-100 text-amber-800"
                      : selectedStudent.warningLevel === "ALERT"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {selectedStudent.warningLevel === "DEPRIVED"
                    ? "تجاوز حد الحرمان"
                    : selectedStudent.warningLevel === "WARNING"
                    ? "إنذار غياب نهائي"
                    : selectedStudent.warningLevel === "ALERT"
                    ? "إنذار أول"
                    : "حالة الدوام منتظمة"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">الجلسات</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedStudent.totalSessions || 0}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-emerald-700 block">حضور</span>
                  <span className="font-bold text-emerald-800 font-mono">{selectedStudent.presentCount || 0}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-rose-700 block">غيابات</span>
                  <span className="font-bold text-rose-800 font-mono">
                    {selectedStudent.absentCount || 0} من {selectedStudent.maxAbsences || 6}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/dashboard/doctor/grades?sectionId=${activeSectionId}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14352c] border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                <span>رصد سعي الطالب</span>
              </Link>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default function DoctorCoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
          <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
        </div>
      }
    >
      <DoctorCoursesContent />
    </Suspense>
  );
}
