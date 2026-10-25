"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import Navbar from '@/components/Navbar';
import {
  CalendarDays,
  Printer,
  Clock,
  MapPin,
  GraduationCap,
  RefreshCw,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  BookmarkCheck,
} from "lucide-react";

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
    const cachedSchedule =
      smartCache.get<any>("/academic/schedules") ||
      smartCache.get<any>("/student/schedule");
    const cachedDashboard =
      smartCache.get<any>("/dashboards/student") ||
      smartCache.get<any>("/dashboard/student");

    if (cachedSchedule?.data) {
      const parsed = Array.isArray(cachedSchedule.data)
        ? cachedSchedule.data
        : cachedSchedule.data?.data;
      if (Array.isArray(parsed) && parsed.length > 0) setSlots(parsed);
    }
    if (cachedDashboard?.data) {
      const dash = cachedDashboard.data?.data || cachedDashboard.data;
      if (dash && typeof dash === "object") setDashboardData(dash);
    }

    loadData();
  }, [router]);

  const extractList = (res: any): ScheduleSlot[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    return [];
  };

  const loadData = async () => {
    setFetching(true);
    try {
      // 1. Fetch student schedule (resilient fallback)
      let fetchedSlots: ScheduleSlot[] = [];
      try {
        const schedRes = await apiFetch("/academic/schedules");
        fetchedSlots = extractList(schedRes);
      } catch {
        // Fallback to student personal schedule endpoint
      }

      if (fetchedSlots.length === 0) {
        try {
          const studentSchedRes = await apiFetch("/student/schedule");
          fetchedSlots = extractList(studentSchedRes);
        } catch {
          // Both failed
        }
      }

      if (fetchedSlots.length > 0) {
        setSlots(fetchedSlots);
        smartCache.set("/academic/schedules", fetchedSlots);
      }

      // 2. Fetch student dashboard data for profile & stage
      try {
        const dashRes = await apiFetch("/dashboards/student");
        const dashData = dashRes?.data || dashRes;
        if (dashData && typeof dashData === "object") {
          setDashboardData(dashData);
          smartCache.set("/dashboards/student", dashData);
        }
      } catch {
        try {
          const dashRes2 = await apiFetch("/dashboard/student");
          const dashData2 = dashRes2?.data || dashRes2;
          if (dashData2 && typeof dashData2 === "object") {
            setDashboardData(dashData2);
            smartCache.set("/dashboard/student", dashData2);
          }
        } catch {
          // ignore
        }
      }
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

  // Map slots to Period 1 (8:30 - 10:10), Period 2 (10:20 - 12:00), Period 3 (12:10 - 1:50)
  const getSlotForPeriod = (dayKey: string, periodIdx: number): ScheduleSlot | undefined => {
    if (!Array.isArray(slots) || slots.length === 0) return undefined;
    return slots.find((s) => {
      if (s.dayOfWeek?.toUpperCase() !== dayKey.toUpperCase()) return false;
      const startMin = parseTimeToMinutes(s.startTime);

      if (periodIdx === 1) {
        // Starts before 10:15 (e.g. 08:30, 09:00)
        return startMin < 615;
      } else if (periodIdx === 2) {
        // Starts between 10:15 and 12:05 (e.g. 10:20, 10:30, 11:00)
        return startMin >= 615 && startMin < 725;
      } else if (periodIdx === 3) {
        // Starts at or after 12:05 (e.g. 12:10, 13:00)
        return startMin >= 725;
      }
      return false;
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

  if (loading && slots.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Header Navbar */}
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Toolbar */}
        <div className="print:hidden bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/dashboard/student" className="hover:text-[#14352c] transition">
                بوابة الطالب
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">جدول الدروس الأسبوعي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-[#14352c]" />
              جدول المحاضرات الأسبوعي المعتمد
            </h1>
            <p className="text-xs text-slate-600">
              الجدول الدراسي الصادر من رئاسة قسم {departmentName} • للعام الدراسي {currentAcademicYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("official")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "official"
                    ? "bg-[#14352c] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                المستند الرسمي
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "cards"
                    ? "bg-[#14352c] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
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
              className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="طباعة الجدول الرسمي"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              طباعة الجدول
            </button>

            {/* Student Personal Planner Button */}
            <Link
              href="/dashboard/student/planner"
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14352c] border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="الانتقال إلى المخطط وجدولك الذاتي"
            >
              <BookmarkCheck className="w-4 h-4 text-emerald-700" />
              جدولي الذاتي
            </Link>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              disabled={fetching}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin text-[#14352c]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Academic Status Strip */}
        <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#14352c]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">المرحلة والشعبة</p>
              <p className="text-xs font-bold text-slate-900">
                {currentStageText} • {slots[0]?.section?.sectionNumber || "الشعبة A1"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">المحاضرات الأسبوعية</p>
              <p className="text-xs font-bold text-slate-900">{slots.length} محاضرات مثبتة</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">نسبة الالتزام والدوام</p>
              <p className="text-xs font-bold text-emerald-800">
                {metrics?.overallAttendanceRate || "100%"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">نوع الدراسة</p>
              <p className="text-xs font-bold text-slate-900">
                {studentInfo?.studyType === "EVENING" ? "دراسة مسائية" : "دراسة صباحية"}
              </p>
            </div>
          </div>
        </div>

        {/* Empty State Notice */}
        {slots.length === 0 && !loading && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">تنبيه: </span>
              لم تنشر مقررية القسم الجدول بعد. ستظهر المحاضرات والقاعات فور اعتمادها.
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OFFICIAL UNIVERSITY TIMETABLE SHEET (MATCHING USER PHOTO)   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === "official" && (
          <div className="bg-white text-slate-900 rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden print:m-0 print:border-none print:shadow-none print:rounded-none">
            {/* Official Header */}
            <div className="border-b-2 border-slate-800 text-center py-4 px-6 bg-slate-50">
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
                    <th colSpan={2} className="py-2.5 px-3 border-l-2 border-slate-800 text-xs font-mono">
                      01:50 - 12:10
                    </th>
                    {/* Period 2 (Mid) */}
                    <th colSpan={2} className="py-2.5 px-3 border-l-2 border-slate-800 text-xs font-mono">
                      12:00 - 10:20
                    </th>
                    {/* Period 1 (Early) */}
                    <th colSpan={2} className="py-2.5 px-3 border-l-2 border-slate-800 text-xs font-mono">
                      10:10 - 08:30
                    </th>
                    {/* Day Column on Right */}
                    <th rowSpan={2} className="py-3 px-4 w-28 bg-slate-300 text-slate-900 font-bold text-sm">
                      اليوم
                    </th>
                  </tr>

                  {/* Row 2: Sub-hours (Hour 1 & Hour 2) */}
                  <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] text-slate-800">
                    <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium font-mono">
                      الساعة الثانية (1:00 - 1:50)
                    </th>
                    <th className="py-1.5 px-2 border-l-2 border-slate-800 font-medium font-mono">
                      الساعة الأولى (12:10 - 1:00)
                    </th>
                    <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium font-mono">
                      الساعة الثانية (11:10 - 12:00)
                    </th>
                    <th className="py-1.5 px-2 border-l-2 border-slate-800 font-medium font-mono">
                      الساعة الأولى (10:20 - 11:10)
                    </th>
                    <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium font-mono">
                      الساعة الثانية (9:20 - 10:10)
                    </th>
                    <th className="py-1.5 px-2 border-l-2 border-slate-800 font-medium font-mono">
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
                        <div className="p-2.5 h-full flex flex-col justify-between space-y-1.5 bg-emerald-50/20 hover:bg-emerald-50/40 transition">
                          {/* Course Name */}
                          <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                            {course?.name || "مقرر دراسي"}
                          </p>

                          {/* Dashed Separator */}
                          <div className="border-t border-dashed border-slate-300 w-full" />

                          {/* Footer Info: Doctor & Location */}
                          <div className="flex items-center justify-between text-[11px] text-slate-700 px-1 font-medium gap-2">
                            <span className="truncate" title={doctor?.name}>
                              {doctor?.name || "أستاذ المادة"}
                            </span>
                            <span className="font-semibold text-slate-900 bg-white border border-slate-300 px-1.5 py-0.5 rounded shrink-0">
                              {slot.room || "قاعة 401"}
                            </span>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <tr key={day.key} className="hover:bg-slate-50 transition">
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
                    ? "bg-[#14352c] text-white"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
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
                      ? "bg-[#14352c] text-white"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
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
                <div key={day.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      يوم {day.label}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      {daySlots.length} محاضرات
                    </span>
                  </div>

                  <div className="p-4 divide-y divide-slate-100">
                    {daySlots.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">
                        لا توجد محاضرات مجدولة لهذا اليوم.
                      </p>
                    ) : (
                      daySlots.map((slot) => {
                        const course = slot.section?.course;
                        const doctor = slot.section?.doctor;

                        return (
                          <div
                            key={slot._id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-3 rounded-xl transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {course?.name}
                                </span>
                                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                                  {course?.code || "CS"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-3">
                                <span>الأستاذ: {doctor?.name || "أستاذ المادة"}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {slot.room || "قاعة الخوارزمي"} ({slot.building || "العلوم"})
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                              <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold">
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
