"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LatticeLoader from "@/components/ui/lattice-loader";
import {
  CalendarDays,
  Printer,
  RefreshCw,
  LayoutGrid,
  ListFilter,
  Clock,
  MapPin,
  Coffee,
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
  };
}

interface PeriodConfig {
  periodNumber: number;
  headerTime: string;
  startTime: string;
  endTime: string;
  isPaused?: boolean;
  pauseReason?: string;
  subHours: { label: string }[];
}

const ALL_WEEKDAYS = [
  { key: "SATURDAY", label: "السبت" },
  { key: "SUNDAY", label: "الأحد" },
  { key: "MONDAY", label: "الاثنين" },
  { key: "TUESDAY", label: "الثلاثاء" },
  { key: "WEDNESDAY", label: "الأربعاء" },
  { key: "THURSDAY", label: "الخميس" },
];

const DEFAULT_PERIODS: PeriodConfig[] = [
  {
    periodNumber: 1,
    headerTime: "08:30 - 10:10",
    startTime: "08:30",
    endTime: "10:10",
    isPaused: false,
    pauseReason: "",
    subHours: [
      { label: "الساعة الأولى (8:30 - 9:20)" },
      { label: "الساعة الثانية (9:20 - 10:10)" },
    ],
  },
  {
    periodNumber: 2,
    headerTime: "10:20 - 12:00",
    startTime: "10:20",
    endTime: "12:00",
    isPaused: false,
    pauseReason: "",
    subHours: [
      { label: "الساعة الأولى (10:20 - 11:10)" },
      { label: "الساعة الثانية (11:10 - 12:00)" },
    ],
  },
  {
    periodNumber: 3,
    headerTime: "12:10 - 01:50",
    startTime: "12:10",
    endTime: "01:50",
    isPaused: false,
    pauseReason: "",
    subHours: [
      { label: "الساعة الأولى (12:10 - 1:00)" },
      { label: "الساعة الثانية (1:00 - 1:50)" },
    ],
  },
];

export default function DoctorSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [periods, setPeriods] = useState<PeriodConfig[]>(DEFAULT_PERIODS);
  const [activeDayKeys, setActiveDayKeys] = useState<string[]>([
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
  ]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [viewMode, setViewMode] = useState<"official" | "cards">("official");

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "DOCTOR") {
      router.push("/");
      return;
    }
    setUser(stored);
    loadData();
  }, [router]);

  const loadData = async () => {
    setFetching(true);
    try {
      const [scheduleRes, configRes] = await Promise.all([
        apiFetch("/doctor/schedule").catch(() => ({ data: [] })),
        apiFetch("/academic/timetable-config").catch(() => null),
      ]);

      const fetchedSlots = scheduleRes.data || [];
      setSlots(fetchedSlots);

      if (configRes?.data) {
        if (Array.isArray(configRes.data.periods) && configRes.data.periods.length > 0) {
          setPeriods(configRes.data.periods);
        }
        if (Array.isArray(configRes.data.activeDayKeys) && configRes.data.activeDayKeys.length > 0) {
          setActiveDayKeys(configRes.data.activeDayKeys);
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

  const activeDaysList = useMemo(() => {
    return ALL_WEEKDAYS.filter((d) => activeDayKeys.includes(d.key));
  }, [activeDayKeys]);

  const getSlotAt = (dayKey: string, period: PeriodConfig): ScheduleSlot | undefined => {
    if (!Array.isArray(slots) || slots.length === 0) return undefined;
    return slots.find((slot) => {
      if (slot.dayOfWeek?.toUpperCase() !== dayKey.toUpperCase()) return false;
      const slotStart = slot.startTime || "";
      const pStart = period.startTime || "";
      if (slotStart === pStart) return true;

      const [sh, sm] = slotStart.split(":").map(Number);
      const [ph, pm] = pStart.split(":").map(Number);
      if (isNaN(sh) || isNaN(ph)) return false;
      return Math.abs(sh * 60 + sm - (ph * 60 + pm)) < 40;
    });
  };

  if (loading && slots.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900" dir="rtl">
        <LatticeLoader
          status="working"
          label="تحميل الجدول الدراسي..."
          pattern="orbit"
          grid={3}
          cellSize={5}
          gap={2}
          fontSize={14}
          showTimer={false}
          color="#14352c"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">
        {/* Header Breadcrumb */}
        <div className="print:hidden bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة الأستاذ
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">الجدول التدريسي الأسبوعي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-[#14352c]" />
              الجدول التدريسي المعتمد (د. {user?.name || "الأستاذ"})
            </h1>
            <p className="text-xs text-slate-600">
              مواعيد المحاضرات والقاعات والمباني المخصصة لك من عمادة الكلية للفصل الدراسي الحالي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              طباعة الجدول
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={fetching}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin text-[#14352c]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Official Mustansiriyah Sheet View */}
        {viewMode === "official" && (
          <div className="bg-white text-slate-900 rounded-2xl border-2 border-slate-800 shadow-md overflow-hidden print:m-0 print:border-none print:shadow-none">
            <div className="text-center pt-6 pb-4 px-6 border-b-2 border-slate-800 bg-slate-50/50">
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 font-mono uppercase" dir="ltr">
                Ministry of Higher Education and Scientific Research
              </p>
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 font-mono uppercase mt-0.5" dir="ltr">
                Mustansiriyah University / College of Science / Department of Computer Science
              </p>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 mt-3">
                ( جدول المحاضرات الأسبوعي للأستاذ: د. {user?.name} )
              </h2>
              <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-bold text-slate-800 mt-2">
                <span>إجمالي المحاضرات: {slots.length} أسبوعياً</span>
                <span>•</span>
                <span>العام الدراسي 2025-2026</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-800 text-slate-900 font-bold text-xs sm:text-sm">
                    <th rowSpan={2} className="w-28 py-3 px-3 bg-slate-200 border-l-2 border-slate-800 align-middle text-sm font-bold">
                      اليوم
                    </th>
                    {periods.map((period, idx) => {
                      const isPaused = !!period.isPaused;
                      return (
                        <th
                          key={period.periodNumber}
                          colSpan={2}
                          className={`py-2.5 px-3 text-xs font-mono ${
                            isPaused ? "bg-amber-100/90 text-amber-950" : "bg-slate-200"
                          } ${idx < periods.length - 1 ? "border-l-2 border-slate-800" : ""}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>{period.headerTime}</span>
                            {isPaused && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-bold border border-amber-300">
                                استراحة / توقيف
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>

                  <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] text-slate-800 font-mono">
                    {periods.map((period, idx) => (
                      <Fragment key={period.periodNumber}>
                        <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium">
                          {period.subHours[0]?.label || `الساعة الأولى (${period.startTime})`}
                        </th>
                        <th className={`py-1.5 px-2 font-medium ${idx < periods.length - 1 ? "border-l-2 border-slate-800" : ""}`}>
                          {period.subHours[1]?.label || `الساعة الثانية (${period.endTime})`}
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-slate-800">
                  {activeDaysList.map((day) => {
                    return (
                      <tr key={day.key} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-3 bg-slate-100 font-bold text-slate-900 border-l-2 border-slate-800 align-middle">
                          <span>{day.label}</span>
                        </td>

                        {periods.map((period, idx) => {
                          const slot = getSlotAt(day.key, period);
                          const isPaused = !!period.isPaused;

                          return (
                            <td
                              key={period.periodNumber}
                              colSpan={2}
                              className={`p-0 align-middle min-h-[90px] h-[95px] ${
                                idx < periods.length - 1 ? "border-l-2 border-slate-800" : ""
                              } ${isPaused ? "bg-amber-50/50" : ""}`}
                            >
                              {isPaused ? (
                                <div className="h-full flex flex-col items-center justify-center p-2 text-center bg-amber-50/60 border border-dashed border-amber-200 select-none">
                                  <Coffee className="w-4 h-4 text-amber-600 mb-1" />
                                  <span className="text-xs font-bold text-amber-900">فترة استراحة / موقوفة</span>
                                  <span className="text-[10px] text-amber-700/80 font-mono mt-0.5">{period.headerTime}</span>
                                </div>
                              ) : slot ? (
                                <div className="p-2.5 h-full flex flex-col justify-between bg-emerald-50/40 hover:bg-emerald-50 transition border border-transparent">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                      {slot.section?.course?.name || "المقرر"}
                                    </p>
                                    <span className="font-mono text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                      شعبة {slot.section?.sectionNumber || "A"}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                    <span className="font-medium truncate">{slot.room || "قاعة دراسية"}</span>
                                    <span className="text-[10px] text-slate-400 truncate">{slot.building}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center p-2 text-slate-300 font-mono text-xs">
                                  —
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t-2 border-slate-800 flex items-center justify-between text-xs text-slate-600">
              <span>يرجى الالتزام بمواعيد بدء وانتهاء المحاضرات وتفعيل نظام الحضور الذكي (QR Code).</span>
              <span className="font-bold font-mono">قسم هندسة الحاسوب • الجامعة المستنصرية</span>
            </div>
          </div>
        )}

        {/* Cards View Mode */}
        {viewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeDaysList.map((day) => {
              const daySlots = slots.filter((s) => s.dayOfWeek?.toUpperCase() === day.key.toUpperCase());
              return (
                <div key={day.key} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-base font-bold text-slate-900">{day.label}</h4>
                    <span className="text-xs text-slate-500 font-mono font-medium">{daySlots.length} محاضرات</span>
                  </div>

                  <div className="space-y-3">
                    {daySlots.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        لا توجد محاضرات مجدولة لهذا اليوم
                      </div>
                    ) : (
                      daySlots.map((slot) => (
                        <div key={slot._id} className="bg-slate-50 hover:bg-slate-100/80 transition p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">{slot.section?.course?.name}</h5>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              شعبة {slot.section?.sectionNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#14352c]" />
                            <span>{slot.startTime} - {slot.endTime}</span>
                            <MapPin className="w-3.5 h-3.5 text-slate-500 mr-2" />
                            <span>{slot.room}</span>
                          </div>
                        </div>
                      ))
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
