"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import DoctorNav from "@/components/DoctorNav";
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
  ShieldCheck,
  RefreshCw,
  QrCode,
  Award,
  UploadCloud,
  FileText,
  Printer,
  ChevronLeft,
  Mail,
  UserCheck,
  Building,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

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

  // Active Tab: "courses" | "schedule" | "students"
  const [activeTab, setActiveTab] = useState<"courses" | "schedule" | "students">("courses");

  // Filter & Selection State
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Student Roster State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [studyTypeFilter, setStudyTypeFilter] = useState<string>("ALL");

  // Selected Student for Profile Modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Initialize from auth & search parameters
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    const paramTab = searchParams.get("tab");
    if (paramTab === "schedule" || paramTab === "students" || paramTab === "courses") {
      setActiveTab(paramTab);
    }

    const paramSection = searchParams.get("sectionId");
    if (paramSection) {
      setSelectedSectionId(paramSection);
    }
  }, [router, searchParams]);

  // Load Sections & Schedule
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // Try Cache First
        const cachedSections = smartCache.get<any[]>("/doctor/sections");
        if (cachedSections?.data && isMounted) {
          setSections(cachedSections.data);
          if (!selectedSectionId && cachedSections.data.length > 0) {
            setSelectedSectionId(cachedSections.data[0]._id);
          }
          setLoading(false);
        }

        const cachedSlots = smartCache.get<any[]>("/doctor/schedule");
        if (cachedSlots?.data && isMounted) {
          setScheduleSlots(cachedSlots.data);
        }

        // Fresh Fetch
        const [sectionsRes, scheduleRes] = await Promise.all([
          apiFetch("/doctor/sections"),
          apiFetch("/doctor/schedule").catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          const fetchedSections = sectionsRes.data || [];
          setSections(fetchedSections);
          setScheduleSlots(scheduleRes.data || []);

          if (!selectedSectionId && fetchedSections.length > 0) {
            setSelectedSectionId(fetchedSections[0]._id);
          }
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

  // Load Student Roster when section changes
  useEffect(() => {
    if (!selectedSectionId) return;

    let isMounted = true;
    setStudentsLoading(true);

    const cacheKey = `/doctor/sections/${selectedSectionId}/students`;
    const cachedRoster = smartCache.get<any>(cacheKey);
    if (cachedRoster?.data && isMounted) {
      setStudentsList(cachedRoster.data.data || []);
      setStudentsLoading(false);
    }

    apiFetch(`/doctor/sections/${selectedSectionId}/students`)
      .then((res) => {
        if (isMounted) {
          setStudentsList(res.data || []);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch student roster:", err);
      })
      .finally(() => {
        if (isMounted) setStudentsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSectionId]);

  // Section options for CustomSelect
  const sectionOptions: SelectOption[] = useMemo(() => {
    return sections.map((sec) => ({
      value: sec._id,
      label: `${sec.course?.name || "المقرر"} (شعبة ${sec.sectionNumber || "1"})`,
      subLabel: `المرحلة ${sec.course?.stage || 1} • ${sec.enrolledCount || 0} طالب`,
    }));
  }, [sections]);

  // Filtered Sections by Stage
  const filteredSections = useMemo(() => {
    if (selectedStage === "ALL") return sections;
    return sections.filter((s) => String(s.course?.stage) === selectedStage);
  }, [sections, selectedStage]);

  // Selected section object
  const activeSectionObj = useMemo(() => {
    return sections.find((s) => s._id === selectedSectionId) || sections[0] || null;
  }, [sections, selectedSectionId]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return studentsList.filter((st) => {
      const matchQuery =
        !searchQuery.trim() ||
        (st.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.studentId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.email || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchStudyType =
        studyTypeFilter === "ALL" || st.studyType === studyTypeFilter;

      return matchQuery && matchStudyType;
    });
  }, [studentsList, searchQuery, studyTypeFilter]);

  // Schedule Slots grouped by Day
  const slotsByDay = useMemo(() => {
    const map: Record<string, any[]> = {
      SUNDAY: [],
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
    };

    scheduleSlots.forEach((slot) => {
      const day = (slot.dayOfWeek || "").toUpperCase();
      if (map[day]) {
        map[day].push(slot);
      }
    });

    return map;
  }, [scheduleSlots]);

  // Unique stages doctor teaches
  const stagesList = useMemo(() => {
    const set = new Set<number>();
    sections.forEach((s) => {
      if (s.course?.stage) set.add(s.course.stage);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [sections]);

  // Total Students Taught
  const totalStudentsCount = useMemo(() => {
    return sections.reduce((acc, curr) => acc + (curr.enrolledCount || 0), 0);
  }, [sections]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col" dir="rtl">
      <DoctorNav user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة التدريسي
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">المقررات والجداول والطلبة</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-[#14352c]" />
              المقررات والمراحل الأكاديمية المسندة
            </h1>
            <p className="text-sm text-slate-600">
              استعراض المناهج المكلفة من عمادة الكلية، الجداول الأسبوعية، وقوائم الطلبة وتفاصيلهم
            </p>
          </div>

          {/* Quick Stats Header Cards */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block font-medium">المقررات المكلفة</span>
              <span className={`text-base font-bold text-slate-900 ${mono.className}`}>
                {sections.length} شُعب
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[11px] text-emerald-700 block font-medium">إجمالي الطلبة</span>
              <span className={`text-base font-bold text-emerald-900 ${mono.className}`}>
                {totalStudentsCount} طالب
              </span>
            </div>
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="طباعة السجل الأكاديمي"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "courses"
                ? "bg-[#14352c] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            المقررات والمراحل ({sections.length})
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "schedule"
                ? "bg-[#14352c] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            الجدول الأسبوعي للمحاضرات ({scheduleSlots.length})
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "students"
                ? "bg-[#14352c] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            قوائم الطلبة وتفاصيلهم
          </button>
        </div>

        {/* TAB 1: Assigned Courses & Stages */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            {/* Stage Filter Badges */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 ml-2">
                  <Filter className="w-3.5 h-3.5 text-[#14352c]" />
                  تصفية حسب المرحلة:
                </span>
                <button
                  onClick={() => setSelectedStage("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedStage === "ALL"
                      ? "bg-[#14352c] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  جميع المراحل ({sections.length})
                </button>
                {stagesList.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStage(String(st))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedStage === String(st)
                        ? "bg-[#14352c] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {STAGE_LABELS[st] || `المرحلة ${st}`}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                عرض {filteredSections.length} من أصل {sections.length} شعبة
              </div>
            </div>

            {/* Courses Grid */}
            {filteredSections.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">لا توجد مواد مسندة في هذه المرحلة</h3>
                <p className="text-xs text-slate-500">اختر مرحلة أخرى أو راجع عمادة الكلية.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSections.map((sec) => {
                  const enrolled = sec.enrolledCount || 0;
                  const capacity = sec.capacity || 60;
                  const pct = Math.min(Math.round((enrolled / capacity) * 100), 100);
                  const stageNum = sec.course?.stage || 1;

                  return (
                    <div
                      key={sec._id}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-5 shadow-sm transition"
                    >
                      <div className="space-y-4">
                        {/* Badges Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#14352c] font-bold text-xs">
                            {STAGE_LABELS[stageNum] || `المرحلة ${stageNum}`}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs font-mono">
                            شعبة {sec.sectionNumber || "1"}
                          </span>
                        </div>

                        {/* Course Name & Details */}
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 leading-snug">
                            {sec.course?.name || "المقرر الدراسي"}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>كود المادة:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {sec.course?.code || "CPE"}
                            </span>
                            <span>•</span>
                            <span>{sec.course?.credits || 3} وحدات</span>
                          </p>
                        </div>

                        {/* Section Metadata Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[11px] text-slate-500 block">الفصل الدراسي:</span>
                            <span className="font-semibold text-slate-800">
                              {sec.semester === "FIRST" ? "الفصل الأول" : "الفصل الثاني"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">السنة الأكاديمية:</span>
                            <span className="font-semibold text-slate-800 font-mono">
                              {sec.academicYear || "2025-2026"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">حد الغياب المسموح:</span>
                            <span className="font-semibold text-rose-700 font-mono">
                              {sec.maxAbsenceHours || 6} ساعات
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">المقاعد الشاغرة:</span>
                            <span className="font-semibold text-emerald-700 font-mono">
                              {sec.availableSeats ?? Math.max(0, capacity - enrolled)} مقعد
                            </span>
                          </div>
                        </div>

                        {/* Capacity Progress */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>الطلبة المقبولين بالشعبة</span>
                            <span className={`font-bold ${mono.className}`}>
                              {enrolled} / {capacity}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#14352c] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Schedule Timing Slot Preview */}
                        {sec.schedule && sec.schedule.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[11px] font-bold text-slate-500 block">
                              مواعيد المحاضرات والقاعة:
                            </span>
                            {sec.schedule.map((sch: any, idx: number) => (
                              <div
                                key={idx}
                                className="text-xs bg-emerald-50/50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-slate-700 flex items-center justify-between"
                              >
                                <span className="font-semibold text-[#14352c]">
                                  {DAY_LABELS[sch.dayOfWeek] || sch.dayOfWeek}
                                </span>
                                <span className="font-mono text-[11px] text-slate-600">
                                  {sch.startTime} - {sch.endTime}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                                  {sch.room || "قاعة المحاضرات"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <button
                          onClick={() => {
                            setSelectedSectionId(sec._id);
                            setActiveTab("students");
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs"
                        >
                          <Users className="w-3.5 h-3.5" />
                          عرض قائمة وتفاصيل الطلبة ({enrolled})
                        </button>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <Link
                            href="/dashboard/doctor/attendance"
                            className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition flex items-center justify-center gap-1"
                          >
                            <QrCode className="w-3 h-3 text-slate-500" />
                            الحضور
                          </Link>
                          <Link
                            href="/dashboard/doctor/grades"
                            className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition flex items-center justify-center gap-1"
                          >
                            <Award className="w-3 h-3 text-slate-500" />
                            السعي
                          </Link>
                          <Link
                            href="/dashboard/doctor/materials"
                            className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition flex items-center justify-center gap-1"
                          >
                            <UploadCloud className="w-3 h-3 text-slate-500" />
                            الملازم
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Weekly Schedule Timetable */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#14352c]" />
                  الجدول التدريسي الأسبوعي المعتمد
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  توزيع أوقات المحاضرات الأسبوعية والقاعات والمباني المخصصة من عمادة الكلية
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
                  إجمالي المحاضرات: {scheduleSlots.length} أسبوعيًا
                </span>
              </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"] as const).map(
                (dayKey) => {
                  const daySlots = slotsByDay[dayKey] || [];
                  const isToday =
                    new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase() ===
                    dayKey;

                  return (
                    <div
                      key={dayKey}
                      className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
                        isToday ? "border-[#14352c] ring-1 ring-[#14352c]/20" : "border-slate-200"
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {DAY_LABELS[dayKey]}
                          </h4>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              اليوم
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          {daySlots.length} محاضرات
                        </span>
                      </div>

                      {/* Day Slots List */}
                      <div className="space-y-3 flex-1">
                        {daySlots.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            لا توجد محاضرات مجدولة لهذا اليوم
                          </div>
                        ) : (
                          daySlots.map((slot: any) => (
                            <div
                              key={slot._id}
                              className="bg-slate-50 hover:bg-slate-100/80 transition p-3.5 rounded-xl border border-slate-200 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="text-xs font-bold text-slate-900 leading-snug">
                                  {slot.section?.course?.name || "المقرر"}
                                </h5>
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold shrink-0">
                                  شعبة {slot.section?.sectionNumber || "1"}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                                <div className="flex items-center gap-1 font-mono text-[#14352c] font-semibold">
                                  <Clock className="w-3.5 h-3.5 text-[#14352c]" />
                                  <span>
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{slot.room || "قاعة دراسية"}</span>
                                </div>
                              </div>

                              {slot.building && (
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  <span>{slot.building}</span>
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Student Rosters & Details */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Filter & Controls Bar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-full md:w-80">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اختر الشعبة الدراسية:
                  </label>
                  <CustomSelect
                    options={sectionOptions}
                    value={selectedSectionId}
                    onChange={(val) => {
                      setSelectedSectionId(val);
                      smartCache.setWorkspace("doctor_selected_section", val);
                    }}
                    className="w-full"
                    theme="light"
                  />
                </div>

                {/* Quick Roster Stats */}
                <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0">
                  <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block">المسجلين بالشعبة</span>
                    <span className={`text-sm font-bold text-slate-900 ${mono.className}`}>
                      {studentsList.length} طالب
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-700 block">دراسة صباحية</span>
                    <span className={`text-sm font-bold text-emerald-900 ${mono.className}`}>
                      {studentsList.filter((s) => s.studyType === "MORNING").length}
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-700 block">دراسة مسائية</span>
                    <span className={`text-sm font-bold text-amber-900 ${mono.className}`}>
                      {studentsList.filter((s) => s.studyType === "EVENING").length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search & Study Type Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن اسم الطالب، الرقم الجامعي، أو البريد الإلكتروني..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setStudyTypeFilter("ALL")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
                      studyTypeFilter === "ALL"
                        ? "bg-[#14352c] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    الكل ({studentsList.length})
                  </button>
                  <button
                    onClick={() => setStudyTypeFilter("MORNING")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
                      studyTypeFilter === "MORNING"
                        ? "bg-[#14352c] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    صباحي
                  </button>
                  <button
                    onClick={() => setStudyTypeFilter("EVENING")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
                      studyTypeFilter === "EVENING"
                        ? "bg-[#14352c] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    مسائي
                  </button>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {studentsLoading ? (
                <div className="py-20 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
                  <p className="text-xs text-slate-500 font-medium">جارٍ جلب قائمة وتفاصيل الطلبة...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">لا يوجد طلاب مطابقين للبحث</h4>
                  <p className="text-xs text-slate-500">تأكد من نص البحث أو حدد شعبة أخرى.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3.5 px-4">#</th>
                        <th className="py-3.5 px-4">الطالب والبريد الرسمي</th>
                        <th className="py-3.5 px-4">الرقم الجامعي (ID)</th>
                        <th className="py-3.5 px-4">المرحلة الدراسية</th>
                        <th className="py-3.5 px-4">نوع الدراسة</th>
                        <th className="py-3.5 px-4">سنة القبول</th>
                        <th className="py-3.5 px-4">الحالة</th>
                        <th className="py-3.5 px-4 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((st, idx) => (
                        <tr
                          key={st._id}
                          className="hover:bg-slate-50/80 transition cursor-pointer"
                          onClick={() => setSelectedStudent(st)}
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-[#14352c]/10 text-[#14352c] font-bold flex items-center justify-center shrink-0">
                                {st.name ? st.name[0] : "ط"}
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900">{st.name || "طالب"}</h5>
                                <span className="text-[11px] text-slate-500 font-mono block">
                                  {st.email || "student@uomustansiriyah.edu.iq"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {st.studentId || "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {STAGE_LABELS[st.stage] || `المرحلة ${st.stage || 1}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                st.studyType === "MORNING"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {st.studyType === "MORNING" ? "دراسة صباحية" : "دراسة مسائية"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {st.admissionYear || "2023"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              منتظم
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(st);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#14352c] hover:text-white text-slate-700 font-bold transition flex items-center gap-1 mx-auto text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              تفاصيل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Student Details Dialog */}
      <Dialog
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={`الملف الأكاديمي: ${selectedStudent?.name || "الطالب"}`}
        maxWidth="max-w-lg"
      >
        {selectedStudent && (
          <div className="space-y-5">
            {/* Student Header Card */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="size-14 rounded-2xl bg-[#14352c] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {selectedStudent.name ? selectedStudent.name[0] : "ط"}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">{selectedStudent.name}</h4>
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{selectedStudent.email}</span>
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    طالب رسمي مقيد
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    ID: {selectedStudent.studentId}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block">المرحلة الدراسية:</span>
                <span className="font-bold text-slate-900">
                  {STAGE_LABELS[selectedStudent.stage] || `المرحلة ${selectedStudent.stage}`}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block">نوع الدراسة:</span>
                <span className="font-bold text-slate-900">
                  {selectedStudent.studyType === "MORNING" ? "دراسة صباحية" : "دراسة مسائية"}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block">سنة القبول:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedStudent.admissionYear || "2023"}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block">الشعبة المسجلة:</span>
                <span className="font-bold text-slate-900">
                  {activeSectionObj ? `شعبة ${activeSectionObj.sectionNumber}` : "الشعبة 1"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-xs"
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
