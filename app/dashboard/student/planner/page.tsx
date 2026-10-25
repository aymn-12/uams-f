"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import Navbar from '@/components/Navbar';
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import ClickDatePicker from "@/components/ClickDatePicker";
import {
  CalendarDays,
  Plus,
  X,
  Clock,
  MapPin,
  RefreshCw,
  Bell,
  BellOff,
  User as UserIcon,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pencil,
  Trash2,
  FileText,
  RotateCcw,
  LayoutGrid,
  ListFilter,
  Sparkles,
  ShieldAlert,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  Paperclip,
  File,
  Download,
  Calendar,
} from "lucide-react";

export interface NotebookData {
  currentPage?: string;
  exams?: Array<{ id: string; title: string; date?: string; completed?: boolean }>;
  quizzes?: Array<{ id: string; title: string; date?: string; completed?: boolean }>;
  assignments?: Array<{ id: string; title: string; date?: string; completed?: boolean }>;
  reports?: Array<{ id: string; title: string; page?: string; completed?: boolean }>;
  notesList?: Array<{ id: string; text: string; createdAt?: string }>;
  files?: Array<{ id: string; name: string; url?: string; size?: string; uploadedAt?: string }>;
}

interface PlannerItem {
  _id: string;
  subjectName: string;
  dayOfWeek: string;
  startTime: string;
  endTime?: string;
  room?: string;
  doctorName?: string;
  color?: "emerald" | "blue" | "purple" | "amber" | "rose" | "indigo";
  notes?: string;
  notebook?: NotebookData;
  notificationsEnabled?: boolean;
  reminderMinutesBefore?: number;
  attendanceCount: number;
  absenceCount: number;
  maxAllowedAbsences: number;
}

const WEEKDAYS = [
  { key: "SUNDAY", label: "الأحد" },
  { key: "MONDAY", label: "الاثنين" },
  { key: "TUESDAY", label: "الثلاثاء" },
  { key: "WEDNESDAY", label: "الأربعاء" },
  { key: "THURSDAY", label: "الخميس" },
];

const dayOptions: SelectOption[] = [
  { value: "SUNDAY", label: "الأحد" },
  { value: "MONDAY", label: "الاثنين" },
  { value: "TUESDAY", label: "الثلاثاء" },
  { value: "WEDNESDAY", label: "الأربعاء" },
  { value: "THURSDAY", label: "الخميس" },
];

const reminderOptions: SelectOption[] = [
  { value: "10", label: "قبل 10 دقائق" },
  { value: "15", label: "قبل 15 دقيقة (افتراضي)" },
  { value: "30", label: "قبل 30 دقيقة" },
  { value: "60", label: "قبل ساعة كاملة" },
];

const colorClasses: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  emerald: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    text: "text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  blue: {
    border: "border-blue-200",
    bg: "bg-blue-50/50",
    text: "text-blue-950",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  purple: {
    border: "border-purple-200",
    bg: "bg-purple-50/50",
    text: "text-purple-950",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
  amber: {
    border: "border-amber-200",
    bg: "bg-amber-50/50",
    text: "text-amber-950",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  rose: {
    border: "border-rose-200",
    bg: "bg-rose-50/50",
    text: "text-rose-950",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
  },
  indigo: {
    border: "border-indigo-200",
    bg: "bg-indigo-50/50",
    text: "text-indigo-950",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
};

const COLOR_OPTIONS: {
  id: NonNullable<PlannerItem["color"]>;
  label: string;
  dot: string;
  activeBg: string;
  activeText: string;
  border: string;
  ring: string;
}[] = [
  { id: "emerald", label: "زمردي", dot: "bg-emerald-500", activeBg: "bg-emerald-50", activeText: "text-emerald-900", border: "border-emerald-300", ring: "ring-emerald-400" },
  { id: "blue", label: "أزرق", dot: "bg-blue-500", activeBg: "bg-blue-50", activeText: "text-blue-900", border: "border-blue-300", ring: "ring-blue-400" },
  { id: "purple", label: "بنفسجي", dot: "bg-purple-500", activeBg: "bg-purple-50", activeText: "text-purple-900", border: "border-purple-300", ring: "ring-purple-400" },
  { id: "amber", label: "كهرماني", dot: "bg-amber-500", activeBg: "bg-amber-50", activeText: "text-amber-900", border: "border-amber-300", ring: "ring-amber-400" },
  { id: "rose", label: "وردي", dot: "bg-rose-500", activeBg: "bg-rose-50", activeText: "text-rose-900", border: "border-rose-300", ring: "ring-rose-400" },
  { id: "indigo", label: "نيلي", dot: "bg-indigo-500", activeBg: "bg-indigo-50", activeText: "text-indigo-900", border: "border-indigo-300", ring: "ring-indigo-400" },
];

export default function StudentPlannerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "grid">("cards");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");

  // Modal State
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Notebook Hub View State (Double-Click Triggered)
  const [activeNotebookItem, setActiveNotebookItem] = useState<PlannerItem | null>(null);

  // Notebook Section Inputs
  const [nbPageInput, setNbPageInput] = useState("");
  const [nbExamTitle, setNbExamTitle] = useState("");
  const [nbExamDate, setNbExamDate] = useState("");
  const [nbQuizTitle, setNbQuizTitle] = useState("");
  const [nbQuizDate, setNbQuizDate] = useState("");
  const [nbAssignmentTitle, setNbAssignmentTitle] = useState("");
  const [nbAssignmentDate, setNbAssignmentDate] = useState("");
  const [nbReportTitle, setNbReportTitle] = useState("");
  const [nbReportPage, setNbReportPage] = useState("");
  const [nbNoteText, setNbNoteText] = useState("");

  // Form Fields
  const [subjectName, setSubjectName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("SUNDAY");
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [color, setColor] = useState<PlannerItem["color"]>("emerald");
  const [notes, setNotes] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("15");
  const [maxAllowedAbsences, setMaxAllowedAbsences] = useState(4);

  // Status feedback dialog
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "STUDENT") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Cache hydration
    const cached = smartCache.get<PlannerItem[]>("/student/planner");
    if (cached?.data && Array.isArray(cached.data)) {
      setItems(cached.data);
      setLoading(false);
    }

    loadPlanner();
  }, [router]);

  // Lock body scroll and handle Escape key for item modal
  useEffect(() => {
    if (!itemModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setItemModal(false);
        setEditingItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [itemModal]);

  const loadPlanner = async () => {
    setFetching(true);
    try {
      const res = await apiFetch("/student/planner");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setItems(list);
      smartCache.set("/student/planner", list);
    } catch {
      // Keep cached if available
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setSubjectName("");
    setDayOfWeek("SUNDAY");
    setStartTime("08:30");
    setEndTime("10:00");
    setRoom("");
    setDoctorName("");
    setColor("emerald");
    setNotes("");
    setNotificationsEnabled(true);
    setReminderMinutesBefore("15");
    setMaxAllowedAbsences(4);
    setItemModal(true);
  };

  const handleOpenEdit = (item: PlannerItem) => {
    setEditingItem(item);
    setSubjectName(item.subjectName);
    setDayOfWeek(item.dayOfWeek);
    setStartTime(item.startTime);
    setEndTime(item.endTime || "");
    setRoom(item.room || "");
    setDoctorName(item.doctorName || "");
    setColor(item.color || "emerald");
    setNotes(item.notes || "");
    setNotificationsEnabled(item.notificationsEnabled !== false);
    setReminderMinutesBefore(String(item.reminderMinutesBefore || 15));
    setMaxAllowedAbsences(item.maxAllowedAbsences || 4);
    setItemModal(true);
  };

  const handleOpenNotebook = (item: PlannerItem) => {
    setActiveNotebookItem(item);
    setNbPageInput(item.notebook?.currentPage || "");
    setNbExamTitle("");
    setNbExamDate("");
    setNbQuizTitle("");
    setNbQuizDate("");
    setNbAssignmentTitle("");
    setNbAssignmentDate("");
    setNbReportTitle("");
    setNbReportPage("");
    setNbNoteText("");
  };

  const updateNotebookData = async (updatedNotebook: NotebookData) => {
    if (!activeNotebookItem) return;

    const updatedItem = {
      ...activeNotebookItem,
      notebook: updatedNotebook,
    };
    setActiveNotebookItem(updatedItem);
    setItems((prev) =>
      prev.map((i) => (i._id === activeNotebookItem._id ? updatedItem : i))
    );

    try {
      await apiFetch(`/student/planner/${activeNotebookItem._id}`, {
        method: "PUT",
        body: JSON.stringify({ notebook: updatedNotebook }),
      });
      smartCache.invalidate("/student/planner");
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في المزامنة",
        message: err.message || "تعذر حفظ تعديلات الدفتر.",
        type: "danger",
      });
    }
  };

  // 1. Update Page
  const handleUpdatePage = () => {
    if (!nbPageInput.trim() || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const updated = {
      ...current,
      currentPage: nbPageInput.trim(),
    };
    updateNotebookData(updated);
  };

  const handleStepPage = (delta: number) => {
    if (!activeNotebookItem) return;
    const cur = parseInt(activeNotebookItem.notebook?.currentPage || nbPageInput || "0", 10);
    const nextVal = Math.max(1, (isNaN(cur) ? 0 : cur) + delta);
    setNbPageInput(String(nextVal));
    const current = activeNotebookItem.notebook || {};
    updateNotebookData({ ...current, currentPage: String(nextVal) });
  };

  // 2. Exams Handlers
  const handleAddExam = () => {
    if (!nbExamTitle.trim() || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const exams = current.exams || [];
    const updated = {
      ...current,
      exams: [
        ...exams,
        {
          id: Math.random().toString(36).substring(2, 9),
          title: nbExamTitle.trim(),
          date: nbExamDate,
          completed: false,
        },
      ],
    };
    setNbExamTitle("");
    setNbExamDate("");
    updateNotebookData(updated);
  };

  const handleToggleExam = (examId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const exams = (current.exams || []).map((e) =>
      e.id === examId ? { ...e, completed: !e.completed } : e
    );
    updateNotebookData({ ...current, exams });
  };

  const handleDeleteExam = (examId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const exams = (current.exams || []).filter((e) => e.id !== examId);
    updateNotebookData({ ...current, exams });
  };

  // 3. Quizzes Handlers
  const handleAddQuiz = () => {
    if (!nbQuizTitle.trim() || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const quizzes = current.quizzes || [];
    const updated = {
      ...current,
      quizzes: [
        ...quizzes,
        {
          id: Math.random().toString(36).substring(2, 9),
          title: nbQuizTitle.trim(),
          date: nbQuizDate,
          completed: false,
        },
      ],
    };
    setNbQuizTitle("");
    setNbQuizDate("");
    updateNotebookData(updated);
  };

  const handleToggleQuiz = (quizId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const quizzes = (current.quizzes || []).map((q) =>
      q.id === quizId ? { ...q, completed: !q.completed } : q
    );
    updateNotebookData({ ...current, quizzes });
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const quizzes = (current.quizzes || []).filter((q) => q.id !== quizId);
    updateNotebookData({ ...current, quizzes });
  };

  // 4. Assignments Handlers
  const handleAddAssignment = () => {
    if (!nbAssignmentTitle.trim() || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const assignments = current.assignments || [];
    const updated = {
      ...current,
      assignments: [
        ...assignments,
        {
          id: Math.random().toString(36).substring(2, 9),
          title: nbAssignmentTitle.trim(),
          date: nbAssignmentDate,
          completed: false,
        },
      ],
    };
    setNbAssignmentTitle("");
    setNbAssignmentDate("");
    updateNotebookData(updated);
  };

  const handleToggleAssignment = (assignmentId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const assignments = (current.assignments || []).map((a) =>
      a.id === assignmentId ? { ...a, completed: !a.completed } : a
    );
    updateNotebookData({ ...current, assignments });
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const assignments = (current.assignments || []).filter((a) => a.id !== assignmentId);
    updateNotebookData({ ...current, assignments });
  };

  // 5. Reports Handlers
  const handleAddReport = () => {
    if (!nbReportTitle.trim() || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const reports = current.reports || [];
    const updated = {
      ...current,
      reports: [
        ...reports,
        {
          id: Math.random().toString(36).substring(2, 9),
          title: nbReportTitle.trim(),
          page: nbReportPage.trim(),
          completed: false,
        },
      ],
    };
    setNbReportTitle("");
    setNbReportPage("");
    updateNotebookData(updated);
  };

  const handleToggleReport = (reportId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const reports = (current.reports || []).map((r) =>
      r.id === reportId ? { ...r, completed: !r.completed } : r
    );
    updateNotebookData({ ...current, reports });
  };

  const handleDeleteReport = (reportId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const reports = (current.reports || []).filter((r) => r.id !== reportId);
    updateNotebookData({ ...current, reports });
  };

  // 6. Notes Handlers
  const handleAddNote = () => {
    if (!nbNoteText.trim() || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const notesList = current.notesList || [];
    const updated = {
      ...current,
      notesList: [
        {
          id: Math.random().toString(36).substring(2, 9),
          text: nbNoteText.trim(),
          createdAt: new Date().toISOString(),
        },
        ...notesList,
      ],
    };
    setNbNoteText("");
    updateNotebookData(updated);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const notesList = (current.notesList || []).filter((n) => n.id !== noteId);
    updateNotebookData({ ...current, notesList });
  };

  // 7. Files Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const existingFiles = current.files || [];

    const newUploadedFiles = [...existingFiles];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiFetch("/assignments/upload", {
          method: "POST",
          body: formData,
        });

        const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
        const serverFileUrl = res?.data?.fileUrl
          ? (res.data.fileUrl.startsWith("http") ? res.data.fileUrl : `${apiBase}${res.data.fileUrl}`)
          : "";

        newUploadedFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
          url: serverFileUrl,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        setDialog({
          isOpen: true,
          title: "فشل رفع الملف",
          message: err.message || `تعذر رفع الملف ${file.name}.`,
          type: "danger",
        });
      }
    }

    if (newUploadedFiles.length > existingFiles.length) {
      updateNotebookData({ ...current, files: newUploadedFiles });
    }

    e.target.value = "";
  };

  const handleDeleteFile = (fileId: string) => {
    if (!activeNotebookItem) return;
    const current = activeNotebookItem.notebook || {};
    const files = (current.files || []).filter((f) => f.id !== fileId);
    updateNotebookData({ ...current, files });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    setSubmitting(true);

    const payload = {
      subjectName: subjectName.trim(),
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim(),
      doctorName: doctorName.trim(),
      color,
      notes: notes.trim(),
      notificationsEnabled,
      reminderMinutesBefore: Number(reminderMinutesBefore) || 15,
      maxAllowedAbsences: Number(maxAllowedAbsences) || 4,
    };

    try {
      if (editingItem) {
        await apiFetch(`/student/planner/${editingItem._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setDialog({
          isOpen: true,
          title: "تم تحديث المادة بنجاح",
          message: "تم حفظ التعديلات على وقت المادة وملاحظاتها ونظام التنبيه.",
          type: "success",
        });
      } else {
        await apiFetch("/student/planner", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setDialog({
          isOpen: true,
          title: "تمت إضافة المادة بنجاح",
          message: "أضيفت المادة إلى جدولك ومخططك الذاتي مع تفعيل التنبيهات واحتساب الغياب.",
          type: "success",
        });
      }

      smartCache.invalidate("/student/planner");
      setItemModal(false);
      setEditingItem(null);
      loadPlanner();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في حفظ المادة",
        message: err.message || "تعذر حفظ بيانات المادة في المخطط.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/student/planner/${deleteConfirmId}`, {
        method: "DELETE",
      });
      smartCache.invalidate("/student/planner");
      setDeleteConfirmId(null);
      setDialog({
        isOpen: true,
        title: "تم حذف المادة",
        message: "تمت إزالة المادة من جدولك ومخططك الذاتي بنجاح.",
        type: "success",
      });
      loadPlanner();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "تعذر حذف المادة",
        message: err.message || "حدث خطأ أثناء محاولة الحذف.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttendanceAction = async (itemId: string, action: "ATTEND" | "ABSENT" | "RESET") => {
    setActionLoadingId(itemId);
    try {
      await apiFetch(`/student/planner/${itemId}/attendance`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      smartCache.invalidate("/student/planner");
      await loadPlanner();
    } catch {
      // ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics calculation
  const totalSubjects = items.length;
  const activeAlertsCount = items.filter((i) => i.notificationsEnabled).length;
  const totalAttended = items.reduce((acc, i) => acc + (i.attendanceCount || 0), 0);
  const totalAbsences = items.reduce((acc, i) => acc + (i.absenceCount || 0), 0);
  const totalSessions = totalAttended + totalAbsences;
  const overallSelfRate =
    totalSessions > 0 ? `${Math.round((totalAttended / totalSessions) * 100)}%` : "100%";

  const atRiskItems = items.filter(
    (i) => i.absenceCount >= Math.max(1, (i.maxAllowedAbsences || 4) - 1)
  );

  const filteredItems = useMemo(() => {
    if (selectedDayFilter === "ALL") return items;
    return items.filter((i) => i.dayOfWeek === selectedDayFilter);
  }, [items, selectedDayFilter]);

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {activeNotebookItem ? (
          /* ═══════════════════════════════════════════════════════════ */
          /* NOTEBOOK HUB SCREEN (MATCHES USER DESIGN SPECIFICATION)     */
          /* ═══════════════════════════════════════════════════════════ */
          <div className="space-y-6 animate-fade-in">
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Link href="/dashboard/student" className="hover:text-[#14352c] transition">
                  بوابة الطالب
                </Link>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => setActiveNotebookItem(null)}
                  className="hover:text-[#14352c] transition cursor-pointer font-medium"
                >
                  المخطط الدراسي
                </button>
                <span>/</span>
                <span className="text-[#0284c7] font-bold">دفتر متابعة المقرر</span>
              </div>
            </div>

            {/* Header Bar matching Reference Design with RTL layout */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Right Course Info (Appears on the RIGHT in RTL) */}
              <div className="text-right space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#0284c7] font-mono font-bold text-xs bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200/70">
                    132425456
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {WEEKDAYS.find((d) => d.key === activeNotebookItem.dayOfWeek)?.label || activeNotebookItem.dayOfWeek}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {activeNotebookItem.subjectName}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                  {activeNotebookItem.doctorName && (
                    <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <span>👨‍🏫</span>
                      <span>{activeNotebookItem.doctorName}</span>
                    </span>
                  )}
                  {activeNotebookItem.room && (
                    <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <span>📍</span>
                      <span>{activeNotebookItem.room}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-mono bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    <span>🕒</span>
                    <span>{activeNotebookItem.startTime} {activeNotebookItem.endTime ? `- ${activeNotebookItem.endTime}` : ""}</span>
                  </span>
                </div>

                {/* Course Cockpit Quick Stats */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-sky-50 text-[#0284c7] border border-sky-200/70">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>صفحة {activeNotebookItem.notebook?.currentPage || "—"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                    <span>{(activeNotebookItem.notebook?.assignments || []).length} واجبات</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200/70">
                    <span>{(activeNotebookItem.notebook?.quizzes || []).length} كوزات</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/70">
                    <span>{(activeNotebookItem.notebook?.exams || []).length} امتحانات</span>
                  </span>
                </div>
              </div>

              {/* Left Action Buttons (Appears on the LEFT in RTL) */}
              <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveNotebookItem(null)}
                  className="px-3.5 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center gap-2 font-bold text-xs shadow-xs transition-all cursor-pointer"
                  title="العودة للمخطط الدراسي"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>العودة للمخطط</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(activeNotebookItem)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                  title="تعديل بيانات المقرر"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2-Column Grid matching Reference Cards with True RTL Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Row 1, Column 1: الامتحانات 📝 */}
              <div className="bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">
                      الامتحانات 📝
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      ({(activeNotebookItem.notebook?.exams || []).length})
                    </span>
                  </div>
                  {(activeNotebookItem.notebook?.exams || []).some((e) => e.completed) && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium">
                      مكتمل: {(activeNotebookItem.notebook?.exams || []).filter((e) => e.completed).length}
                    </span>
                  )}
                </div>

                {/* Input row: Input on RIGHT, Date in MIDDLE, Button on LEFT */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nbExamTitle}
                    onChange={(e) => setNbExamTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddExam()}
                    placeholder="اسم الامتحان"
                    className="flex-1 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none text-right font-medium shadow-2xs transition-all"
                  />
                  <ClickDatePicker
                    value={nbExamDate}
                    onChange={setNbExamDate}
                    placeholder="تاريخ الامتحان"
                    className="w-36 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleAddExam}
                    className="w-10 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-xs transition-all cursor-pointer shrink-0"
                    title="إضافة امتحان"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                  {(activeNotebookItem.notebook?.exams || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                      لا توجد امتحانات مضافة حتى الآن
                    </p>
                  ) : (
                    (activeNotebookItem.notebook?.exams || []).map((exam) => (
                      <div
                        key={exam.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleExam(exam.id)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              exam.completed
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                : "border-slate-300 hover:border-[#0284c7] bg-slate-50"
                            }`}
                          >
                            {exam.completed && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <span className={`font-semibold truncate ${exam.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {exam.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {exam.date && (
                            <span className="text-[11px] font-mono text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-100 font-medium">
                              {exam.date}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 1, Column 2: إلى أي صفحة وصلنا 📖 */}
              <div className="bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">
                      إلى أي صفحة وصلنا 📖
                    </span>
                  </div>
                  {activeNotebookItem.notebook?.currentPage && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                      صفحة: {activeNotebookItem.notebook.currentPage}
                    </span>
                  )}
                </div>

                {/* Input row: Input on RIGHT, Stepper in MIDDLE, Button on LEFT */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nbPageInput}
                    onChange={(e) => setNbPageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdatePage()}
                    placeholder="رقم الصفحة..."
                    className="flex-1 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none text-right font-bold shadow-2xs transition-all"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStepPage(-1)}
                      className="w-9 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="صفحة سابقة (-1)"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepPage(1)}
                      className="w-9 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="صفحة تالية (+1)"
                    >
                      +1
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdatePage}
                    className="px-5 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    تحديث
                  </button>
                </div>

                <div className="pt-2 text-center">
                  {activeNotebookItem.notebook?.currentPage ? (
                    <div className="p-3.5 bg-white rounded-2xl border border-sky-100 shadow-2xs text-xs font-bold text-slate-800 flex items-center justify-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="text-slate-600">آخر صفحة وصل إليها التدريسي:</span>
                      <span className="text-base text-[#0284c7] font-mono font-black bg-sky-50 px-3 py-0.5 rounded-lg border border-sky-200/60">
                        {activeNotebookItem.notebook.currentPage}
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-white/60 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      لم يُحدد رقم الصفحة بعد — اكتب رقم الصفحة واضغط تحديث
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2, Column 1: الواجبات 📋 */}
              <div className="bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">
                      الواجبات 📋
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      ({(activeNotebookItem.notebook?.assignments || []).length})
                    </span>
                  </div>
                  {(activeNotebookItem.notebook?.assignments || []).some((a) => a.completed) && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium">
                      مكتمل: {(activeNotebookItem.notebook?.assignments || []).filter((a) => a.completed).length}
                    </span>
                  )}
                </div>

                {/* Input row: Input on RIGHT, Date in MIDDLE, Button on LEFT */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nbAssignmentTitle}
                    onChange={(e) => setNbAssignmentTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAssignment()}
                    placeholder="عنوان الواجب"
                    className="flex-1 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none text-right font-medium shadow-2xs transition-all"
                  />
                  <ClickDatePicker
                    value={nbAssignmentDate}
                    onChange={setNbAssignmentDate}
                    placeholder="تاريخ الواجب"
                    className="w-36 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleAddAssignment}
                    className="w-10 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-xs transition-all cursor-pointer shrink-0"
                    title="إضافة واجب"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                  {(activeNotebookItem.notebook?.assignments || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                      لا توجد واجبات مسجلة
                    </p>
                  ) : (
                    (activeNotebookItem.notebook?.assignments || []).map((asg) => (
                      <div
                        key={asg.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAssignment(asg.id)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              asg.completed
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                : "border-slate-300 hover:border-[#0284c7] bg-slate-50"
                            }`}
                          >
                            {asg.completed && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <span className={`font-semibold truncate ${asg.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {asg.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {asg.date && (
                            <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 font-medium">
                              {asg.date}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(asg.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 2, Column 2: الكوزات ❓ */}
              <div className="bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">
                      الكوزات ❓
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      ({(activeNotebookItem.notebook?.quizzes || []).length})
                    </span>
                  </div>
                  {(activeNotebookItem.notebook?.quizzes || []).some((q) => q.completed) && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium">
                      مكتمل: {(activeNotebookItem.notebook?.quizzes || []).filter((q) => q.completed).length}
                    </span>
                  )}
                </div>

                {/* Input row: Input on RIGHT, Date in MIDDLE, Button on LEFT */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nbQuizTitle}
                    onChange={(e) => setNbQuizTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddQuiz()}
                    placeholder="عنوان الكوز"
                    className="flex-1 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none text-right font-medium shadow-2xs transition-all"
                  />
                  <ClickDatePicker
                    value={nbQuizDate}
                    onChange={setNbQuizDate}
                    placeholder="تاريخ الكوز"
                    className="w-36 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuiz}
                    className="w-10 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-xs transition-all cursor-pointer shrink-0"
                    title="إضافة كوز"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                  {(activeNotebookItem.notebook?.quizzes || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                      لا توجد كوزات مسجلة
                    </p>
                  ) : (
                    (activeNotebookItem.notebook?.quizzes || []).map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleQuiz(quiz.id)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              quiz.completed
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                : "border-slate-300 hover:border-[#0284c7] bg-slate-50"
                            }`}
                          >
                            {quiz.completed && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <span className={`font-semibold truncate ${quiz.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {quiz.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {quiz.date && (
                            <span className="text-[11px] font-mono text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200 font-medium">
                              {quiz.date}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 3, Column 1: ملاحظاتي 💡 */}
              <div className="bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">
                      ملاحظاتي 💡
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      ({(activeNotebookItem.notebook?.notesList || []).length})
                    </span>
                  </div>
                </div>

                {/* Input row: Input on RIGHT, Button on LEFT */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nbNoteText}
                    onChange={(e) => setNbNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    placeholder="ملاحظة أو سؤال..."
                    className="flex-1 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none text-right font-medium shadow-2xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="w-10 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-xs transition-all cursor-pointer shrink-0"
                    title="إضافة ملاحظة"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                  {(activeNotebookItem.notebook?.notesList || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                      لا توجد ملاحظات مسجلة
                    </p>
                  ) : (
                    (activeNotebookItem.notebook?.notesList || []).map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 flex items-start justify-between gap-2.5 text-xs shadow-2xs transition-all"
                      >
                        <p className="text-slate-800 flex-1 leading-relaxed whitespace-pre-wrap font-medium">{note.text}</p>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="حذف الملاحظة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 3, Column 2: التقارير 📑 */}
              <div className="bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">
                      التقارير 📑
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      ({(activeNotebookItem.notebook?.reports || []).length})
                    </span>
                  </div>
                  {(activeNotebookItem.notebook?.reports || []).some((r) => r.completed) && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium">
                      مكتمل: {(activeNotebookItem.notebook?.reports || []).filter((r) => r.completed).length}
                    </span>
                  )}
                </div>

                {/* Input row: Input on RIGHT, Page in MIDDLE, Button on LEFT */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nbReportTitle}
                    onChange={(e) => setNbReportTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddReport()}
                    placeholder="اسم التقرير"
                    className="flex-1 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none text-right font-medium shadow-2xs transition-all"
                  />
                  <input
                    type="text"
                    value={nbReportPage}
                    onChange={(e) => setNbReportPage(e.target.value)}
                    placeholder="صفحة"
                    className="w-20 bg-white border border-slate-200 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 rounded-xl px-2 py-2.5 text-xs text-slate-700 outline-none shadow-2xs transition-all shrink-0 text-center font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddReport}
                    className="w-10 h-10 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-xs transition-all cursor-pointer shrink-0"
                    title="إضافة تقرير"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                  {(activeNotebookItem.notebook?.reports || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                      لا توجد تقارير مسجلة
                    </p>
                  ) : (
                    (activeNotebookItem.notebook?.reports || []).map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleReport(rep.id)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              rep.completed
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                : "border-slate-300 hover:border-[#0284c7] bg-slate-50"
                            }`}
                          >
                            {rep.completed && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <span className={`font-semibold truncate ${rep.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {rep.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {rep.page && (
                            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-medium">
                              صفحة {rep.page}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(rep.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 4: ملفاتي (رفع وتلوين) 📁 (Full Width) */}
              <div className="lg:col-span-2 bg-[#f8fafc] rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-800">
                      ملفاتي (رفع وتلوين) 📁
                    </span>
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {(activeNotebookItem.notebook?.files || []).length} ملفات
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    يدعم المستندات والصور (PDF, Word, الصور)
                  </span>
                </div>

                <input
                  type="file"
                  id="nb-file-input"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <label
                  htmlFor="nb-file-input"
                  className="w-full py-5 border-2 border-dashed border-sky-300 hover:border-[#0284c7] bg-white hover:bg-sky-50/40 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2.5 text-xs font-bold text-[#0284c7] transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                    <Upload className="w-4 h-4 text-[#0284c7]" />
                  </div>
                  <span>انقر لرفع ملف أو صورة من جهازك</span>
                  <span className="text-[11px] font-normal text-slate-400 sm:mr-2">أو اسحب الملفات إلى هنا</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {(activeNotebookItem.notebook?.files || []).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                      لا توجد ملفات مرفقة لهذا المقرر حتى الآن
                    </div>
                  ) : (
                    (activeNotebookItem.notebook?.files || []).map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 flex items-center justify-between gap-2.5 text-xs shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center shrink-0">
                            <File className="w-4 h-4" />
                          </div>
                          <div className="truncate text-right">
                            <p className="font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">{file.size}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {file.url && (
                            <a
                              href={file.url}
                              download={file.name}
                              className="p-1.5 text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="تحميل الملف"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الملف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>          </div>
        ) : (
          <>
            {/* Navigation Breadcrumb & Header */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/dashboard/student" className="hover:text-[#14352c] transition">
                بوابة الطالب
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">المخطط الدراسي والجدول الذاتي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-[#14352c]" />
              جدولي الذاتي ومتابعة المقررات
            </h1>
            <p className="text-xs text-slate-600">
              مكانك الخاص لإضافة موادك الدراسية، جدولة أوقاتها، تدوين الملاحظات، وتتبع حضورك وغيابك بحرية كاملة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
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
                بطاقات المتابعة
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "grid"
                    ? "bg-[#14352c] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                الجدول الأسبوعي
              </button>
            </div>

            {/* Central Schedule Link */}
            <Link
              href="/dashboard/student/schedule"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              title="عرض الجدول المركزي الصادر من مقررية القسم"
            >
              <CalendarDays className="w-4 h-4 text-slate-600" />
              الجدول المركزي
            </Link>

            {/* Add Subject Button */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة مادة لجدولي
            </button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#14352c]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">المواد المضافة ذاتياً</p>
              <p className="text-xs font-bold text-slate-900">{totalSubjects} مقررات شخصية</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">نسبة الالتزام الذاتي</p>
              <p className="text-xs font-bold text-slate-900">{overallSelfRate}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">التنبيهات المجدولة</p>
              <p className="text-xs font-bold text-slate-900">{activeAlertsCount} تنبيهات مفعلة</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                atRiskItems.length > 0
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">إنذارات الغياب</p>
              <p
                className={`text-xs font-bold ${
                  atRiskItems.length > 0 ? "text-amber-800" : "text-emerald-700"
                }`}
              >
                {atRiskItems.length > 0 ? `${atRiskItems.length} مواد في دائرة الخطر` : "لا يوجد خطر حرمان"}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner if any subject reached absence limit */}
        {atRiskItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">تنبيه الغيابات الذاتي:</p>
              <p className="text-amber-800">
                لديك مواد قاربت أو بلغت الحد الأقصى للغيابات المسموحة:{" "}
                <span className="font-semibold underline">
                  {atRiskItems.map((i) => `${i.subjectName} (${i.absenceCount}/${i.maxAllowedAbsences})`).join("، ")}
                </span>
                . احرص على حضور المحاضرات القادمة لتفادي الحرمان الأكاديمي.
              </p>
            </div>
          </div>
        )}

        {/* Filter by Day */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedDayFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedDayFilter === "ALL"
                  ? "bg-[#14352c] text-white"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              كافة الأيام ({items.length})
            </button>
            {WEEKDAYS.map((d) => {
              const dayCount = items.filter((i) => i.dayOfWeek === d.key).length;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDayFilter(d.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedDayFilter === d.key
                      ? "bg-[#14352c] text-white"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  {d.label} ({dayCount})
                </button>
              );
            })}
          </div>

          {fetching && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#14352c]" />
              مزامنة...
            </span>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* VIEW MODE 1: SUBJECT CARDS WITH ATTENDANCE COUNTERS         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === "cards" && (
          <div>
            {filteredItems.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">لا توجد مواد مضافة في هذا اليوم</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  اضغط على زر "إضافة مادة لجدولي" لتحديد اسم المادة، توقيتها، تدوين ملاحظاتك وتفعيل نظام الإشعارات.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm mt-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مادة الآن
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredItems.map((item) => {
                  const style = colorClasses[item.color || "emerald"] || colorClasses.emerald;
                  const dayObj = WEEKDAYS.find((d) => d.key === item.dayOfWeek);
                  const isOverLimit = item.absenceCount >= item.maxAllowedAbsences;
                  const isNearLimit = item.absenceCount === item.maxAllowedAbsences - 1;

                  return (
                    <div
                      key={item._id}
                      onDoubleClick={() => handleOpenNotebook(item)}
                      className={`bg-white rounded-2xl border ${style.border} p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition cursor-pointer select-none group`}
                      title="انقر نقراً مزدوجاً (Double Click) لفتح دفتر الملاحظات لهذا المقرر"
                    >
                      {/* Card Header: Subject Name, Day Tag & Actions */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${style.badge}`}>
                              {dayObj?.label || item.dayOfWeek}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight pt-1">
                              {item.subjectName}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenNotebook(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#14352c] hover:bg-slate-100 transition cursor-pointer"
                              title="فتح دفتر الملاحظات (أو انقر نقراً مزدوجاً على البطاقة)"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#14352c] hover:bg-slate-100 transition cursor-pointer"
                              title="تعديل المادة"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item._id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="حذف المادة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Timing, Room & Doctor */}
                        <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                            <Clock className="w-4 h-4 text-[#14352c]" />
                            <span>
                              {item.startTime} {item.endTime ? `- ${item.endTime}` : ""}
                            </span>
                          </div>

                          {item.room && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>القاعة / المكان: <strong>{item.room}</strong></span>
                            </div>
                          )}

                          {item.doctorName && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>الأستاذ / المشرف: <strong>{item.doctorName}</strong></span>
                            </div>
                          )}

                          {/* Notification Status */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                            {item.notificationsEnabled ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                                <Bell className="w-3 h-3 text-emerald-600" />
                                تنبيه مفعل قبل {item.reminderMinutesBefore || 15} دقيقة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <BellOff className="w-3 h-3" />
                                التنبيهات معطلة
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Personal Notes Box / Notebook Trigger */}
                        {item.notes ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNotebook(item);
                            }}
                            className="p-3 bg-amber-50/50 hover:bg-amber-100/50 rounded-xl border border-amber-200/60 text-xs text-slate-700 space-y-1 cursor-pointer transition"
                            title="انقر لفتح دفتر الملاحظات وتعديله"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                ملاحظاتي الخاصة:
                              </span>
                              <span className="text-[10px] text-amber-700 font-medium">فتح الدفتر ↗</span>
                            </div>
                            <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-800 line-clamp-3">
                              {item.notes}
                            </p>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNotebook(item);
                            }}
                            className="py-2.5 px-3 border border-dashed border-slate-200 hover:border-emerald-300 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50/40 text-[11px] font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="انقر نقراً مزدوجاً على البطاقة لفتح دفتر الملاحظات"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>دفتر الملاحظات (انقر مرتين للفتح)</span>
                          </div>
                        )}
                      </div>

                      {/* Attendance Tracking Box */}
                      <div className="pt-3 border-t border-slate-100 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 text-[11px]">احتساب الحضور والغياب:</span>
                          {isOverLimit ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" />
                              تجاوزت الحد ({item.absenceCount}/{item.maxAllowedAbsences})
                            </span>
                          ) : isNearLimit ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              إنذار ({item.absenceCount}/{item.maxAllowedAbsences})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              غياب: {item.absenceCount} من أصل {item.maxAllowedAbsences}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            disabled={actionLoadingId === item._id}
                            onClick={() => handleAttendanceAction(item._id, "ATTEND")}
                            className="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            + حضور ({item.attendanceCount || 0})
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === item._id}
                            onClick={() => handleAttendanceAction(item._id, "ABSENT")}
                            className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            + غياب ({item.absenceCount || 0})
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === item._id}
                            onClick={() => handleAttendanceAction(item._id, "RESET")}
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="تصفير عداد الحضور والغياب"
                          >
                            <RotateCcw className="w-3 h-3 text-slate-500" />
                            تصفير
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* VIEW MODE 2: INTERACTIVE WEEKLY TIMETABLE GRID              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === "grid" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">الجدول الأسبوعي لموادي الذاتية</h3>
                <p className="text-xs text-slate-500">توزيع الحصص والمواعيد على أيام الأسبوع</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 rounded-xl bg-[#14352c] text-white text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة حصة
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {WEEKDAYS.map((day) => {
                const dayItems = items.filter((i) => i.dayOfWeek === day.key);

                return (
                  <div key={day.key} className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 hover:bg-slate-50/50 transition">
                    <div className="md:w-32 shrink-0 flex md:flex-col items-center md:items-start justify-between">
                      <span className="text-sm font-bold text-slate-900">{day.label}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">
                        {dayItems.length} مواعيد
                      </span>
                    </div>

                    <div className="flex-1">
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">لا توجد مواد مضافة لهذا اليوم.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dayItems.map((item) => (
                            <div
                              key={item._id}
                              onDoubleClick={() => handleOpenNotebook(item)}
                              className="p-3 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl space-y-1.5 shadow-xs cursor-pointer select-none transition"
                              title="انقر نقراً مزدوجاً لفتح دفتر الملاحظات لهذا المقرر"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-900 text-xs">{item.subjectName}</p>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNotebook(item)}
                                    className="p-1 rounded text-slate-400 hover:text-[#14352c] cursor-pointer"
                                    title="دفتر الملاحظات"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(item)}
                                    className="p-1 rounded text-slate-400 hover:text-[#14352c] cursor-pointer"
                                    title="تعديل"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(item._id)}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                                <Clock className="w-3 h-3 text-[#14352c]" />
                                <span>{item.startTime} {item.endTime ? `- ${item.endTime}` : ""}</span>
                              </div>

                              {item.room && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  القاعة: {item.room}
                                </p>
                              )}

                              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">حضور: {item.attendanceCount} | غياب: {item.absenceCount}</span>
                                {item.notificationsEnabled && <Bell className="w-3 h-3 text-emerald-600" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT SUBJECT MODAL (LUXURY MINIMAL & COMPACT)         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {itemModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setItemModal(false);
              setEditingItem(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#14352c]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingItem ? "تعديل المقرر في جدولي" : "إضافة مقرر دراسي جديد"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemModal(false);
                  setEditingItem(null);
                }}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="p-5 space-y-3.5">
              {/* Subject Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  اسم المادة الدراسية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="مثال: هندسة البرمجيات، شبكات، بحوث العمليات..."
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
              </div>

              {/* Day & Times Row */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اليوم</label>
                  <CustomSelect
                    options={dayOptions}
                    value={dayOfWeek}
                    onChange={(val) => setDayOfWeek(val)}
                    theme="light"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">وقت البدء</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">وقت الانتهاء</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none transition"
                  />
                </div>
              </div>

              {/* Room, Doctor & Max Absences Row */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">القاعة / المختبر</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="قاعة 204"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">أستاذ المادة</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="اسم التدريسي"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">حد الغياب المسموح</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={maxAllowedAbsences}
                    onChange={(e) => setMaxAllowedAbsences(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none transition"
                  />
                </div>
              </div>

              {/* Color & Notification in ONE unified compact row */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                {/* Color dots */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-700 ml-1">لون البطاقة:</span>
                  <div className="flex items-center gap-1.5">
                    {COLOR_OPTIONS.map((c) => {
                      const isSelected = color === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColor(c.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer ${
                            isSelected ? `ring-2 ${c.ring} ring-offset-2 ring-offset-white scale-110` : "opacity-60 hover:opacity-100"
                          }`}
                          title={c.label}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${c.dot}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notification Toggle + Minutes */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Bell className="w-3 h-3 text-[#14352c]" />
                    تنبيه:
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notificationsEnabled}
                    onClick={() => setNotificationsEnabled((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      notificationsEnabled ? "bg-[#14352c]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        notificationsEnabled ? "-translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  {notificationsEnabled && (
                    <select
                      value={reminderMinutesBefore}
                      onChange={(e) => setReminderMinutesBefore(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-[#14352c]"
                    >
                      <option value="10">قبل 10 د</option>
                      <option value="15">قبل 15 د</option>
                      <option value="30">قبل 30 د</option>
                      <option value="60">قبل ساعة</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تدوين أي ملاحظات أو مهام تخص المادة..."
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : editingItem ? (
                    <Pencil className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{editingItem ? "حفظ التعديلات" : "إضافة المقرر"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION DIALOG                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="تأكيد حذف المادة من جدولي"
        type="danger"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            هل أنت متأكد من رغبتك في حذف مقرر{" "}
            <span className="font-bold text-slate-900 underline">
              {items.find((i) => i._id === deleteConfirmId)?.subjectName || "هذه المادة"}
            </span>{" "}
            من مخططك الذاتي؟ سيتم مسح سجل الحضور والملاحظات المرتبطة بها نهائياً.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteItem}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>تأكيد الحذف</span>
            </button>
          </div>
        </div>
      </Dialog>

      {/* Status Feedback Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        type={dialog.type}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">{dialog.message}</p>
          <button
            type="button"
            onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
            className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            حسناً، فهمت
          </button>
        </div>
      </Dialog>
    </div>
  );
}
