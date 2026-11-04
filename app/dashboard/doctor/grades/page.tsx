"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
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
  Award,
  Plus,
  Calendar,
  Save,
  CheckCircle2,
  RefreshCw,
  Users,
  Edit,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  TrendingUp,
  Percent,
  Check,
  FileText,
  Clock,
  MapPin,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

const mono = { className: "font-mono" };

const toArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val?.data && Array.isArray(val.data.data)) return val.data.data;
  if (val?.data && Array.isArray(val.data.sections)) return val.data.sections;
  return [];
};

function DoctorGradesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [exams, setExams] = useState<any[]>([]);
  const [gradesSheet, setGradesSheet] = useState<any | null>(null);
  const [fetching, setFetching] = useState(false);

  // Active Tab: 'SHEET' = سجل السعي الموزون, 'EXAMS' = بطاقات الاختبارات
  const [activeTab, setActiveTab] = useState<"SHEET" | "EXAMS">("SHEET");

  // Sheet Search & Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [passFilter, setPassFilter] = useState<"ALL" | "PASSED" | "FAILED" | "UNGRADED">("ALL");

  // Create Exam Dialog
  const [createExamModal, setCreateExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState("MIDTERM");
  const [maxScore, setMaxScore] = useState<number>(30);
  const [weightPercentage, setWeightPercentage] = useState<number>(20);
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [examLocation, setExamLocation] = useState("");
  const [instructions, setInstructions] = useState("");
  const [creatingExam, setCreatingExam] = useState(false);

  // Record Grades Modal
  const [recordModal, setRecordModal] = useState<any | null>(null);
  const [studentScores, setStudentScores] = useState<Record<string, { score: number | string; notes: string }>>({});
  const [recordSearch, setRecordSearch] = useState("");
  const [savingGrades, setSavingGrades] = useState(false);
  const [batchScoreInput, setBatchScoreInput] = useState<string>("");

  // Delete Exam Confirmation
  const [examToDelete, setExamToDelete] = useState<any | null>(null);
  const [deletingExam, setDeletingExam] = useState(false);

  // Export Excel
  const [exportingExcel, setExportingExcel] = useState(false);

  // Floating Shadcn Alert (CLS = 0)
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
  const safeExams = useMemo(() => toArray(exams), [exams]);

  // Current Active Section Object
  const currentSectionObj = useMemo(() => {
    return safeSections.find((s) => s._id === selectedSection) || safeSections[0] || null;
  }, [safeSections, selectedSection]);

  // Section options for CustomSelect
  const sectionOptions: SelectOption[] = useMemo(() => {
    return safeSections.map((sec: any) => ({
      value: sec._id,
      label: `${sec.course?.name || sec.courseName || "المادة"} (شعبة ${sec.sectionNumber || "1"})`,
      subLabel: `المرحلة ${sec.course?.stage || 1} • ${sec.enrolledCount || sec.students?.length || 0} طالب`,
    }));
  }, [safeSections]);

  // Total weight of scheduled exams
  const totalWeightConfigured = useMemo(() => {
    return safeExams.reduce((sum, e) => sum + (e.weightPercentage || 0), 0);
  }, [safeExams]);

  // Student rows from gradesSheet
  const studentRows = useMemo(() => {
    const list = gradesSheet?.data || gradesSheet?.students || [];
    return toArray(list);
  }, [gradesSheet]);

  // Filtered student rows in matrix sheet
  const filteredStudentRows = useMemo(() => {
    return studentRows.filter((st: any) => {
      const matchSearch =
        !studentSearch.trim() ||
        (st.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.studentId || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.email || "").toLowerCase().includes(studentSearch.toLowerCase());

      const hasAnyScore = st.examScores?.some((es: any) => es.score !== null && es.score !== undefined);

      const matchPass =
        passFilter === "ALL"
          ? true
          : passFilter === "PASSED"
          ? st.isPassed === true
          : passFilter === "FAILED"
          ? st.isPassed === false
          : !hasAnyScore;

      return matchSearch && matchPass;
    });
  }, [studentRows, studentSearch, passFilter]);

  // Sheet Quick Stats
  const sheetStats = useMemo(() => {
    if (studentRows.length === 0) return { passedCount: 0, failedCount: 0, passRate: 0, avgScore: 0, topScore: 0 };
    let passedCount = 0;
    let totalScore = 0;
    let topScore = 0;

    studentRows.forEach((st: any) => {
      if (st.isPassed) passedCount++;
      const score = Number(st.totalWeightedScore) || 0;
      totalScore += score;
      if (score > topScore) topScore = score;
    });

    const passRate = Math.round((passedCount / studentRows.length) * 100);
    const avgScore = Number((totalScore / studentRows.length).toFixed(1));

    return {
      passedCount,
      failedCount: studentRows.length - passedCount,
      passRate,
      avgScore,
      topScore,
    };
  }, [studentRows]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Initialize Data with Auto-fallback and Retry
  const initData = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      let list: any[] = [];
      try {
        const res = await apiFetch("/doctor/sections");
        list = toArray(res);
      } catch {
        // Fallback to doctor dashboard endpoint
        try {
          const dashRes = await apiFetch("/dashboards/doctor");
          list = toArray(dashRes?.data?.sections || dashRes?.sections || dashRes);
        } catch {
          list = [];
        }
      }

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
        loadSectionExamsAndGrades(activeId);
      } else {
        setFetchError("لم يتم العثور على شُعب دراسية مسندة لحسابك حالياً.");
      }
    } catch (err: any) {
      setFetchError(err.message || "تعذر الاتصال بالخادم لجلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);
    initData();
  }, [router, searchParams]);

  // Load Section Exams and Grades Sheet
  const loadSectionExamsAndGrades = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      const [examsRes, sheetRes] = await Promise.allSettled([
        apiFetch(`/exams/section/${secId}`),
        apiFetch(`/exams/section/${secId}/grades-sheet`),
      ]);

      if (examsRes.status === "fulfilled") {
        setExams(toArray(examsRes.value));
      } else {
        setExams([]);
      }

      if (sheetRes.status === "fulfilled") {
        const sheet = sheetRes.value?.data || sheetRes.value || null;
        setGradesSheet(sheet);
      } else {
        setGradesSheet(null);
      }
    } catch (err) {
      console.error("Error loading exams and grades:", err);
    } finally {
      setFetching(false);
    }
  };

  // Create Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !examTitle.trim() || !examDate) return;
    setCreatingExam(true);

    try {
      await apiFetch("/exams", {
        method: "POST",
        body: JSON.stringify({
          sectionId: selectedSection,
          title: examTitle.trim(),
          type: examType,
          examType: examType,
          maxScore: Number(maxScore) || 30,
          weightPercentage: Number(weightPercentage) || 20,
          examDate: examDate,
          date: examDate,
          startTime: startTime || undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
          location: examLocation?.trim() || undefined,
          instructions: instructions?.trim() || undefined,
        }),
      });

      smartCache.invalidate("/exams*");
      smartCache.invalidate("/dashboards*");

      setCreateExamModal(false);
      setExamTitle("");
      setExamDate("");
      setStartTime("");
      setDurationMinutes("");
      setExamLocation("");
      setInstructions("");
      setMaxScore(30);
      setWeightPercentage(20);

      setAlert({
        title: "تمت جدولة الاختبار بنجاح",
        message: "تم تثبيت موعد الاختبار وإتاحته لرصد درجات الطلبة وإشعارهم تلقائياً.",
        type: "success",
      });

      loadSectionExamsAndGrades(selectedSection);
    } catch (err: any) {
      setAlert({
        title: "خطأ في جدولة الاختبار",
        message: err.message || "تعذر إنشاء الاختبار.",
        type: "danger",
      });
    } finally {
      setCreatingExam(false);
    }
  };

  // Open Record Grades Modal
  const openRecordGrades = (exam: any) => {
    setRecordModal(exam);
    setRecordSearch("");
    setBatchScoreInput("");
    const initialMap: Record<string, { score: number | string; notes: string }> = {};

    studentRows.forEach((st: any) => {
      const foundExam = st.examScores?.find((es: any) => String(es.examId) === String(exam._id));
      initialMap[st._id] = {
        score: foundExam && foundExam.score !== null && foundExam.score !== undefined ? foundExam.score : "",
        notes: foundExam?.notes || "",
      };
    });

    setStudentScores(initialMap);
  };

  // Batch apply uniform score
  const handleApplyBatchScore = () => {
    if (batchScoreInput === "" || !recordModal) return;
    const num = Math.min(recordModal.maxScore, Math.max(0, Number(batchScoreInput) || 0));
    setStudentScores((prev) => {
      const updated = { ...prev };
      studentRows.forEach((st: any) => {
        updated[st._id] = {
          score: num,
          notes: updated[st._id]?.notes || "",
        };
      });
      return updated;
    });
  };

  // Save Grades
  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordModal || !selectedSection) return;
    setSavingGrades(true);

    const gradesPayload = Object.entries(studentScores)
      .filter(([_, data]) => data.score !== "" && data.score !== undefined && data.score !== null)
      .map(([studentId, data]) => ({
        studentId,
        score: Number(data.score) || 0,
        notes: data.notes?.trim() || undefined,
      }));

    if (gradesPayload.length === 0) {
      setAlert({
        title: "تنبيه",
        message: "يرجى رصد درجة واحدة على الأقل قبل الحفظ.",
        type: "info",
      });
      setSavingGrades(false);
      return;
    }

    try {
      await apiFetch(`/exams/${recordModal._id}/grades`, {
        method: "POST",
        body: JSON.stringify({
          grades: gradesPayload,
        }),
      });

      smartCache.invalidate("/exams*");
      smartCache.invalidate("/dashboards*");

      setRecordModal(null);
      setAlert({
        title: "تم حفظ واعتماد الدرجات بنجاح",
        message: `تم تثبيت درجات (${gradesPayload.length}) طالب لاختبار (${recordModal.title}) وتحديث السعي التراكمي فوراً.`,
        type: "success",
      });

      loadSectionExamsAndGrades(selectedSection);
    } catch (err: any) {
      setAlert({
        title: "خطأ في حفظ الدرجات",
        message: err.message || "تعذر حفظ درجات الطلبة.",
        type: "danger",
      });
    } finally {
      setSavingGrades(false);
    }
  };

  // Delete Exam
  const confirmDeleteExam = async () => {
    if (!examToDelete || !selectedSection) return;
    setDeletingExam(true);

    try {
      await apiFetch(`/exams/${examToDelete._id}`, { method: "DELETE" });

      smartCache.invalidate("/exams*");
      smartCache.invalidate("/dashboards*");

      setExamToDelete(null);
      setAlert({
        title: "تم حذف الاختبار",
        message: "تمت إزالة الاختبار وكافة الدرجات المرتبطة به بنجاح وتحديث السعي التراكمي.",
        type: "info",
      });

      loadSectionExamsAndGrades(selectedSection);
    } catch (err: any) {
      setAlert({
        title: "خطأ في حذف الاختبار",
        message: err.message || "تعذر حذف الاختبار.",
        type: "danger",
      });
    } finally {
      setDeletingExam(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!selectedSection) return;
    setExportingExcel(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("uams_access_token") : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiBase}/reports/grades/${selectedSection}/excel`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("تعذر تحميل ملف الإكسل من الخادم.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const secNum = currentSectionObj?.sectionNumber || "1";
      const cName = currentSectionObj?.course?.name || currentSectionObj?.courseName || "مقرر";
      a.download = `سجل_سعي_${cName}_شعبة_${secNum}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setAlert({
        title: "تم تصدير كشف السعي بنجاح",
        message: "تم تنزيل ملف الإكسل المعتمد لكافة طلبة الشعبة.",
        type: "success",
      });
    } catch (err: any) {
      setAlert({
        title: "خطأ في التصدير",
        message: err.message || "فشل تصدير ملف الإكسل.",
        type: "danger",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // Letter grade styling helper
  const getLetterGradeBadge = (letter: string, isPassed: boolean) => {
    if (!letter || letter === "N/A") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 font-mono">
          -
        </span>
      );
    }
    if (letter.startsWith("A")) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
          {letter}
        </span>
      );
    }
    if (letter.startsWith("B")) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 font-mono">
          {letter}
        </span>
      );
    }
    if (letter.startsWith("C")) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono">
          {letter}
        </span>
      );
    }
    if (letter.startsWith("D")) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300 font-mono">
          {letter}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 font-mono">
        {letter}
      </span>
    );
  };

  // Exam Type badge helper
  const getExamTypeLabel = (type: string) => {
    switch (type) {
      case "MIDTERM":
        return { text: "فصلي (Midterm)", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "QUIZ":
        return { text: "كويز (Quiz)", color: "bg-purple-50 text-purple-800 border-purple-200" };
      case "FINAL":
        return { text: "نهائي (Final)", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "PRACTICAL":
        return { text: "عملي (Practical)", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "ORAL":
        return { text: "شفوي (Oral)", color: "bg-teal-50 text-teal-800 border-teal-200" };
      default:
        return { text: type || "اختبار", color: "bg-slate-50 text-slate-800 border-slate-200" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      <Navbar user={user} />

      {/* Floating Shadcn Alert */}
      {alert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <Alert
            className={`shadow-lg border ${
              alert.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : alert.type === "danger"
                ? "bg-rose-50 border-rose-300 text-rose-950"
                : "bg-blue-50 border-blue-300 text-blue-950"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {alert.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : alert.type === "danger" ? (
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              ) : (
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <AlertTitle className="font-bold text-xs">{alert.title}</AlertTitle>
                <AlertDescription className="text-xs opacity-90 mt-0.5">
                  {alert.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة التدريسي
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">رصد الدرجات وسجل السعي</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Award className="w-7 h-7 text-[#14352c]" />
              سجل السعي والدرجات الأكاديمية
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              جدولة الاختبارات، رصد درجات الطلبة، واحتساب السعي التراكمي وتصديره رسمياً
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sections.length > 0 && (
              <div className="min-w-[240px]">
                <CustomSelect
                  options={sectionOptions}
                  value={selectedSection}
                  onChange={(val) => {
                    setSelectedSection(val);
                    smartCache.setWorkspace("doctor_selected_section", val);
                    loadSectionExamsAndGrades(val);
                  }}
                  theme="light"
                />
              </div>
            )}

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel || studentRows.length === 0}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              title="تصدير شيت السعي والدرجات الرسمي إلى Excel"
            >
              {exportingExcel ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
              ) : (
                <Download className="w-4 h-4 text-emerald-700" />
              )}
              <span>تصدير Excel</span>
            </button>

            {/* Create Exam Button */}
            <button
              onClick={() => setCreateExamModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>جدولة اختبار جديد</span>
            </button>
          </div>
        </div>

        {/* If no sections available */}
        {safeSections.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              {fetchError || "لم يتم العثور على شُعب دراسية مسندة"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يرجى التأكد من تشغيل الخادم والاتصال بالشبكة أو الضغط على إعادة المحاولة.
            </p>
            <button
              onClick={() => initData()}
              className="px-4 py-2 bg-[#14352c] text-white text-xs font-bold rounded-xl hover:bg-[#1b4a3d] transition inline-flex items-center gap-1.5 shadow-sm mt-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Section Capsule & Weight Progress */}
        {currentSectionObj && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#14352c] shrink-0 font-bold">
                <FileSpreadsheet className="w-5 h-5 text-[#14352c]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {currentSectionObj.course?.name || currentSectionObj.courseName || "المادة"}
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                    شعبة {currentSectionObj.sectionNumber || "1"}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                    المرحلة {currentSectionObj.course?.stage || 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{studentRows.length} طالب مسجل</span>
                  <span>•</span>
                  <span>{safeExams.length} اختبار مجدول</span>
                </p>
              </div>
            </div>

            {/* Weight Bar Indicator */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[280px]">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  أوزان السعي المقررة:
                </span>
                <span
                  className={`font-mono ${
                    totalWeightConfigured === 100
                      ? "text-emerald-700"
                      : totalWeightConfigured > 100
                      ? "text-rose-600"
                      : "text-blue-700"
                  }`}
                >
                  {totalWeightConfigured}% / 100%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalWeightConfigured === 100
                      ? "bg-emerald-600"
                      : totalWeightConfigured > 100
                      ? "bg-rose-500"
                      : "bg-[#14352c]"
                  }`}
                  style={{ width: `${Math.min(100, totalWeightConfigured)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 text-left mt-1 font-mono">
                {totalWeightConfigured < 100
                  ? `متبقي ${100 - totalWeightConfigured}% لتكتمل الدرجة`
                  : totalWeightConfigured === 100
                  ? "مجموع الأوزان مكتمل 100%"
                  : "تنبيه: مجموع الأوزان يتجاوز 100%"}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("SHEET")}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 transition-all relative ${
              activeTab === "SHEET"
                ? "text-[#14352c] border-b-2 border-[#14352c]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>سجل السعي التراكمي (Grades Sheet)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
              {studentRows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("EXAMS")}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 transition-all relative ${
              activeTab === "EXAMS"
                ? "text-[#14352c] border-b-2 border-[#14352c]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>الاختبارات والتقييمات المجدولة</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              {safeExams.length}
            </span>
          </button>
        </div>

        {/* TAB 1: CUMULATIVE GRADES SHEET */}
        {activeTab === "SHEET" && (
          <div className="space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block font-medium">طلبة الشعبة</span>
                <span className={`text-xl font-bold text-slate-900 ${mono.className}`}>
                  {studentRows.length}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">مسجلين في المقرر</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block font-medium">نسبة النجاح الحالية</span>
                <span className={`text-xl font-bold text-emerald-700 ${mono.className}`}>
                  {sheetStats.passRate}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {sheetStats.passedCount} طالب ناجح
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block font-medium">متوسط السعي</span>
                <span className={`text-xl font-bold text-blue-700 ${mono.className}`}>
                  {sheetStats.avgScore}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  من {totalWeightConfigured || 100}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block font-medium">أعلى سعي مسجل</span>
                <span className={`text-xl font-bold text-[#14352c] ${mono.className}`}>
                  {sheetStats.topScore}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">في هذه الشعبة</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="ابحث باسم الطالب أو رقمه الجامعي..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setPassFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    passFilter === "ALL"
                      ? "bg-[#14352c] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  الكل ({studentRows.length})
                </button>
                <button
                  onClick={() => setPassFilter("PASSED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    passFilter === "PASSED"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  الناجحون ({sheetStats.passedCount})
                </button>
                <button
                  onClick={() => setPassFilter("FAILED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    passFilter === "FAILED"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  دون النصاب ({sheetStats.failedCount})
                </button>
                <button
                  onClick={() => setPassFilter("UNGRADED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    passFilter === "UNGRADED"
                      ? "bg-slate-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  دون رصد
                </button>
              </div>
            </div>

            {/* Matrix Sheet Table */}
            {fetching ? (
              <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#14352c]" />
                <p className="text-xs text-slate-500 font-bold mt-2.5">جارٍ جلب وتحديث سجل السعي...</p>
              </div>
            ) : studentRows.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">لا يوجد طلبة مسجلين في هذه الشعبة بعد</p>
                <p className="text-xs text-slate-500">
                  سيظهر سجل السعي للطلبة تلقائياً عند تسجيلهم في هذه الشعبة من قبل الإدارة.
                </p>
              </div>
            ) : filteredStudentRows.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                لا توجد نتائج تطابق معايير البحث والفلترة.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold select-none">
                        <th className="p-3.5 w-10 text-center">#</th>
                        <th className="p-3.5 min-w-[200px]">اسم الطالب والرقم الجامعي</th>
                        {safeExams.map((ex: any) => (
                          <th key={ex._id} className="p-3.5 text-center min-w-[110px]">
                            <div className="font-bold text-slate-900 truncate max-w-[120px]" title={ex.title}>
                              {ex.title}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              {ex.maxScore} درجات • {ex.weightPercentage}%
                            </div>
                          </th>
                        ))}
                        <th className="p-3.5 text-center min-w-[120px] bg-emerald-50/50 text-[#14352c]">
                          السعي التراكمي
                          <span className="block text-[10px] text-emerald-800 font-normal">
                            الموزون ({totalWeightConfigured}%)
                          </span>
                        </th>
                        <th className="p-3.5 text-center min-w-[90px]">التقدير</th>
                        <th className="p-3.5 text-center min-w-[100px]">النقاط والتقييم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudentRows.map((st: any, idx: number) => {
                        const examScoresMap = new Map();
                        st.examScores?.forEach((es: any) => {
                          examScoresMap.set(String(es.examId), es);
                        });

                        return (
                          <tr key={st._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className={`p-3.5 text-center text-slate-400 font-mono text-[11px]`}>
                              {idx + 1}
                            </td>

                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{st.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {st.studentId || st.email}
                              </div>
                            </td>

                            {safeExams.map((ex: any) => {
                              const examRecord = examScoresMap.get(String(ex._id));
                              const scoreVal = examRecord?.score;
                              const isRecorded = scoreVal !== null && scoreVal !== undefined;

                              return (
                                <td key={ex._id} className="p-3.5 text-center font-mono">
                                  {isRecorded ? (
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                                        scoreVal >= ex.maxScore * 0.5
                                          ? "bg-emerald-50 text-emerald-800"
                                          : "bg-rose-50 text-rose-800"
                                      }`}
                                      title={examRecord?.notes || undefined}
                                    >
                                      {scoreVal}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-3.5 text-center bg-emerald-50/30">
                              <div className="font-bold text-sm text-[#14352c] font-mono">
                                {st.totalWeightedScore}
                              </div>
                              <div className="w-16 bg-slate-200 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    st.isPassed ? "bg-emerald-600" : "bg-rose-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (st.totalWeightedScore / (totalWeightConfigured || 100)) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </td>

                            <td className="p-3.5 text-center">
                              {getLetterGradeBadge(st.letterGrade, st.isPassed)}
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="font-bold text-xs text-slate-800 font-mono">
                                {st.gpaPoint !== undefined ? st.gpaPoint.toFixed(1) : "-"}
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {st.evaluation || "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEDULED EXAMS CARDS */}
        {activeTab === "EXAMS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#14352c]" />
                <span>الاختبارات والتقييمات المجدولة في هذا المقرر:</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {safeExams.length} اختبار
              </span>
            </div>

            {fetching ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#14352c]" />
                <p className="text-xs text-slate-500 font-medium mt-2">جارٍ جلب الاختبارات...</p>
              </div>
            ) : safeExams.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
                <Award className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">لا توجد اختبارات مجدولة بعد</p>
                <p className="text-xs text-slate-500">
                  اضغط "جدولة اختبار جديد" لإنشاء امتحان فصلي أو كويز أو تقييم عملي للشعبة.
                </p>
                <button
                  onClick={() => setCreateExamModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#14352c] text-white text-xs font-bold hover:bg-[#1b4a3d] transition inline-flex items-center gap-1.5 shadow-sm mt-2"
                >
                  <Plus className="w-4 h-4" />
                  جدولة أول اختبار
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {safeExams.map((ex: any) => {
                  const typeBadge = getExamTypeLabel(ex.type || ex.examType);
                  const gradedCount = ex.gradedCount || 0;
                  const totalStudents = studentRows.length;
                  const isFullyGraded = totalStudents > 0 && gradedCount >= totalStudents;

                  return (
                    <div
                      key={ex._id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${typeBadge.color}`}
                          >
                            {typeBadge.text}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold text-slate-800 ${mono.className}`}>
                              {ex.maxScore} درجة
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              وزن {ex.weightPercentage || 20}%
                            </span>
                          </div>
                        </div>

                        {/* Exam Title & Details */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{ex.title}</h4>
                          <div className="space-y-1 mt-2 text-xs text-slate-500">
                            <p className="flex items-center gap-1.5 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatAcademicDate(ex.examDate || ex.date)}
                            </p>
                            {ex.startTime && (
                              <p className="flex items-center gap-1.5 font-mono">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {ex.startTime} {ex.durationMinutes ? `(${ex.durationMinutes} دقيقة)` : ""}
                              </p>
                            )}
                            {ex.location && (
                              <p className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {ex.location}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Grading Progress Bar */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-600 font-medium">حالة الرصد:</span>
                            <span
                              className={`font-bold font-mono ${
                                isFullyGraded ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {gradedCount} / {totalStudents} طالب
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFullyGraded ? "bg-emerald-600" : "bg-amber-500"
                              }`}
                              style={{
                                width: `${totalStudents > 0 ? (gradedCount / totalStudents) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => openRecordGrades(ex)}
                          className="flex-1 py-2 px-3 bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>رصد / تعديل الدرجات</span>
                        </button>

                        <button
                          onClick={() => setExamToDelete(ex)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                          title="حذف هذا الاختبار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE EXAM DIALOG */}
      <Dialog
        isOpen={createExamModal}
        onClose={() => setCreateExamModal(false)}
        title="جدولة اختبار وتقييم جديد للشعبة"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">عنوان الاختبار:</label>
            <input
              type="text"
              required
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="مثال: امتحان الشهر الأول، كويز 1، الامتحان العملي..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-2 focus:ring-[#14352c]/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">نوع الاختبار:</label>
              <CustomSelect
                options={[
                  { value: "MIDTERM", label: "امتحان فصلي (Midterm)" },
                  { value: "QUIZ", label: "اختبار سريع (Quiz)" },
                  { value: "FINAL", label: "امتحان نهائي (Final)" },
                  { value: "PRACTICAL", label: "امتحان عملي (Practical)" },
                  { value: "ORAL", label: "اختبار شفوي (Oral)" },
                ]}
                value={examType}
                onChange={(val) => setExamType(val)}
                theme="light"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                تاريخ الاختبار:
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                الدرجة القصوى للاختبار:
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={maxScore}
                onChange={(e) => setMaxScore(parseInt(e.target.value) || 30)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold ${mono.className}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                الوزن في السعي (%):
              </label>
              <input
                type="number"
                min="1"
                max={Math.max(1, 100 - totalWeightConfigured)}
                required
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(parseInt(e.target.value) || 20)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold ${mono.className}`}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                المتبقي المتاح: {Math.max(0, 100 - totalWeightConfigured)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                وقت البداية (اختياري):
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                المدة بالدقائق (اختياري):
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="60"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">القاعة الامتحانية (اختياري):</label>
            <input
              type="text"
              value={examLocation}
              onChange={(e) => setExamLocation(e.target.value)}
              placeholder="مثال: القاعة المركزية 3، المختبر 2..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateExamModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={creatingExam}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {creatingExam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ وجدولة الاختبار
            </button>
          </div>
        </form>
      </Dialog>

      {/* RECORD GRADES MODAL */}
      <Dialog
        isOpen={!!recordModal}
        onClose={() => setRecordModal(null)}
        title={`رصد وتعديل درجات: ${recordModal?.title || ""}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveGrades} className="space-y-4">
          {/* Header Info & Uniform Grade Tool */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-950 block">
                الدرجة القصوى: {recordModal?.maxScore} • الوزن في السعي: {recordModal?.weightPercentage}%
              </span>
              <span className="text-[11px] text-emerald-800">
                إجمالي الطلبة: {studentRows.length} طالب
              </span>
            </div>

            {/* Batch Helper */}
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min="0"
                max={recordModal?.maxScore || 100}
                placeholder="رصد موحد"
                value={batchScoreInput}
                onChange={(e) => setBatchScoreInput(e.target.value)}
                className="w-20 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-center text-xs font-bold text-emerald-950 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleApplyBatchScore}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition shadow-2xs"
              >
                تطبيق للجميع
              </button>
            </div>
          </div>

          {/* Quick Filter inside Record Modal */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder="ابحث عن طالب بالاسم أو الرقم الجامعي..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] focus:bg-white"
            />
          </div>

          {/* Student Roster Grades Input List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {studentRows.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">
                لا يوجد طلبة مسجلين في هذه الشعبة بعد.
              </p>
            ) : (
              studentRows
                .filter((st: any) => {
                  if (!recordSearch.trim()) return true;
                  return (
                    (st.name || "").toLowerCase().includes(recordSearch.toLowerCase()) ||
                    (st.studentId || "").toLowerCase().includes(recordSearch.toLowerCase())
                  );
                })
                .map((st: any) => {
                  const currentScore = studentScores[st._id]?.score ?? "";
                  const currentNote = studentScores[st._id]?.notes ?? "";

                  return (
                    <div
                      key={st._id}
                      className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{st.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {st.studentId || st.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="text"
                          placeholder="ملاحظة..."
                          value={currentNote}
                          onChange={(e) =>
                            setStudentScores((prev) => ({
                              ...prev,
                              [st._id]: {
                                score: prev[st._id]?.score ?? "",
                                notes: e.target.value,
                              },
                            }))
                          }
                          className="w-28 sm:w-36 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:bg-white"
                        />

                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-500 font-semibold">
                            الدرجة:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={recordModal?.maxScore || 100}
                            step="any"
                            value={currentScore}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setStudentScores((prev) => ({
                                ...prev,
                                [st._id]: {
                                  score: val,
                                  notes: prev[st._id]?.notes ?? "",
                                },
                              }));
                            }}
                            className={`w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold text-[#14352c] focus:outline-none focus:border-[#14352c] shadow-2xs ${mono.className}`}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRecordModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={savingGrades || studentRows.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {savingGrades ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              اعتماد وحفظ الدرجات
            </button>
          </div>
        </form>
      </Dialog>

      {/* DELETE EXAM CONFIRMATION DIALOG */}
      <Dialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        title="تأكيد حذف الاختبار"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-rose-900">تحذير حذف الاختبار والدرجات المرتبطة</p>
              <p className="text-rose-700 mt-0.5 leading-relaxed">
                هل أنت متأكد من حذف اختبار{" "}
                <span className="font-bold underline">{examToDelete?.title}</span>؟ سيؤدي ذلك إلى حذف
                كافة درجات الطلبة المرصودة في هذا الامتحان وإعادة احتساب السعي التراكمي.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setExamToDelete(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
            >
              إلغاء التراجع
            </button>
            <button
              type="button"
              disabled={deletingExam}
              onClick={confirmDeleteExam}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {deletingExam ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              تأكيد الحذف النهائي
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function DoctorGradesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
          <RefreshCw className="w-8 h-8 animate-spin text-[#14352c]" />
        </div>
      }
    >
      <DoctorGradesContent />
    </Suspense>
  );
}
