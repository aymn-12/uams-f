"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import StudentNav from "@/components/StudentNav";
import {
  CalendarDays,
  Printer,
  Clock,
  MapPin,
  Building,
  GraduationCap,
  RefreshCw,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const mono = { className: "font-mono" };

interface ScheduleSlot {
  _id: string;
  dayOfWeek: string;
  startTime: string;
  endTime?: string;
  room?: string;
  building?: string;
  slotType?: string;
  section?: {
    _id: string;
    sectionNumber: string;
    semester?: string;
    academicYear?: string;
    course?: {
      _id: string;
      name: string;
      code: string;
      stage: number;
      credits: number;
    };
    doctor?: {
      _id: string;
      name: string;
      email: string;
    };
  };
}

interface StudentDashboardData {
  studentInfo?: {
    name?: string;
    email?: string;
    studentId?: string;
    stage?: number;
    studyType?: string;
    college?: string;
    department?: string;
  };
  metrics?: {
    overallAttendanceRate?: string | number;
    totalAttendanceSessions?: number;
    attendedSessions?: number;
    enrolledCoursesCount?: number;
  };
}

const WEEKDAYS = [
  { key: "SUNDAY", label: "الأحد" },
  { key: "MONDAY", label: "الاثنين" },
  { key: "TUESDAY", label: "الثلاثاء" },
  { key: "WEDNESDAY", label: "الأربعاء" },
  { key: "THURSDAY", label: "الخميس" },
];

const STANDARD_PERIODS = [
  {
    periodIndex: 1,
    title: "الفترة الأولى",
    sub1: "الساعة الأولى (8:30 - 9:20)",
    sub2: "الساعة الثانية (9:20 - 10:10)",
    timeRange: "08:30 - 10:10",
    startHour: 8,
    startMin: 30,
    endHour: 10,
    endMin: 10,
  },
  {
    periodIndex: 2,
    title: "الفترة الثانية",
    sub1: "الساعة الأولى (10:20 - 11:10)",
    sub2: "الساعة الثانية (11:10 - 12:00)",
    timeRange: "10:20 - 12:00",
    startHour: 10,
    startMin: 20,
    endHour: 12,
    endMin: 0,
  },
  {
    periodIndex: 3,
    title: "الفترة الثالثة",
    sub1: "الساعة الأولى (12:10 - 1:00)",
    sub2: "الساعة الثانية (1:00 - 1:50)",
    timeRange: "12:10 - 01:50",
    startHour: 12,
    startMin: 10,
    endHour: 13,
    endMin: 50,
  },
  {
    periodIndex: 4,
    title: "الفترة الرابعة",
    sub1: "الساعة الأولى (2:00 - 2:50)",
    sub2: "الساعة الثانية (2:50 - 3:40)",
    timeRange: "02:00 - 03:40",
    startHour: 14,
    startMin: 0,
    endHour: 15,
    endMin: 40,
  },
];

export default function StudentSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [viewMode, setViewMode] = useState<"official" | "cards">("official");
  const [selectedDay, setSelectedDay] = useState<string>("ALL");

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "STUDENT") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Load from cache first
    const cachedSchedule = smartCache.get<ScheduleSlot[]>("/academic/schedule");
    const cachedDashboard = smartCache.get<StudentDashboardData>("/dashboard/student");
    if (cachedSchedule?.data) setSlots(cachedSchedule.data);
    if (cachedDashboard?.data) setDashboardData(cachedDashboard.data);

    loadData();
  }, [router]);

  const loadData = async () => {
    setFetching(true);
    try {
      const [schedRes, dashRes] = await Promise.all([
        apiFetch("/academic/schedule"),
        apiFetch("/dashboard/student"),
      ]);

      if (schedRes?.data) {
        setSlots(schedRes.data);
        smartCache.set("/academic/schedule", schedRes.data);
      }
      if (dashRes?.data) {
        setDashboardData(dashRes.data);
        smartCache.set("/dashboard/student", dashRes.data);
      }
    } catch {
      // Keep cached if available
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Convert time "08:30" to minutes from midnight
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  // Find slot for day and period index
  const getSlotForPeriod = (dayKey: string, periodIdx: number): ScheduleSlot | undefined => {
    const period = STANDARD_PERIODS[periodIdx - 1];
    const periodStartMin = period.startHour * 60 + period.startMin;
    const periodEndMin = period.endHour * 60 + period.endMin;

    return slots.find((s) => {
      if (s.dayOfWeek !== dayKey) return false;
      const slotStart = parseTimeToMinutes(s.startTime);
      // Fits within period window or starts nearby (+/- 30 min)
      return Math.abs(slotStart - periodStartMin) <= 45;
    });
  };

  const studentInfo = dashboardData?.studentInfo;
  const metrics = dashboardData?.metrics;

  const currentAcademicYear = slots[0]?.section?.academicYear || "2025-2026";
  const currentSemesterText =
    slots[0]?.section?.semester === "SECOND" ? "الكورس الثاني" : "الكورس الأول";
  const currentStageText = studentInfo?.stage
    ? `المرحلة ${studentInfo.stage}`
    : "المرحلة الرابعة";
  const departmentName = studentInfo?.department || "علوم الحاسوب";
  const collegeName = studentInfo?.college || "كلية العلوم";

  const filteredSlots = useMemo(() => {
    if (selectedDay === "ALL") return slots;
    return slots.filter((s) => s.dayOfWeek === selectedDay);
  }, [slots, selectedDay]);

  if (loading && slots.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Header Navbar */}
      <div className="print:hidden">
        <StudentNav user={user} />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Toolbar */}
        <div className="print:hidden bg-slate-900/80 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/dashboard/student" className="hover:text-emerald-400 transition">
                بوابة الطالب
              </Link>
              <span>/</span>
              <span className="text-emerald-400 font-semibold">جدول الدروس الأسبوعي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
              جدول المحاضرات الأسبوعي المعتمد
            </h1>
            <p className="text-xs text-slate-400">
              الجدول الرسمي الصادر من رئاسة قسم {departmentName} للعام الدراسي {currentAcademicYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="p-1 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("official")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "official"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                المستند الرسمي (النمط الجامعي)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "cards"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                بطاقات الأيام
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-emerald-500/20"
              title="طباعة الجدول الرسمي"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              طباعة الجدول
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              disabled={fetching}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Attendance Summary Strip */}
        <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">المرحلة والشعبة</p>
              <p className="text-xs font-bold text-white">
                {currentStageText} • {slots[0]?.section?.sectionNumber || "الشعبة الأولى"}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">عدد المحاضرات الأسبوعية</p>
              <p className="text-xs font-bold text-white">{slots.length} حصة تدريسية</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">نسبة الالتزام والدوام</p>
              <p className="text-xs font-bold text-emerald-400">
                {metrics?.overallAttendanceRate || "100%"}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">نوع الدراسة</p>
              <p className="text-xs font-bold text-white">
                {studentInfo?.studyType === "EVENING" ? "دراسة مسائية" : "دراسة صباحية"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OFFICIAL UNIVERSITY TIMETABLE SHEET (MATCHING USER PHOTO)   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === "official" && (
          <div className="bg-white text-slate-900 rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden print:m-0 print:border-none print:shadow-none print:rounded-none">
            {/* Official Header */}
            <div className="border-b-2 border-slate-800 text-center py-4 px-6 bg-slate-50/70">
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-700 font-mono" dir="ltr">
                Ministry of Higher Education and Scientific Research
              </p>
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-700 font-mono mb-2" dir="ltr">
                Mustansiriyah University / College of Science / Department of Computer Science
              </p>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                ( جدول الدروس الأسبوعي للعام الدراسي {currentAcademicYear} {currentSemesterText} )
              </h2>
              <div className="flex items-center justify-center gap-4 text-xs sm:text-sm font-bold text-slate-800 border-t border-slate-200 pt-2 mt-1">
                <span>{currentStageText} / {currentSemesterText}</span>
                <span>•</span>
                <span>قسم {departmentName}</span>
                <span>•</span>
                <span>{studentInfo?.studyType === "EVENING" ? "الدراسة المسائية" : "الدراسة الصباحية"}</span>
              </div>
            </div>

            {/* Timetable Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border-2 border-slate-800 text-xs font-medium">
                {/* Table Header: Period Columns */}
                <thead>
                  {/* Row 1: Periods Super-headers */}
                  <tr className="bg-slate-200 border-b-2 border-slate-800 text-slate-900 font-bold">
                    {/* Period 3 (Late) */}
                    <th colSpan={2} className="py-2 px-3 border-l-2 border-slate-800 text-xs">
                      12:10 - 01:50
                    </th>
                    {/* Period 2 (Mid) */}
                    <th colSpan={2} className="py-2 px-3 border-l-2 border-slate-800 text-xs">
                      10:20 - 12:00
                    </th>
                    {/* Period 1 (Early) */}
                    <th colSpan={2} className="py-2 px-3 border-l-2 border-slate-800 text-xs">
                      08:30 - 10:10
                    </th>
                    {/* Day Column on Right */}
                    <th rowSpan={2} className="py-3 px-4 w-28 bg-slate-300 text-slate-900 font-bold text-sm">
                      اليوم
                    </th>
                  </tr>

                  {/* Row 2: Sub-hours (Hour 1 & Hour 2) */}
                  <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] text-slate-800">
                    <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium">
                      الساعة الثانية (1:00 - 1:50)
                    </th>
                    <th className="py-1.5 px-2 border-l-2 border-slate-800 font-medium">
                      الساعة الأولى (12:10 - 1:00)
                    </th>
                    <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium">
                      الساعة الثانية (11:10 - 12:00)
                    </th>
                    <th className="py-1.5 px-2 border-l-2 border-slate-800 font-medium">
                      الساعة الأولى (10:20 - 11:10)
                    </th>
                    <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium">
                      الساعة الثانية (9:20 - 10:10)
                    </th>
                    <th className="py-1.5 px-2 border-l-2 border-slate-800 font-medium">
                      الساعة الأولى (8:30 - 9:20)
                    </th>
                  </tr>
                </thead>

                {/* Table Body: 5 Weekdays */}
                <tbody className="divide-y-2 divide-slate-800">
                  {WEEKDAYS.map((day) => {
                    const slotP1 = getSlotForPeriod(day.key, 1);
                    const slotP2 = getSlotForPeriod(day.key, 2);
                    const slotP3 = getSlotForPeriod(day.key, 3);

                    const renderCell = (slot?: ScheduleSlot) => {
                      if (!slot) {
                        return (
                          <div className="py-7 px-2 text-slate-400 font-mono text-[11px]">
                            —
                          </div>
                        );
                      }

                      const course = slot.section?.course;
                      const doctor = slot.section?.doctor;

                      return (
                        <div className="p-2.5 h-full flex flex-col justify-between space-y-1.5">
                          {/* Course Name */}
                          <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                            {course?.name || "مقرر دراسي"}
                          </p>

                          {/* Dashed Separator */}
                          <div className="border-t border-dashed border-slate-300 w-full" />

                          {/* Footer Info: Doctor & Location */}
                          <div className="flex items-center justify-between text-[11px] text-slate-700 px-1 font-medium">
                            <span className="truncate" title={doctor?.name}>
                              {doctor?.name || "مقرر القسم"}
                            </span>
                            <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded">
                              {slot.room || "قاعة 401"}
                            </span>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <tr key={day.key} className="hover:bg-slate-50/80 transition">
                        {/* Period 3 (Colspan 2) */}
                        <td colSpan={2} className="border-l-2 border-slate-800 p-0 align-middle">
                          {renderCell(slotP3)}
                        </td>

                        {/* Period 2 (Colspan 2) */}
                        <td colSpan={2} className="border-l-2 border-slate-800 p-0 align-middle">
                          {renderCell(slotP2)}
                        </td>

                        {/* Period 1 (Colspan 2) */}
                        <td colSpan={2} className="border-l-2 border-slate-800 p-0 align-middle">
                          {renderCell(slotP1)}
                        </td>

                        {/* Day Label on Right */}
                        <td className="bg-slate-100 font-bold text-slate-900 text-sm py-4 px-3 border-r-2 border-slate-800 whitespace-nowrap">
                          {day.label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Footer Notes */}
            <div className="p-4 bg-slate-50 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">ملاحظة:</span>
                <span>مدة المحاضرة الواحدة 50 دقيقة، والمحاضرات المختبرية ساعتان متتاليتان.</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px] text-slate-500">
                <span>تاريخ الاعتماد: 2026/10/01</span>
                <span>ختم مقررية القسم الأكاديمية</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RESPONSIVE DAILY CARDS VIEW (FOR MOBILE OR TIMELINE VIEW)   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === "cards" && (
          <div className="space-y-4">
            {/* Filter by Day */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedDay("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedDay === "ALL"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                كافة أيام الأسبوع
              </button>
              {WEEKDAYS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDay(d.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedDay === d.key
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Day Groups */}
            {WEEKDAYS.filter((d) => selectedDay === "ALL" || selectedDay === d.key).map((day) => {
              const daySlots = slots.filter((s) => s.dayOfWeek === day.key);

              return (
                <div key={day.key} className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      يوم {day.label}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {daySlots.length} محاضرات
                    </span>
                  </div>

                  <div className="p-4 divide-y divide-slate-800/60">
                    {daySlots.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500">
                        لا توجد محاضرات مجدولة لهذا اليوم.
                      </p>
                    ) : (
                      daySlots.map((slot) => {
                        const course = slot.section?.course;
                        const doctor = slot.section?.doctor;

                        return (
                          <div
                            key={slot._id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 px-3 rounded-xl transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">
                                  {course?.name}
                                </span>
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                                  {course?.code || "CS"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 flex items-center gap-3">
                                <span>الأستاذ: {doctor?.name || "مقرر القسم"}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                  {slot.room || "قاعة الخوارزمي"} ({slot.building || "العلوم"})
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                              <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                                {slot.startTime} - {slot.endTime || "نهاية المحاضرة"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
