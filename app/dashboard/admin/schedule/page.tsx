"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import Navbar from "@/components/Navbar";
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import {
  CalendarDays,
  Plus,
  Printer,
  RefreshCw,
  Layers,
  GraduationCap,
  Building2,
  Trash2,
  Pencil,
  GripVertical,
  CheckCircle2,
  Users,
  AlertCircle,
  Move,
  Info,
  X,
  Settings2,
  SlidersHorizontal,
  Columns,
  Rows,
  PauseCircle,
  PlayCircle,
  Coffee,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────
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
    students?: string[];
    course?: {
      _id: string;
      name: string;
      code: string;
      stage: number;
      credits: number;
      department?: string;
    };
    doctor?: {
      _id: string;
      name: string;
      email: string;
    };
  };
}

export interface PeriodConfig {
  periodNumber: number;
  headerTime: string;
  startTime: string;
  endTime: string;
  isPaused?: boolean;
  pauseReason?: string;
  subHours: { label: string }[];
}

export interface DayConfig {
  key: string;
  label: string;
}

// ─────────────────────────────────────────────
// Default Academic Constants
// ─────────────────────────────────────────────
const ALL_WEEKDAYS: DayConfig[] = [
  { key: "SATURDAY", label: "السبت" },
  { key: "SUNDAY", label: "الأحد" },
  { key: "MONDAY", label: "الاثنين" },
  { key: "TUESDAY", label: "الثلاثاء" },
  { key: "WEDNESDAY", label: "الأربعاء" },
  { key: "THURSDAY", label: "الخميس" },
];

const DEFAULT_ACTIVE_DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];

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

const STAGE_OPTIONS: SelectOption[] = [
  { value: "1", label: "المرحلة الأولى (1)" },
  { value: "2", label: "المرحلة الثانية (2)" },
  { value: "3", label: "المرحلة الثالثة (3)" },
  { value: "4", label: "المرحلة الرابعة (4)" },
];

const SEMESTER_OPTIONS: SelectOption[] = [
  { value: "FIRST", label: "الكورس الأول" },
  { value: "SECOND", label: "الكورس الثاني" },
];

const STUDY_TYPE_OPTIONS: SelectOption[] = [
  { value: "MORNING", label: "الدراسة الصباحية" },
  { value: "EVENING", label: "الدراسة المسائية" },
];

export default function AdminInteractiveSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // ─────────────────────────────────────────────
  // Filter & Context State
  // ─────────────────────────────────────────────
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<number>(3); // Default Stage 3 (matching photo)
  const [selectedSemester, setSelectedSemester] = useState<string>("FIRST");
  const [selectedStudyType, setSelectedStudyType] = useState<string>("MORNING");
  const [academicYear, setAcademicYear] = useState<string>("2025-2026");

  // ─────────────────────────────────────────────
  // Dynamic Sections (الشعب الدراسية للمرحلة)
  // ─────────────────────────────────────────────
  const [availableSections, setAvailableSections] = useState<string[]>(["A"]);
  const [selectedSectionNumber, setSelectedSectionNumber] = useState<string>("A");
  const [addSectionModal, setAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // ─────────────────────────────────────────────
  // Dynamic Structure: Periods (الأعمدة) & Days (الصفوف)
  // ─────────────────────────────────────────────
  const [periods, setPeriods] = useState<PeriodConfig[]>(DEFAULT_PERIODS);
  const [activeDayKeys, setActiveDayKeys] = useState<string[]>(DEFAULT_ACTIVE_DAYS);

  // Modals for Customizing Grid Structure
  const [addPeriodModal, setAddPeriodModal] = useState(false);
  const [newPeriodStart, setNewPeriodStart] = useState("14:00");
  const [newPeriodEnd, setNewPeriodEnd] = useState("15:40");

  // Edit Period Modal
  const [editPeriodModal, setEditPeriodModal] = useState(false);
  const [editingPeriodNum, setEditingPeriodNum] = useState<number>(1);
  const [editPeriodStart, setEditPeriodStart] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [editPeriodIsPaused, setEditPeriodIsPaused] = useState(false);

  const [manageDaysModal, setManageDaysModal] = useState(false);

  // Core Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);

  // Drag and Drop State
  const [draggingSlot, setDraggingSlot] = useState<ScheduleSlot | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ day: string; periodNumber: number } | null>(null);

  // Design Alert Banner State (Inline in page)
  const [alert, setAlert] = useState<{
    title: string;
    message: string;
    type: "success" | "danger" | "info";
  } | null>(null);

  const triggerAlert = (
    title: string,
    message: string,
    type: "success" | "danger" | "info" = "success"
  ) => {
    setAlert({ title, message, type });
  };

  // Auto-dismiss alert after 6 seconds
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      setAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [alert]);

  // Modal State for Add / Edit Lecture Slot
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [modalDay, setModalDay] = useState("MONDAY");
  const [modalPeriodNumber, setModalPeriodNumber] = useState(1);
  const [modalCourseId, setModalCourseId] = useState("");
  const [modalDoctorId, setModalDoctorId] = useState("");
  const [modalRoom, setModalRoom] = useState("قاعة 302");
  const [modalBuilding, setModalBuilding] = useState("قسم هندسة الحاسوب");
  const [modalAutoEnroll, setModalAutoEnroll] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<ScheduleSlot | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-Enroll Progress State
  const [enrollingStage, setEnrollingStage] = useState(false);

  // ─────────────────────────────────────────────
  // Initial Load & Auth Check
  // ─────────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Restore saved custom structure from local storage if available
    try {
      const savedPeriods = localStorage.getItem("uams_custom_periods");
      if (savedPeriods) setPeriods(JSON.parse(savedPeriods));
      const savedDays = localStorage.getItem("uams_custom_active_days");
      if (savedDays) setActiveDayKeys(JSON.parse(savedDays));
    } catch {}

    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [deptRes, coursesRes, docsRes, secRes, schedRes, configRes] = await Promise.all([
        apiFetch("/academic/departments").catch(() => ({ data: [] })),
        apiFetch("/academic/courses").catch(() => ({ data: [] })),
        apiFetch("/admin/users?role=DOCTOR&limit=100").catch(() => ({ data: [] })),
        apiFetch("/academic/sections").catch(() => ({ data: [] })),
        apiFetch("/academic/schedules").catch(() => ({ data: [] })),
        apiFetch("/academic/timetable-config").catch(() => null),
      ]);

      const deptList = deptRes.data || [];
      setDepartments(deptList);
      if (deptList.length > 0 && !selectedDepartment) {
        setSelectedDepartment(deptList[0]._id);
      }

      setCourses(coursesRes.data || []);
      setDoctors(docsRes.data || docsRes.users || []);
      const allSections = secRes.data || [];
      setSections(allSections);

      const schedList = schedRes.data || (Array.isArray(schedRes) ? schedRes : []);
      setSlots(schedList);

      // Restore configuration from backend (Synced across all roles)
      if (configRes?.data) {
        if (Array.isArray(configRes.data.periods) && configRes.data.periods.length > 0) {
          setPeriods(configRes.data.periods);
          try {
            localStorage.setItem("uams_custom_periods", JSON.stringify(configRes.data.periods));
          } catch {}
        }
        if (Array.isArray(configRes.data.activeDayKeys) && configRes.data.activeDayKeys.length > 0) {
          setActiveDayKeys(configRes.data.activeDayKeys);
          try {
            localStorage.setItem("uams_custom_active_days", JSON.stringify(configRes.data.activeDayKeys));
          } catch {}
        }
      }

      // Determine available section numbers for current stage
      syncAvailableSections(allSections, 3);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const refreshSchedule = async () => {
    setFetching(true);
    try {
      const [secRes, schedRes, configRes] = await Promise.all([
        apiFetch("/academic/sections").catch(() => ({ data: [] })),
        apiFetch("/academic/schedules").catch(() => ({ data: [] })),
        apiFetch("/academic/timetable-config").catch(() => null),
      ]);
      const allSections = secRes.data || [];
      setSections(allSections);
      const schedList = schedRes.data || (Array.isArray(schedRes) ? schedRes : []);
      setSlots(schedList);
      syncAvailableSections(allSections, selectedStage);

      if (configRes?.data) {
        if (Array.isArray(configRes.data.periods) && configRes.data.periods.length > 0) {
          setPeriods(configRes.data.periods);
        }
        if (Array.isArray(configRes.data.activeDayKeys) && configRes.data.activeDayKeys.length > 0) {
          setActiveDayKeys(configRes.data.activeDayKeys);
        }
      }
    } finally {
      setFetching(false);
    }
  };

  // Helper to sync sections list for the selected stage
  const syncAvailableSections = (secList: any[], stageNum: number) => {
    const stageSecs = secList.filter((s) => Number(s.course?.stage) === Number(stageNum));
    const secNumbers = Array.from(
      new Set(
        stageSecs.map((s) => {
          const raw = s.sectionNumber || "A";
          return raw.replace(/^SEC_/, "").toUpperCase();
        })
      )
    );

    const merged = Array.from(new Set(["A", ...secNumbers]));
    setAvailableSections(merged);
    if (!merged.includes(selectedSectionNumber)) {
      setSelectedSectionNumber(merged[0]);
    }
  };

  // When stage changes, update sections list
  useEffect(() => {
    syncAvailableSections(sections, selectedStage);
  }, [selectedStage, sections]);

  // ─────────────────────────────────────────────
  // Filtered Data Calculations
  // ─────────────────────────────────────────────
  const currentDepartmentObj = useMemo(() => {
    return departments.find((d) => d._id === selectedDepartment) || departments[0] || null;
  }, [departments, selectedDepartment]);

  const departmentName = currentDepartmentObj?.name || "هندسة الحاسوب";

  // Active days list configured by Admin
  const activeDaysList = useMemo(() => {
    return ALL_WEEKDAYS.filter((d) => activeDayKeys.includes(d.key));
  }, [activeDayKeys]);

  // Filter slots belonging to current stage AND selected section
  const currentScheduleSlots = useMemo(() => {
    return slots.filter((slot) => {
      const courseStage = slot.section?.course?.stage;
      if (Number(courseStage) !== Number(selectedStage)) return false;

      const rawSec = (slot.section?.sectionNumber || "A").replace(/^SEC_/, "").toUpperCase();
      return rawSec.includes(selectedSectionNumber.toUpperCase());
    });
  }, [slots, selectedStage, selectedSectionNumber]);

  // Find slot for a specific Day and Period
  const getSlotAt = (dayKey: string, period: PeriodConfig): ScheduleSlot | undefined => {
    return currentScheduleSlots.find((slot) => {
      if (slot.dayOfWeek !== dayKey) return false;
      const slotStart = slot.startTime || "";
      const pStart = period.startTime || "";
      if (slotStart === pStart) return true;

      // Close start time matching (within period window)
      const [sh, sm] = slotStart.split(":").map(Number);
      const [ph, pm] = pStart.split(":").map(Number);
      if (isNaN(sh) || isNaN(ph)) return false;
      const diff = Math.abs(sh * 60 + sm - (ph * 60 + pm));
      return diff < 40;
    });
  };

  // Courses available for current stage
  const stageCourses = useMemo(() => {
    return courses.filter((c) => Number(c.stage) === Number(selectedStage));
  }, [courses, selectedStage]);

  const courseSelectOptions: SelectOption[] = useMemo(() => {
    return stageCourses.map((c) => ({
      value: c._id,
      label: `${c.name} (${c.code}) - ${c.credits || 3} وحدات`,
      subLabel: `المرحلة ${c.stage}`,
    }));
  }, [stageCourses]);

  const doctorSelectOptions: SelectOption[] = useMemo(() => {
    return doctors.map((d) => ({
      value: d._id,
      label: `${d.name} (${d.email})`,
    }));
  }, [doctors]);

  const departmentSelectOptions: SelectOption[] = useMemo(() => {
    return departments.map((d) => ({
      value: d._id,
      label: `${d.name} (${d.code})`,
    }));
  }, [departments]);

  // ─────────────────────────────────────────────
  // Backend Sync Helper for Timetable Configuration
  // ─────────────────────────────────────────────
  const syncStructureToBackend = async (
    updatedPeriods: PeriodConfig[],
    updatedDays: string[],
    alertTitle: string,
    alertMessage: string
  ) => {
    try {
      setPeriods(updatedPeriods);
      setActiveDayKeys(updatedDays);
      try {
        localStorage.setItem("uams_custom_periods", JSON.stringify(updatedPeriods));
        localStorage.setItem("uams_custom_active_days", JSON.stringify(updatedDays));
      } catch {}

      await apiFetch("/academic/timetable-config", {
        method: "PUT",
        body: JSON.stringify({
          periods: updatedPeriods,
          activeDayKeys: updatedDays,
          stage: selectedStage,
          semester: selectedSemester,
          academicYear,
        }),
      });

      triggerAlert(alertTitle, alertMessage, "success");
    } catch (err: any) {
      triggerAlert("تنبيه في الحفظ", err.message || "تعذر حفظ الإعدادات على الخادم.", "danger");
    }
  };

  // ─────────────────────────────────────────────
  // Dynamic Structure Handlers: Periods & Days
  // ─────────────────────────────────────────────
  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodStart || !newPeriodEnd) return;

    const newPeriodNum = periods.length + 1;
    const headerTime = `${newPeriodStart} - ${newPeriodEnd}`;
    const newPeriodObj: PeriodConfig = {
      periodNumber: newPeriodNum,
      headerTime,
      startTime: newPeriodStart,
      endTime: newPeriodEnd,
      isPaused: false,
      pauseReason: "",
      subHours: [
        { label: `الساعة الأولى (${newPeriodStart})` },
        { label: `الساعة الثانية (${newPeriodEnd})` },
      ],
    };

    const updated = [...periods, newPeriodObj];
    setAddPeriodModal(false);

    await syncStructureToBackend(
      updated,
      activeDayKeys,
      "تمت إضافة عامود فترة جديدة",
      `تم إدراج الفترة ${newPeriodNum} (${headerTime}) في الجدول وتحديثها لجميع الطلبة والأساتذة فورياً.`
    );
  };

  const openEditPeriodModal = (period: PeriodConfig) => {
    setEditingPeriodNum(period.periodNumber);
    setEditPeriodStart(period.startTime);
    setEditPeriodEnd(period.endTime);
    setEditPeriodIsPaused(!!period.isPaused);
    setEditPeriodModal(true);
  };

  const handleSaveEditPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPeriodStart || !editPeriodEnd) return;

    const headerTime = `${editPeriodStart} - ${editPeriodEnd}`;
    const updated = periods.map((p) => {
      if (p.periodNumber === editingPeriodNum) {
        return {
          ...p,
          headerTime,
          startTime: editPeriodStart,
          endTime: editPeriodEnd,
          isPaused: editPeriodIsPaused,
          pauseReason: editPeriodIsPaused ? "فترة استراحة / موقوفة مؤقتاً" : "",
          subHours: [
            { label: `الساعة الأولى (${editPeriodStart})` },
            { label: `الساعة الثانية (${editPeriodEnd})` },
          ],
        };
      }
      return p;
    });

    setEditPeriodModal(false);

    await syncStructureToBackend(
      updated,
      activeDayKeys,
      "تم تعديل الفترة بنجاح",
      `تم تحديث توقيت الفترة ${editingPeriodNum} (${headerTime}) ومزامنتها لجميع الحسابات.`
    );
  };

  const handleTogglePausePeriod = async (periodNum: number) => {
    const targetPeriod = periods.find((p) => p.periodNumber === periodNum);
    if (!targetPeriod) return;

    const willPause = !targetPeriod.isPaused;
    const updated = periods.map((p) => {
      if (p.periodNumber === periodNum) {
        return {
          ...p,
          isPaused: willPause,
          pauseReason: willPause ? "فترة استراحة / موقوفة مؤقتاً" : "",
        };
      }
      return p;
    });

    await syncStructureToBackend(
      updated,
      activeDayKeys,
      willPause ? "تم إيقاف الفترة (استراحة)" : "تم استئناف وتفعيل الفترة",
      willPause
        ? `تم تحويل الفترة ${periodNum} (${targetPeriod.headerTime}) إلى فترة استراحة/توقيف وتحديثها فورياً للطلبة والأساتذة.`
        : `تمت إعادة تفعيل الفترة ${periodNum} (${targetPeriod.headerTime}) في الجدول الدراسي بنجاح.`
    );
  };

  const handleDeletePeriod = async (periodNum: number) => {
    if (periods.length <= 1) {
      triggerAlert("تنبيه", "يجب أن يحتوي الجدول على فترة زمنية واحدة على الأقل.", "danger");
      return;
    }

    const updated = periods
      .filter((p) => p.periodNumber !== periodNum)
      .map((p, idx) => ({ ...p, periodNumber: idx + 1 }));

    await syncStructureToBackend(
      updated,
      activeDayKeys,
      "تم حذف الفترة الزمنية (العامود)",
      `تم حذف الفترة ${periodNum} وإعادة ترتيب الأعمدة ومزامنتها لجميع الحسابات بنجاح.`
    );
  };

  const handleToggleDay = async (dayKey: string) => {
    if (activeDayKeys.includes(dayKey)) {
      if (activeDayKeys.length <= 1) {
        triggerAlert("تنبيه", "يجب الإبقاء على يوم دراسي واحد على الأقل في الجدول.", "danger");
        return;
      }
      const updated = activeDayKeys.filter((k) => k !== dayKey);
      await syncStructureToBackend(
        periods,
        updated,
        "تم حذف اليوم (الصف)",
        `تم إخفاء هذا اليوم من الجدول الأسبوعي ومزامنة العرض لباقي الرتب.`
      );
    } else {
      const orderMap = ALL_WEEKDAYS.map((d) => d.key);
      const updated = [...activeDayKeys, dayKey].sort(
        (a, b) => orderMap.indexOf(a) - orderMap.indexOf(b)
      );
      await syncStructureToBackend(
        periods,
        updated,
        "تمت إضافة اليوم للجدول",
        `تم تفعيل هذا اليوم في الجدول ومزامنة التحديث فورياً.`
      );
    }
  };

  // ─────────────────────────────────────────────
  // Dynamic Section Management
  // ─────────────────────────────────────────────
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSectionName.trim().toUpperCase();
    if (!clean) return;

    if (availableSections.includes(clean)) {
      triggerAlert("تنبيه", `الشعبة ${clean} موجودة بالفعل لهذه المرحلة.`, "danger");
      return;
    }

    const updated = [...availableSections, clean].sort();
    setAvailableSections(updated);
    setSelectedSectionNumber(clean);
    setNewSectionName("");
    setAddSectionModal(false);

    triggerAlert("تمت إضافة الشعبة", `تم إنشاء شعبة ${clean} للمرحلة ${selectedStage} بنجاح.`);
  };

  // ─────────────────────────────────────────────
  // Drag and Drop Logic
  // ─────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, slot: ScheduleSlot) => {
    setDraggingSlot(slot);
    e.dataTransfer.setData("text/plain", slot._id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (dayKey: string, periodNumber: number) => {
    setDragOverTarget({ day: dayKey, periodNumber });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string, targetPeriod: PeriodConfig) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (targetPeriod.isPaused) {
      triggerAlert("فترة موقوفة", "هذه الفترة موقوفة/استراحة حالياً، يرجى تفعيلها أولاً أو اختيار فترة أخرى.", "danger");
      setDraggingSlot(null);
      return;
    }

    if (!draggingSlot) return;

    // Check if dropping on the exact same location
    const sameDay = draggingSlot.dayOfWeek === targetDay;
    const sameTime = draggingSlot.startTime === targetPeriod.startTime;
    if (sameDay && sameTime) {
      setDraggingSlot(null);
      return;
    }

    // Check for collision in current section
    const existingSlot = getSlotAt(targetDay, targetPeriod);
    if (existingSlot && existingSlot._id !== draggingSlot._id) {
      triggerAlert(
        "تعارض في الموعد",
        `يوجد درس آخر (${existingSlot.section?.course?.name || "مقرر"}) في نفس هذا الوقت والقاعة. يرجى اختيار خانة فارغة.`,
        "danger"
      );
      setDraggingSlot(null);
      return;
    }

    // Optimistic UI Update
    const previousSlots = [...slots];
    const updatedSlots = slots.map((s) => {
      if (s._id === draggingSlot._id) {
        return {
          ...s,
          dayOfWeek: targetDay,
          startTime: targetPeriod.startTime,
          endTime: targetPeriod.endTime,
        };
      }
      return s;
    });
    setSlots(updatedSlots);

    try {
      await apiFetch(`/academic/schedules/slots/${draggingSlot._id}`, {
        method: "PUT",
        body: JSON.stringify({
          dayOfWeek: targetDay,
          startTime: targetPeriod.startTime,
          endTime: targetPeriod.endTime,
        }),
      });

      const dayName = ALL_WEEKDAYS.find((d) => d.key === targetDay)?.label || targetDay;
      const courseName = draggingSlot.section?.course?.name || "المحاضرة";

      // Trigger Design Alert (Inline banner)
      triggerAlert(
        "تم نقل المحاضرة بنجاح",
        `تم تحديث موعد (${courseName}) إلى يوم ${dayName} (${targetPeriod.headerTime}) وتحديث جدول الطلاب والأساتذة فورياً.`,
        "success"
      );

      // Invalidate relevant caches
      smartCache.invalidate("/academic/schedules");
      smartCache.invalidate("/student/schedule");
      smartCache.invalidate("/doctor/schedule");
    } catch (err: any) {
      setSlots(previousSlots);
      triggerAlert(
        "فشل النقل",
        err.message || "حدث خطأ أثناء نقل المحاضرة، تم التراجع عن التغيير.",
        "danger"
      );
    } finally {
      setDraggingSlot(null);
    }
  };

  // ─────────────────────────────────────────────
  // Modal Actions: Add / Edit Lecture
  // ─────────────────────────────────────────────
  const openAddModal = (dayKey: string, periodNumber: number) => {
    const targetPeriod = periods.find((p) => p.periodNumber === periodNumber);
    if (targetPeriod?.isPaused) {
      triggerAlert("فترة موقوفة", "هذه الفترة مخصصة كفترة استراحة/توقيف، يرجى تفعيلها أولاً لإضافة محاضرة.", "danger");
      return;
    }

    setEditingSlot(null);
    setModalDay(dayKey);
    setModalPeriodNumber(periodNumber);
    setModalCourseId(stageCourses[0]?._id || "");
    setModalDoctorId(doctors[0]?._id || "");
    setModalRoom("قاعة 302");
    setModalBuilding("قسم هندسة الحاسوب");
    setModalAutoEnroll(true);
    setModalOpen(true);
  };

  const openEditModal = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setModalDay(slot.dayOfWeek);

    const periodIdx = periods.findIndex((p) => {
      const pStart = p.startTime;
      const sStart = slot.startTime;
      if (pStart === sStart) return true;
      const [sh, sm] = sStart.split(":").map(Number);
      const [ph, pm] = pStart.split(":").map(Number);
      return Math.abs(sh * 60 + sm - (ph * 60 + pm)) < 40;
    });

    setModalPeriodNumber(periodIdx !== -1 ? periods[periodIdx].periodNumber : 1);
    setModalCourseId(slot.section?.course?._id || "");
    setModalDoctorId(slot.section?.doctor?._id || "");
    setModalRoom(slot.room || "قاعة 302");
    setModalBuilding(slot.building || "قسم هندسة الحاسوب");
    setModalAutoEnroll(false);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCourseId || !modalDoctorId) {
      triggerAlert("بيانات ناقصة", "يُرجى اختيار المادة وتعيين أستاذ المادة.", "danger");
      return;
    }

    const selectedPeriod = periods.find((p) => p.periodNumber === modalPeriodNumber) || periods[0];
    setSubmitting(true);

    try {
      if (editingSlot) {
        // Edit existing slot
        const res = await apiFetch(`/academic/schedules/slots/${editingSlot._id}`, {
          method: "PUT",
          body: JSON.stringify({
            dayOfWeek: modalDay,
            startTime: selectedPeriod.startTime,
            endTime: selectedPeriod.endTime,
            room: modalRoom,
            building: modalBuilding,
          }),
        });

        // Also update doctor if changed
        if (editingSlot.section?._id) {
          await apiFetch(`/academic/sections/${editingSlot.section._id}`, {
            method: "PUT",
            body: JSON.stringify({ doctor: modalDoctorId }),
          }).catch(() => {});
        }

        triggerAlert("تم تعديل المحاضرة", "تم تحديث بيانات القاعة والوقت بنجاح.", "success");
      } else {
        // Find or create Section for this Course and SectionNumber
        let targetSection = sections.find(
          (s) =>
            s.course?._id === modalCourseId &&
            s.sectionNumber?.replace(/^SEC_/, "").toUpperCase() === selectedSectionNumber.toUpperCase()
        );

        if (!targetSection) {
          const createSecRes = await apiFetch("/academic/sections", {
            method: "POST",
            body: JSON.stringify({
              course: modalCourseId,
              doctor: modalDoctorId,
              sectionNumber: selectedSectionNumber,
              capacity: 60,
              semester: selectedSemester,
              academicYear,
            }),
          });
          targetSection = createSecRes.data;
        }

        // Add Schedule Slot to Section
        const slotRes = await apiFetch(`/academic/sections/${targetSection._id}/schedule`, {
          method: "POST",
          body: JSON.stringify({
            dayOfWeek: modalDay,
            startTime: selectedPeriod.startTime,
            endTime: selectedPeriod.endTime,
            room: modalRoom,
            building: modalBuilding,
          }),
        });

        // Auto-Enroll Stage Students if checked
        if (modalAutoEnroll && targetSection?._id) {
          await apiFetch(`/academic/sections/${targetSection._id}/enroll-stage`, {
            method: "POST",
          }).catch(() => {});
        }

        const courseObj = courses.find((c) => c._id === modalCourseId);
        triggerAlert(
          "تم تثبيت المحاضرة بنجاح",
          `تم إدراج درس (${courseObj?.name || "المادة"}) في شعبة ${selectedSectionNumber} وتحديث جداول الطلبة فورياً.`,
          "success"
        );
      }

      setModalOpen(false);
      await refreshSchedule();

      smartCache.invalidate("/academic/schedules");
      smartCache.invalidate("/student/schedule");
      smartCache.invalidate("/doctor/schedule");
    } catch (err: any) {
      triggerAlert("خطأ في حفظ المحاضرة", err.message || "حدث خطأ أثناء حفظ الفترة الدراسية.", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────
  // Delete Slot Action
  // ─────────────────────────────────────────────
  const handleDeleteSlot = async () => {
    if (!deleteConfirmSlot) return;
    setDeleting(true);
    try {
      await apiFetch(`/academic/schedules/slots/${deleteConfirmSlot._id}`, {
        method: "DELETE",
      });

      setSlots((prev) => prev.filter((s) => s._id !== deleteConfirmSlot._id));
      setDeleteConfirmSlot(null);
      triggerAlert("تم حذف المحاضرة", "تم إلغاء المحاضرة من الجدول وتفريغ القاعة بنجاح.", "success");

      smartCache.invalidate("/academic/schedules");
      smartCache.invalidate("/student/schedule");
      smartCache.invalidate("/doctor/schedule");
    } catch (err: any) {
      triggerAlert("تعذر الحذف", err.message || "حدث خطأ أثناء محاولة الحذف.", "danger");
    } finally {
      setDeleting(false);
    }
  };

  // ─────────────────────────────────────────────
  // Sync All Stage Students to Current Section
  // ─────────────────────────────────────────────
  const handleEnrollAllStageStudents = async () => {
    const stageSecs = sections.filter(
      (s) =>
        Number(s.course?.stage) === Number(selectedStage) &&
        (s.sectionNumber || "A").replace(/^SEC_/, "").toUpperCase() === selectedSectionNumber.toUpperCase()
    );

    if (stageSecs.length === 0) {
      triggerAlert("تنبيه", "لا توجد شعب منشأة حالياً لهذه المرحلة. قم بإضافة مادة أولاً.", "info");
      return;
    }

    setEnrollingStage(true);
    try {
      let enrolledCount = 0;
      for (const sec of stageSecs) {
        const res = await apiFetch(`/academic/sections/${sec._id}/enroll-stage`, {
          method: "POST",
        }).catch(() => null);
        if (res?.count) enrolledCount += res.count;
      }

      triggerAlert(
        "تمت مزامنة طلاب المرحلة",
        `تم تسجيل جميع طلبة المرحلة ${selectedStage} في شعبة ${selectedSectionNumber} وتحديث جداولهم الدراسية بنجاح.`,
        "success"
      );
      await refreshSchedule();
    } catch (err: any) {
      triggerAlert("تعذر المزامنة", err.message || "حدث خطأ أثناء مزامنة الطلاب.", "danger");
    } finally {
      setEnrollingStage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900" dir="rtl">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin text-[#14352c] mx-auto" />
          <p className="text-xs text-slate-500 font-bold">جاري تحميل الجدول الأسبوعي التفاعلي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Universal Floating Island Capsule Navbar */}
      <Navbar user={user} />

      {/* Main Content Area - with generous top padding to completely prevent navbar overlap */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">
        {/* Navigation Breadcrumb & Page Header */}
        <div className="print:hidden bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/dashboard/admin" className="hover:text-[#14352c] transition">
                لوحة الإدارة
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">الجدول الدراسي التفاعلي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-[#14352c]" />
              جدول الدروس الأسبوعي التفاعلي (السحب والإفلات)
            </h1>
            <p className="text-xs text-slate-600">
              يمكنك سحب أي محاضرة وإفلاتها لتغيير يومها ووقتها لحظياً، أو الضغط على أي خانة فارغة لإضافة مادة.
            </p>
          </div>

          {/* Top Actions Hub */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openAddModal("MONDAY", 1)}
              className="px-4 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              إضافة مادة للجدول
            </button>

            <button
              type="button"
              onClick={handleEnrollAllStageStudents}
              disabled={enrollingStage}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14352c] border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="مزامنة وتثبيت جميع طلاب المرحلة في هذه الشعبة"
            >
              {enrollingStage ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#14352c]" />
              ) : (
                <Users className="w-4 h-4 text-emerald-700" />
              )}
              مزامنة طلاب المرحلة
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
              title="طباعة الجدول الرسمي بنفس الهيئة الوزارية"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              طباعة الجدول
            </button>

            <button
              type="button"
              onClick={refreshSchedule}
              disabled={fetching}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition border border-slate-200"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin text-[#14352c]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Academic Filters Bar */}
        <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                القسم الأكاديمي:
              </label>
              <CustomSelect
                options={departmentSelectOptions}
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                className="w-full"
                theme="light"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المرحلة الدراسية:
              </label>
              <CustomSelect
                options={STAGE_OPTIONS}
                value={String(selectedStage)}
                onChange={(val) => setSelectedStage(Number(val))}
                className="w-full"
                theme="light"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الفصل الدراسي:
              </label>
              <CustomSelect
                options={SEMESTER_OPTIONS}
                value={selectedSemester}
                onChange={setSelectedSemester}
                className="w-full"
                theme="light"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نوع الدراسة:
              </label>
              <CustomSelect
                options={STUDY_TYPE_OPTIONS}
                value={selectedStudyType}
                onChange={setSelectedStudyType}
                className="w-full"
                theme="light"
              />
            </div>
          </div>

          {/* Section Tabs & Dynamic Structure Customization Controls */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Sections Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#14352c]" />
                الشُعب الدراسية:
              </span>
              {availableSections.map((sec) => {
                const isActive = selectedSectionNumber === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSectionNumber(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#14352c] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>شعبة {sec}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAddSectionModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-dashed border border-slate-300 hover:border-[#14352c] text-slate-600 hover:text-[#14352c] text-xs font-semibold transition flex items-center gap-1"
                title="إضافة شعبة جديدة لهذه المرحلة (مثلاً: B أو C)"
              >
                <Plus className="w-3 h-3" />
                إضافة شُعبة
              </button>
            </div>

            {/* Grid Customization Controls (الأعمدة والصفوف) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAddPeriodModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
                title="إضافة عامود فترة رابعة أو خامسة (مثل وقت المختبرات)"
              >
                <Columns className="w-3.5 h-3.5 text-slate-600" />
                + إضافة فترة (عامود)
              </button>

              <button
                type="button"
                onClick={() => setManageDaysModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
                title="تخصيص أيام الجدول وحذف/إضافة صفوف (مثلاً تفعيل السبت أو إخفاء الخميس)"
              >
                <Rows className="w-3.5 h-3.5 text-slate-600" />
                تخصيص الأيام (الصفوف)
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* INLINE DESIGN ALERT BANNER (مكون ALERT تصميمي داخل الصفحة)  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {alert && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all shadow-xs ${
              alert.type === "danger"
                ? "bg-rose-50 border-rose-200 text-rose-950"
                : alert.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-950"
                : "bg-emerald-50 border-emerald-200 text-emerald-950"
            }`}
            role="alert"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  alert.type === "danger"
                    ? "bg-rose-100 border-rose-300 text-rose-700"
                    : alert.type === "info"
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-emerald-100 border-emerald-300 text-emerald-700"
                }`}
              >
                {alert.type === "danger" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900">{alert.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                  {alert.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAlert(null)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-black/5 transition shrink-0"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OFFICIAL MUSTANSIRIYAH TIMETABLE SHEET                      */}
        {/* MATCHING THE USER'S ATTACHED IMAGE 1:1                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-md overflow-hidden print:border-none print:shadow-none">
          {/* Official Academic Header */}
          <div className="text-center pt-6 pb-4 px-6 border-b-2 border-slate-800 bg-slate-50/50">
            <h4 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 uppercase font-mono">
              Ministry of Higher Education and Scientific Research
            </h4>
            <h5 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800 uppercase font-mono mt-0.5">
              Mustansiriyah University / College of Science / Department of Computer Science
            </h5>

            <h2 className="text-base sm:text-lg font-bold text-slate-950 mt-3">
              ( جدول الدروس الأسبوعي للعام الدراسي {academicYear}{" "}
              {selectedSemester === "FIRST" ? "الكورس الأول" : "الكورس الثاني"} )
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-bold text-slate-800 mt-2">
              <span>المرحلة {selectedStage} / {selectedSemester === "FIRST" ? "الكورس الأول" : "الكورس الثاني"}</span>
              <span>•</span>
              <span>شعبة {selectedSectionNumber}</span>
              <span>•</span>
              <span>قسم {departmentName}</span>
              <span>•</span>
              <span>{selectedStudyType === "MORNING" ? "الدراسة الصباحية" : "الدراسة المسائية"}</span>
            </div>
          </div>

          {/* Interactive Timetable Grid with Drag & Drop */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <thead>
                {/* Row 1: Periods Header with Inline Pause, Edit & Delete Controls */}
                <tr className="bg-slate-200 border-b border-slate-800 text-slate-900 font-bold text-xs sm:text-sm">
                  {/* The Day Header Cell */}
                  <th
                    rowSpan={2}
                    className="w-28 py-3 px-3 bg-slate-200 border-l-2 border-slate-800 align-middle text-sm font-bold"
                  >
                    اليوم
                  </th>

                  {/* Dynamic Period Columns */}
                  {periods.map((period, idx) => {
                    const isPaused = !!period.isPaused;
                    return (
                      <th
                        key={period.periodNumber}
                        colSpan={2}
                        className={`py-2.5 px-3 text-xs font-mono relative group transition-colors ${
                          isPaused ? "bg-amber-100/90 text-amber-950" : "bg-slate-200"
                        } ${idx < periods.length - 1 ? "border-l-2 border-slate-800" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-1.5 px-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-900">{period.headerTime}</span>
                            {isPaused && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-bold border border-amber-300">
                                استراحة / توقيف
                              </span>
                            )}
                          </div>

                          {/* Quick Admin Actions on Period Column Header */}
                          <div className="print:hidden flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            {/* Toggle Pause / Resume Period */}
                            <button
                              type="button"
                              onClick={() => handleTogglePausePeriod(period.periodNumber)}
                              className={`p-1 rounded transition ${
                                isPaused
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "hover:bg-amber-100 text-amber-800"
                              }`}
                              title={isPaused ? "استئناف وتفعيل الفترة" : "إيقاف الفترة مؤقتاً (استراحة)"}
                            >
                              {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                            </button>

                            {/* Edit Period Timing */}
                            <button
                              type="button"
                              onClick={() => openEditPeriodModal(period)}
                              className="p-1 rounded hover:bg-slate-300 text-slate-700 transition"
                              title="تعديل توقيت الفترة"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Period (Column) */}
                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(period.periodNumber)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 transition"
                              title="حذف هذا العامود بالكامل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Row 2: Sub-Hour Periods */}
                <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] text-slate-800 font-mono">
                  {periods.map((period, idx) => (
                    <Fragment key={period.periodNumber}>
                      <th className="py-1.5 px-2 border-l border-dashed border-slate-400 font-medium">
                        {period.subHours[0]?.label || `الساعة الأولى (${period.startTime})`}
                      </th>
                      <th
                        className={`py-1.5 px-2 font-medium ${
                          idx < periods.length - 1 ? "border-l-2 border-slate-800" : ""
                        }`}
                      >
                        {period.subHours[1]?.label || `الساعة الثانية (${period.endTime})`}
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>

              {/* Table Body: Dynamically Rendered Active Days (Rows) */}
              <tbody className="divide-y-2 divide-slate-800">
                {activeDaysList.map((day) => {
                  return (
                    <tr key={day.key} className="hover:bg-slate-50/50 transition group/row">
                      {/* Day Name Column with Quick Hide Row Action */}
                      <td className="py-4 px-3 bg-slate-100 font-bold text-slate-900 border-l-2 border-slate-800 align-middle relative">
                        <div className="flex items-center justify-between gap-1">
                          <span>{day.label}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDay(day.key)}
                            className="print:hidden opacity-0 group-hover/row:opacity-100 p-1 rounded hover:bg-rose-100 text-rose-500 transition"
                            title="إخفاء/حذف هذا اليوم من الجدول"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Period Cells */}
                      {periods.map((period, idx) => {
                        const slot = getSlotAt(day.key, period);
                        const isPaused = !!period.isPaused;
                        const isHovered =
                          dragOverTarget?.day === day.key &&
                          dragOverTarget?.periodNumber === period.periodNumber;

                        return (
                          <td
                            key={period.periodNumber}
                            colSpan={2}
                            onDragOver={handleDragOver}
                            onDragEnter={() => handleDragEnter(day.key, period.periodNumber)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day.key, period)}
                            className={`p-0 align-middle transition-colors relative min-h-[90px] h-[95px] ${
                              idx < periods.length - 1 ? "border-l-2 border-slate-800" : ""
                            } ${
                              isHovered
                                ? "bg-emerald-100/70 ring-2 ring-emerald-600 ring-inset"
                                : isPaused
                                ? "bg-amber-50/50"
                                : ""
                            }`}
                          >
                            {isPaused ? (
                              /* ── PAUSED PERIOD CELL (استراحة) ── */
                              <div className="h-full flex flex-col items-center justify-center p-2 text-center bg-amber-50/60 border border-dashed border-amber-200 select-none">
                                <Coffee className="w-4 h-4 text-amber-600 mb-1" />
                                <span className="text-xs font-bold text-amber-900">فترة استراحة / موقوفة</span>
                                <span className="text-[10px] text-amber-700/80 font-mono mt-0.5">{period.headerTime}</span>
                              </div>
                            ) : slot ? (
                              /* ── OCCUPIED CELL (DRAGGABLE CARD) ── */
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, slot)}
                                className="group p-2.5 h-full flex flex-col justify-between cursor-grab active:cursor-grabbing bg-emerald-50/40 hover:bg-emerald-50 transition border border-transparent hover:border-emerald-300 relative select-none"
                                title="اسحب المحاضرة لنقلها ليوم أو وقت آخر"
                              >
                                {/* Top Row: Course Name & Drag Icon */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="cursor-grab active:cursor-grabbing text-slate-400 group-hover:text-emerald-700 transition">
                                      <GripVertical className="w-3.5 h-3.5 shrink-0" />
                                    </span>
                                    <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                      {slot.section?.course?.name || "مقرر دراسي"}
                                    </p>
                                  </div>

                                  {/* Action Buttons on Hover */}
                                  <div className="print:hidden opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(slot);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                                      title="تعديل القاعة أو التفاصيل"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmSlot(slot);
                                      }}
                                      className="p-1 rounded hover:bg-rose-100 text-rose-600"
                                      title="إلغاء المحاضرة من الجدول"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Center: Doctor Name */}
                                <p className="text-xs text-slate-700 font-medium truncate text-right">
                                  {slot.section?.doctor?.name ? (
                                    <span>د. {slot.section.doctor.name}</span>
                                  ) : (
                                    <span className="text-slate-400">لم يُحدد أستاذ</span>
                                  )}
                                </p>

                                {/* Bottom Row: Room & Section */}
                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                  <span className="font-medium truncate max-w-[120px]">
                                    {slot.room || "قاعة دراسية"}
                                  </span>
                                  <span className="font-mono text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                    شعبة {selectedSectionNumber}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* ── EMPTY CELL (CLICK TO ADD) ── */
                              <div
                                onClick={() => openAddModal(day.key, period.periodNumber)}
                                className="h-full w-full flex items-center justify-center p-2 text-slate-300 hover:text-[#14352c] hover:bg-emerald-50/20 cursor-pointer transition group/empty"
                                title="اضغط لإضافة محاضرة في هذا الوقت"
                              >
                                <span className="opacity-0 group-hover/empty:opacity-100 text-xs font-bold text-[#14352c] flex items-center gap-1 transition">
                                  <Plus className="w-3.5 h-3.5" />
                                  إضافة محاضرة
                                </span>
                                <span className="text-slate-300 group-hover/empty:hidden font-mono text-xs">
                                  —
                                </span>
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

          {/* Official Bottom Sheet Footer */}
          <div className="p-4 bg-slate-50 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">ملاحظات:</span>
              <span>تبدأ المحاضرة الأولى الساعة 8:30 صباحاً، مدة المحاضرة 100 دقيقة تتخللها فترات راحة رسمية.</span>
            </div>
            <div className="font-mono font-bold text-slate-800 text-[11px]">
              رئاسة قسم {departmentName} • لجنة الجداول الأكاديمية
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODAL: ADD SECTION DIALOG                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Dialog
          isOpen={addSectionModal}
          onClose={() => setAddSectionModal(false)}
          title="إضافة شُعبة دراسية للمرحلة"
        >
          <form onSubmit={handleAddSection} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              قم بإدخال رمز الشعبة الجديدة (مثل: B أو C أو D). ستتمكن بعد ذلك من إدارة جدول مستقل لهذه الشعبة وتوزيع الطلبة عليها.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رمز الشُعبة (حرف لاتيني أو رقم):
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="مثال: B أو C"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition uppercase font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddSectionModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-xs"
              >
                إضافة الشُعبة
              </button>
            </div>
          </form>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODAL: ADD PERIOD (COLUMN) DIALOG                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Dialog
          isOpen={addPeriodModal}
          onClose={() => setAddPeriodModal(false)}
          title="إضافة فترة زمنية (عامود جديد)"
        >
          <form onSubmit={handleAddPeriod} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              يمكنك إضافة فترة رابعة أو خامسة (مثل وقت المختبرات المسائية 14:00 - 15:40) وسيتم تحديث الجدول ومزامنته للجميع.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وقت البدء (HH:MM):
                </label>
                <input
                  type="text"
                  required
                  value={newPeriodStart}
                  onChange={(e) => setNewPeriodStart(e.target.value)}
                  placeholder="14:00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] font-mono text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وقت الانتهاء (HH:MM):
                </label>
                <input
                  type="text"
                  required
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                  placeholder="15:40"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddPeriodModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-xs"
              >
                إدراج الفترة في الجدول
              </button>
            </div>
          </form>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODAL: EDIT PERIOD DIALOG                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Dialog
          isOpen={editPeriodModal}
          onClose={() => setEditPeriodModal(false)}
          title={`تعديل الفترة الزمنية ${editingPeriodNum}`}
        >
          <form onSubmit={handleSaveEditPeriod} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              قم بتعديل توقيت الفترة أو تعيينها كفترة استراحة موقوفة مؤقتاً، وسيتم تحديثها لكافة الطلبة والأساتذة فوراً.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وقت البدء (HH:MM):
                </label>
                <input
                  type="text"
                  required
                  value={editPeriodStart}
                  onChange={(e) => setEditPeriodStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] font-mono text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وقت الانتهاء (HH:MM):
                </label>
                <input
                  type="text"
                  required
                  value={editPeriodEnd}
                  onChange={(e) => setEditPeriodEnd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={editPeriodIsPaused}
                  onChange={(e) => setEditPeriodIsPaused(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    تعيين كفترة موقوفة مؤقتاً (استراحة)
                  </span>
                  <span className="text-[11px] text-amber-700">
                    ستظهر الخانات تحت هذه الفترة كاستراحة معطلة للمحاضرات لجميع الطلاب والأساتذة.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditPeriodModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-xs"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODAL: MANAGE DAYS (ROWS) DIALOG                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Dialog
          isOpen={manageDaysModal}
          onClose={() => setManageDaysModal(false)}
          title="تخصيص أيام الجدول الأسبوعي (الصفوف)"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              اختر الأيام الفعالة في الجدول الأسبوعي. يمكنك تفعيل يوم السبت أو إخفاء يوم الخميس حسب التقويم الجامعي.
            </p>

            <div className="space-y-2">
              {ALL_WEEKDAYS.map((day) => {
                const isChecked = activeDayKeys.includes(day.key);
                return (
                  <label
                    key={day.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? "bg-emerald-50/50 border-emerald-200 text-slate-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <span>{day.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleDay(day.key)}
                      className="w-4 h-4 text-[#14352c] rounded focus:ring-[#14352c]"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setManageDaysModal(false)}
                className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-xs"
              >
                تم
              </button>
            </div>
          </div>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODAL: ADD / EDIT LECTURE SLOT                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Dialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSlot ? "تعديل تفاصيل المحاضرة" : "إضافة محاضرة جديدة للجدول"}
        >
          <form onSubmit={handleModalSubmit} className="space-y-4">
            {/* Day and Period Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اليوم الدراسي:
                </label>
                <select
                  value={modalDay}
                  onChange={(e) => setModalDay(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold"
                >
                  {activeDaysList.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الفترة الزمنية:
                </label>
                <select
                  value={modalPeriodNumber}
                  onChange={(e) => setModalPeriodNumber(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold"
                >
                  {periods.map((p) => (
                    <option key={p.periodNumber} value={p.periodNumber} disabled={p.isPaused}>
                      الفترة {p.periodNumber} ({p.headerTime}) {p.isPaused ? "— موقوفة" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المادة الدراسية للمرحلة {selectedStage}:
              </label>
              {courseSelectOptions.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  لا توجد مواد مسجلة للمرحلة {selectedStage}. يرجى إضافة مقررات دراسية من لوحة المواد أولاً.
                </div>
              ) : (
                <CustomSelect
                  options={courseSelectOptions}
                  value={modalCourseId}
                  onChange={setModalCourseId}
                  className="w-full"
                  theme="light"
                />
              )}
            </div>

            {/* Doctor Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                أستاذ المادة (التدريسي):
              </label>
              <CustomSelect
                options={doctorSelectOptions}
                value={modalDoctorId}
                onChange={setModalDoctorId}
                className="w-full"
                theme="light"
              />
            </div>

            {/* Room & Building */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم القاعة:
                </label>
                <input
                  type="text"
                  required
                  value={modalRoom}
                  onChange={(e) => setModalRoom(e.target.value)}
                  placeholder="مثال: قاعة 302"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المبنى / القسم:
                </label>
                <input
                  type="text"
                  required
                  value={modalBuilding}
                  onChange={(e) => setModalBuilding(e.target.value)}
                  placeholder="مثال: قسم هندسة الحاسوب"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-medium"
                />
              </div>
            </div>

            {/* Target Section info */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-950 font-medium">
              <span>الشعبة المستهدفة:</span>
              <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                المرحلة {selectedStage} (شعبة {selectedSectionNumber})
              </span>
            </div>

            {!editingSlot && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={modalAutoEnroll}
                  onChange={(e) => setModalAutoEnroll(e.target.checked)}
                  className="w-4 h-4 text-[#14352c] rounded focus:ring-[#14352c]"
                />
                <span>مزامنة وتسجيل جميع طلبة المرحلة {selectedStage} في الشعبة فوراً</span>
              </label>
            )}

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || courseSelectOptions.length === 0}
                className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                )}
                {editingSlot ? "حفظ التعديلات" : "تثبيت في الجدول"}
              </button>
            </div>
          </form>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* DELETE CONFIRMATION DIALOG                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Dialog
          isOpen={!!deleteConfirmSlot}
          onClose={() => setDeleteConfirmSlot(null)}
          title="تأكيد حذف المحاضرة من الجدول"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف درس{" "}
              <strong className="text-slate-900">
                {deleteConfirmSlot?.section?.course?.name || "المحاضرة"}
              </strong>{" "}
              المقرر يوم {deleteConfirmSlot?.dayOfWeek}؟ سيتم تفريغ القاعة وحذفها من جداول الطلاب والأساتذة فوراً.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmSlot(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleDeleteSlot}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </Dialog>
      </main>
    </div>
  );
}
