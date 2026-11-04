"use client";

import { useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";
import Navbar from "@/components/Navbar";
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  FileCheck2,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  RefreshCw,
  Award,
  Send,
  FileText,
  Clock,
  Download,
  Upload,
  X,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Sparkles,
  Paperclip,
} from "lucide-react";

const mono = { className: "font-mono" };

const toArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val?.data && Array.isArray(val.data.data)) return val.data.data;
  return [];
};

function DoctorAssignmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "PENDING">("ALL");

  // Create Assignment Dialog
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState<number>(10);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submissions Modal & Inline Grading
  const [viewSubmissionsModal, setViewSubmissionsModal] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<"ALL" | "PENDING" | "GRADED">("ALL");
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: number; feedback: string }>>({});

  // Delete Assignment Confirmation
  const [assignmentToDelete, setAssignmentToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Floating Shadcn Alert
  const [alert, setAlert] = useState<{
    title: string;
    message: string;
    type: "success" | "danger" | "info";
  } | null>(null);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      setAlert(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [alert]);

  // Guaranteed safe arrays
  const safeSections = useMemo(() => toArray(sections), [sections]);
  const safeAssignments = useMemo(() => toArray(assignments), [assignments]);

  // Current Active Section Object
  const currentSectionObj = useMemo(() => {
    return safeSections.find((s) => s._id === selectedSection) || safeSections[0] || null;
  }, [safeSections, selectedSection]);

  // Section options for CustomSelect
  const sectionOptions: SelectOption[] = useMemo(() => {
    return safeSections.map((sec: any) => ({
      value: sec._id,
      label: `${sec.course?.name || sec.courseName || "المادة"} (شعبة ${sec.sectionNumber || "1"})`,
      subLabel: `المرحلة ${sec.course?.stage || 1} • ${sec.enrolledCount || 0} طالب`,
    }));
  }, [safeSections]);

  // Initialize Data
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    async function initData() {
      try {
        const res = await apiFetch("/doctor/sections");
        const list = toArray(res);
        setSections(list);

        if (list.length > 0) {
          const paramSecId = searchParams.get("sectionId");
          const remembered = smartCache.getWorkspace("doctor_selected_section", "");
          const activeId =
            paramSecId && list.some((s: any) => s._id === paramSecId)
              ? paramSecId
              : remembered && list.some((s: any) => s._id === remembered)
              ? remembered
              : list[0]._id;

          setSelectedSection(activeId);
          loadAssignments(activeId);
        }
      } catch (err) {
        console.error("Failed to load doctor sections for assignments:", err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [router, searchParams]);

  // Load Assignments for Selected Section
  const loadAssignments = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      const res = await apiFetch(`/assignments/section/${secId}`);
      setAssignments(toArray(res));
    } catch {
      setAssignments([]);
    } finally {
      setFetching(false);
    }
  };

  // Drag & Drop Handlers for Create Modal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAssignmentFile(e.dataTransfer.files[0]);
    }
  };

  // Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !title.trim() || !dueDate) return;
    setCreating(true);

    try {
      let attachments: any[] = [];
      if (assignmentFile) {
        const formData = new FormData();
        formData.append("file", assignmentFile);
        const upRes = await apiFetch("/assignments/upload", {
          method: "POST",
          body: formData,
        });
        if (upRes?.data) {
          attachments = [
            {
              fileName: upRes.data.fileName,
              fileUrl: upRes.data.fileUrl,
              fileSize: upRes.data.fileSize,
            },
          ];
        }
      }

      await apiFetch("/assignments", {
        method: "POST",
        body: JSON.stringify({
          sectionId: selectedSection,
          title: title.trim(),
          description: description.trim(),
          deadline: dueDate,
          dueDate: dueDate,
          maxScore: Number(maxScore) || 10,
          ...(attachments.length > 0 ? { attachments } : {}),
        }),
      });

      smartCache.invalidate("/assignments*");
      smartCache.invalidate("/dashboards*");

      setCreateModal(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setMaxScore(10);
      setAssignmentFile(null);

      setAlert({
        title: "تم نشر الواجب بنجاح",
        message: "تم تعميم التكليف على طلبة الشعبة وإتاحته للتسليم الأكاديمي.",
        type: "success",
      });

      loadAssignments(selectedSection);
    } catch (err: any) {
      setAlert({
        title: "خطأ في إنشاء الواجب",
        message: err.message || "تعذر إنشاء الواجب.",
        type: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  // Delete Assignment
  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setDeleting(true);

    try {
      await apiFetch(`/assignments/${assignmentToDelete._id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a._id !== assignmentToDelete._id));
      setAssignmentToDelete(null);

      setAlert({
        title: "تم حذف الواجب",
        message: "تمت إزالة التكليف وكافة تسليمات الطلبة المرتبطة به بنجاح.",
        type: "info",
      });
    } catch (err: any) {
      setAlert({
        title: "خطأ في الحذف",
        message: err.message || "تعذر حذف الواجب.",
        type: "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Open Submissions Modal
  const handleOpenSubmissions = async (assignment: any) => {
    setViewSubmissionsModal(assignment);
    setLoadingSubmissions(true);
    setSubmissionSearch("");
    setSubStatusFilter("ALL");

    try {
      const res = await apiFetch(`/assignments/${assignment._id}/submissions`);
      const subs = toArray(res);
      setSubmissions(subs);

      // Pre-fill grade inputs for inline editing
      const initialInputs: Record<string, { score: number; feedback: string }> = {};
      subs.forEach((s: any) => {
        initialInputs[s._id] = {
          score: s.score !== undefined && s.score !== null ? s.score : assignment.maxScore || 10,
          feedback: s.doctorFeedback || s.feedback || "",
        };
      });
      setGradeInputs(initialInputs);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Inline Fast Grading Submit
  const handleSaveInlineGrade = async (subId: string) => {
    const input = gradeInputs[subId];
    if (!input || !viewSubmissionsModal) return;
    setGradingSubId(subId);

    try {
      await apiFetch(`/assignments/submissions/${subId}/grade`, {
        method: "PUT",
        body: JSON.stringify({
          score: Number(input.score),
          feedback: input.feedback.trim() || undefined,
        }),
      });

      // Update local submissions array
      setSubmissions((prev) =>
        prev.map((s) =>
          s._id === subId
            ? { ...s, score: Number(input.score), doctorFeedback: input.feedback, status: "GRADED" }
            : s
        )
      );

      // Update assignment metrics locally
      setAssignments((prev) =>
        prev.map((a) => {
          if (a._id === viewSubmissionsModal._id && a.metrics) {
            const currentGraded = a.metrics.graded || 0;
            const currentPending = Math.max(0, (a.metrics.pending || 0) - 1);
            return {
              ...a,
              metrics: {
                ...a.metrics,
                graded: currentGraded + 1,
                pending: currentPending,
              },
            };
          }
          return a;
        })
      );

      setAlert({
        title: "تم رصد الدرجة بنجاح",
        message: `تم تثبيت درجة الطالب (${input.score}/${viewSubmissionsModal.maxScore}) وتحديث نتيجته فوراً.`,
        type: "success",
      });
    } catch (err: any) {
      setAlert({
        title: "خطأ في رصد الدرجة",
        message: err.message || "تعذر حفظ درجة الطالب.",
        type: "danger",
      });
    } finally {
      setGradingSubId(null);
    }
  };

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    const now = new Date();
    return safeAssignments.filter((a: any) => {
      const matchSearch =
        !searchQuery.trim() ||
        (a.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const isExpired = new Date(a.deadline || a.dueDate) < now;
      const hasPending = (a.metrics?.pending || 0) > 0;

      const matchStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? !isExpired
          : statusFilter === "EXPIRED"
          ? isExpired
          : hasPending;

      return matchSearch && matchStatus;
    });
  }, [safeAssignments, searchQuery, statusFilter]);

  // Filtered Submissions inside modal
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub: any) => {
      const sName = (sub.student?.name || "").toLowerCase();
      const sId = (sub.student?.studentId || "").toLowerCase();
      const sEmail = (sub.student?.email || "").toLowerCase();
      const q = submissionSearch.toLowerCase();

      const matchQuery = !q || sName.includes(q) || sId.includes(q) || sEmail.includes(q);

      const matchStatus =
        subStatusFilter === "ALL"
          ? true
          : subStatusFilter === "PENDING"
          ? sub.status !== "GRADED"
          : sub.status === "GRADED";

      return matchQuery && matchStatus;
    });
  }, [submissions, submissionSearch, subStatusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Universal Floating Island Capsule Navbar */}
      <Navbar user={user} />

      {/* Floating Temporary Shadcn Alert (auto-dismiss after 3.5s) */}
      {alert && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300">
          <div className="pointer-events-auto max-w-lg w-full shadow-2xl">
            <Alert
              variant={alert.type === "danger" ? "destructive" : "default"}
              className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-4 text-slate-900 flex items-start justify-between gap-3 relative"
            >
              {alert.type === "danger" ? (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 pr-1">
                <AlertTitle className="text-sm font-bold text-slate-900 mb-0.5">
                  {alert.title}
                </AlertTitle>
                <AlertDescription className="text-xs text-slate-500 leading-relaxed font-medium">
                  {alert.message}
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setAlert(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition shrink-0"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </Alert>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة التدريسي
              </Link>
              <span>/</span>
              <Link href="/dashboard/doctor/courses" className="hover:text-[#14352c] transition">
                المقررات والشعب
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">الواجبات والتصحيح</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <FileCheck2 className="w-6 h-6 text-[#14352c]" />
              الواجبات والتصحيح الأكاديمي
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              إنشاء التكليفات ومتابعة تسليمات وإجابات الطلبة وتصحيحها فورياً
            </p>
          </div>

          {/* Section Selector & New Assignment Action */}
          <div className="flex flex-wrap items-center gap-3">
            {safeSections.length > 0 && (
              <div className="w-full sm:w-72">
                <CustomSelect
                  options={sectionOptions}
                  value={selectedSection}
                  onChange={(val) => {
                    setSelectedSection(val);
                    smartCache.setWorkspace("doctor_selected_section", val);
                    loadAssignments(val);
                  }}
                  theme="light"
                  className="w-full"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>تكليف واجب جديد</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION KPI BANNER                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#14352c] font-bold shrink-0">
              <BookOpen className="w-5 h-5 text-[#14352c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {currentSectionObj?.course?.name || "المقرر الدراسي"}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#14352c]/10 text-[#14352c]">
                  شعبة {currentSectionObj?.sectionNumber || "A"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                المرحلة {currentSectionObj?.course?.stage || 1} • {currentSectionObj?.enrolledCount || 0} طالب مسجل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block">إجمالي الواجبات</span>
              <span className={`text-xs font-bold text-slate-900 ${mono.className}`}>
                {safeAssignments.length} تكليف
              </span>
            </div>

            <Link
              href={`/dashboard/doctor/grades?sectionId=${selectedSection}`}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14352c] border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5"
              title="الانتقال لرصد درجات هذه الشعبة"
            >
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              <span>سجل السعي</span>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SEARCH & STATUS FILTER BAR                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              الكل ({safeAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "ACTIVE"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              متاح للتسليم
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "PENDING"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              بانتظار التصحيح
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("EXPIRED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "EXPIRED"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              منتهي الموعد
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن واجب أو تكليف..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ASSIGNMENTS GRID WITH REAL-TIME PROGRESS                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-medium">جارٍ تحميل التكليفات الأكاديمية...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileCheck2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">لا توجد واجبات منشأة لهذه الشعبة</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              اضغط على زر "تكليف واجب جديد" لنشر أول واجب دراسي لطلبة الشعبة وتحديد موعد التسليم.
            </p>
            <button
              type="button"
              onClick={() => setCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>تكليف أول واجب الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssignments.map((item: any) => {
              const isExpired = new Date(item.deadline || item.dueDate) < new Date();
              const metrics = item.metrics || { total: 0, graded: 0, pending: 0 };
              const gradedPct = metrics.total > 0 ? Math.round((metrics.graded / metrics.total) * 100) : 0;

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md p-5 flex flex-col justify-between space-y-4 shadow-xs transition group"
                >
                  <div className="space-y-3">
                    {/* Header: Status Pill & Max Score */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                          isExpired
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${isExpired ? "bg-rose-600" : "bg-emerald-600"}`} />
                        {isExpired ? "انتهى الموعد" : "متاح للتسليم"}
                      </span>

                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 ${mono.className}`}>
                        الدرجة: {item.maxScore}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-[#14352c] transition leading-snug line-clamp-2">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Deadline Banner */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        آخر موعد للتسليم:
                      </span>
                      <span className={`font-bold font-mono text-slate-800 ${mono.className}`}>
                        {formatAcademicDate(item.deadline || item.dueDate)}
                      </span>
                    </div>

                    {/* Submission & Grading Metrics Box */}
                    <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-700">نسبة التصحيح:</span>
                        <span className="font-bold text-[#14352c] font-mono">{gradedPct}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-[#14352c] rounded-full transition-all"
                          style={{ width: `${gradedPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-600">
                          المسلّمين: <strong className="text-slate-900 font-mono">{metrics.total}</strong>
                        </span>
                        <span className="text-emerald-800 font-semibold">
                          تم تصحيحها: <strong className="font-mono">{metrics.graded}</strong>
                        </span>
                        {metrics.pending > 0 && (
                          <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                            {metrics.pending} بانتظار التقييم
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Hub */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSubmissions(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-300" />
                      <span>عرض وتصحيح التسليمات ({metrics.total})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignmentToDelete(item)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shrink-0"
                      title="حذف الواجب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* UNIFIED SUBMISSIONS & INLINE FAST GRADING MODAL             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={!!viewSubmissionsModal}
        onClose={() => setViewSubmissionsModal(null)}
        title={`تسليمات: ${viewSubmissionsModal?.title || ""}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Header Subtitle & Quick Stats */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">الدرجة القصوى للتكليف:</span>
              <span className={`text-base font-bold text-slate-900 ${mono.className}`}>
                {viewSubmissionsModal?.maxScore || 10} درجة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-800">
                إجمالي الإجابات: {submissions.length}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
                تم التصحيح: {submissions.filter((s) => s.status === "GRADED").length}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 font-bold text-amber-800">
                بانتظار التقييم: {submissions.filter((s) => s.status !== "GRADED").length}
              </span>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder="ابحث عن اسم الطالب أو الرقم الجامعي..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] transition"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSubStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  subStatusFilter === "ALL" ? "bg-[#14352c] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setSubStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  subStatusFilter === "PENDING" ? "bg-[#14352c] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                بانتظار التقييم
              </button>
              <button
                type="button"
                onClick={() => setSubStatusFilter("GRADED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  subStatusFilter === "GRADED" ? "bg-[#14352c] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                تم التصحيح
              </button>
            </div>
          </div>

          {/* Submissions List with Inline Fast Grading */}
          <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
            {loadingSubmissions ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#14352c]" />
                <p className="text-xs text-slate-500 font-medium">جارٍ جلب إجابات وتسليمات الطلبة...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                لا توجد تسليمات مطابقة لشروط البحث والتصفية
              </div>
            ) : (
              filteredSubmissions.map((sub: any) => {
                const isGraded = sub.status === "GRADED";
                const isGrading = gradingSubId === sub._id;
                const input = gradeInputs[sub._id] || { score: sub.score || 0, feedback: sub.doctorFeedback || "" };

                return (
                  <div
                    key={sub._id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs space-y-3.5 transition"
                  >
                    {/* Student Info & Submission Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-emerald-50 text-[#14352c] font-bold flex items-center justify-center text-xs shrink-0">
                          {sub.student?.name ? sub.student.name[0] : "ط"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                              {sub.student?.name || "طالب"}
                            </h5>
                            {sub.student?.studentId && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({sub.student.studentId})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">{sub.student?.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sub.isLate && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            تسليم متأخر
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isGraded
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isGraded ? `تم الرصد (${sub.score}/${viewSubmissionsModal?.maxScore})` : "بانتظار التقييم"}
                        </span>
                      </div>
                    </div>

                    {/* Student Submission Text or Notes */}
                    {sub.submissionText && (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed font-sans">
                        <span className="font-bold text-slate-500 block text-[10px] mb-0.5">إجابة الطالب:</span>
                        {sub.submissionText}
                      </div>
                    )}

                    {/* Submitted Files Links */}
                    {sub.submittedFiles && sub.submittedFiles.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block">الملفات المرفقة من الطالب:</span>
                        <div className="flex flex-wrap gap-2">
                          {sub.submittedFiles.map((file: any, fIdx: number) => {
                            const token = typeof window !== "undefined" ? localStorage.getItem("uams_access_token") : "";
                            const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
                            const downloadUrl = `${apiBase}/api/files/submission/${sub._id}/files/${fIdx}/download?token=${encodeURIComponent(token || "")}`;

                            return (
                              <a
                                key={fIdx}
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[#14352c] text-xs font-bold transition inline-flex items-center gap-1.5"
                                title="تحميل ملف إجابة الطالب"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="truncate max-w-[200px]">{file.fileName || "ملف الإجابة"}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ═══════════════════════════════════════════════════ */}
                    {/* INLINE FAST GRADING HUB (رصد الدرجة مباشرة)          */}
                    {/* ═══════════════════════════════════════════════════ */}
                    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-36">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          الدرجة (من {viewSubmissionsModal?.maxScore || 10}):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={viewSubmissionsModal?.maxScore || 100}
                          value={input.score}
                          onChange={(e) =>
                            setGradeInputs((prev) => ({
                              ...prev,
                              [sub._id]: { ...input, score: parseFloat(e.target.value) || 0 },
                            }))
                          }
                          className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#14352c] ${mono.className}`}
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          ملاحظات وتغذية راجعة للطالب:
                        </label>
                        <input
                          type="text"
                          value={input.feedback}
                          onChange={(e) =>
                            setGradeInputs((prev) => ({
                              ...prev,
                              [sub._id]: { ...input, feedback: e.target.value },
                            }))
                          }
                          placeholder="ملاحظات علمية وتوجيه للطالب..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveInlineGrade(sub._id)}
                        disabled={isGrading}
                        className="w-full sm:w-auto px-4 py-2 mt-4 sm:mt-0 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 shadow-xs"
                      >
                        {isGrading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        )}
                        <span>{isGraded ? "تعديل الدرجة" : "حفظ الدرجة"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewSubmissionsModal(null)}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CREATE ASSIGNMENT MODAL WITH DRAG & DROP                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="تكليف واجب أكاديمي جديد"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">الشعبة المستهدفة:</span>
            <span className="font-bold text-[#14352c]">
              {currentSectionObj?.course?.name} (شعبة {currentSectionObj?.sectionNumber})
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان الواجب:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: الواجب الأول - هياكل البيانات والخوارزميات"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تفاصيل ومحتوى التكليف:</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تعليمات التكليف والأسئلة المطلوبة بدقة..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">آخر موعد للتسليم:</label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الدرجة القصوى:</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={maxScore}
                onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold ${mono.className}`}
              />
            </div>
          </div>

          {/* Drag & Drop Question Sheet Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملف ورقة الأسئلة أو التعليمات (اختياري - PDF / Word):
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#14352c] bg-emerald-50/50"
                  : assignmentFile
                  ? "border-emerald-300 bg-emerald-50/20"
                  : "border-slate-300 hover:border-[#14352c] bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setAssignmentFile(e.target.files[0]);
                  }
                }}
              />

              {assignmentFile ? (
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">{assignmentFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignmentFile(null);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>اسحب ورقة الأسئلة هنا، أو انقر للاختيار</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  جارٍ النشر...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  تأكيد ونشر التكليف
                </>
              )}
            </button>
          </div>
        </form>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION SAFETY DIALOG                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        title="تأكيد حذف الواجب الأكاديمي"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-rose-900">
                هل أنت متأكد من رغبتك في حذف هذا الواجب؟
              </h5>
              <p className="text-xs text-rose-700 leading-relaxed">
                الواجب: <span className="font-bold">{assignmentToDelete?.title}</span>
                <br />
                سيتم حذف هذا التكليف نهائياً مع كافة حلول وتسليمات ودرجات الطلبة المرتبطة به.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignmentToDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={confirmDeleteAssignment}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  جارٍ الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  تأكيد الحذف النهائي
                </>
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function DoctorAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
          <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
        </div>
      }
    >
      <DoctorAssignmentsContent />
    </Suspense>
  );
}
