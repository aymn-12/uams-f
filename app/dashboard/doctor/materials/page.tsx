"use client";

import { useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import LatticeLoader from "@/components/ui/lattice-loader";
import FuseButton from "@/components/ui/fuse-button";
import {
  UploadCloud,
  Plus,
  FileText,
  Trash2,
  Calendar,
  RefreshCw,
  Download,
  BookOpen,
  Search,
  Filter,
  File,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  Layers,
  Sparkles,
  FileSpreadsheet,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";

const mono = { className: "font-mono" };

const toArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val?.data && Array.isArray(val.data.data)) return val.data.data;
  return [];
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileTheme(fileType?: string, fileName?: string) {
  const type = (fileType || "").toLowerCase();
  const name = (fileName || "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return {
      label: "PDF",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      iconClass: "text-rose-600 bg-rose-50",
    };
  }
  if (
    type.includes("presentation") ||
    type.includes("powerpoint") ||
    name.endsWith(".pptx") ||
    name.endsWith(".ppt")
  ) {
    return {
      label: "PPTX",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      iconClass: "text-amber-600 bg-amber-50",
    };
  }
  if (
    type.includes("word") ||
    type.includes("document") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return {
      label: "DOCX",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      iconClass: "text-blue-600 bg-blue-50",
    };
  }
  return {
    label: "ملف",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    iconClass: "text-slate-600 bg-slate-100",
  };
}

function DoctorMaterialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [materials, setMaterials] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Search & Type Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Upload Dialog State
  const [uploadModal, setUploadModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("LECTURE");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation State
  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Floating Shadcn Alert State (auto-dismiss after 3.5s)
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
  const safeMaterials = useMemo(() => toArray(materials), [materials]);

  // Selected Section Object
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

  // Load Sections
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
          loadMaterials(activeId);
        }
      } catch (err) {
        console.error("Failed to load doctor sections:", err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [router, searchParams]);

  // Load Materials for a Section
  const loadMaterials = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      const res = await apiFetch(`/materials/section/${secId}`);
      setMaterials(toArray(res));
    } catch {
      setMaterials([]);
    } finally {
      setFetching(false);
    }
  };

  // Drag & Drop Handlers
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
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title.trim()) {
        const cleanName = droppedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(cleanName);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title.trim()) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(cleanName);
      }
    }
  };

  // Upload Material
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !title.trim() || !file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sectionId", selectedSection);
      formData.append("title", title.trim());

      const fullDesc = description.trim()
        ? `[${category === "SYLLABUS" ? "خطة المنهج" : category === "REFERENCE" ? "مرجع إثرائي" : "محاضرة أسبوعية"}] ${description.trim()}`
        : `[${category === "SYLLABUS" ? "خطة المنهج" : category === "REFERENCE" ? "مرجع إثرائي" : "محاضرة أسبوعية"}]`;

      formData.append("description", fullDesc);
      formData.append("isLecture", category === "LECTURE" ? "true" : "false");

      const token = localStorage.getItem("uams_access_token");
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/files/material`
        : "http://localhost:5000/api/files/material";

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-Protection": "1",
        },
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "فشل رفع الملف إلى الخادم");
      }

      smartCache.invalidate("/materials*");
      smartCache.invalidate("/dashboards*");

      setUploadModal(false);
      setTitle("");
      setDescription("");
      setFile(null);
      setCategory("LECTURE");

      setAlert({
        title: "تم نشر المحاضرة بنجاح",
        message: `تم رفع ملف (${file.name}) ونشره لطلبة الشعبة وإشعارهم تلقائياً.`,
        type: "success",
      });

      loadMaterials(selectedSection);
    } catch (err: any) {
      setAlert({
        title: "خطأ في رفع الملف",
        message: err.message || "تعذر رفع المحاضرة. يرجى التحقق من حجم وصيغة الملف.",
        type: "danger",
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete Material
  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    setDeleting(true);

    try {
      await apiFetch(`/materials/${materialToDelete._id}`, { method: "DELETE" });
      setMaterials((prev) => prev.filter((m) => m._id !== materialToDelete._id));
      setMaterialToDelete(null);

      setAlert({
        title: "تم حذف المحاضرة",
        message: "تمت إزالة الملف من مكتبة الشعبة بنجاح.",
        type: "info",
      });
    } catch (err: any) {
      setAlert({
        title: "خطأ في الحذف",
        message: err.message || "تعذر حذف المحاضرة.",
        type: "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return safeMaterials.filter((m: any) => {
      const matchSearch =
        !searchQuery.trim() ||
        (m.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.fileName || "").toLowerCase().includes(searchQuery.toLowerCase());

      const desc = (m.description || "").toLowerCase();
      const matchCategory =
        categoryFilter === "ALL"
          ? true
          : categoryFilter === "SYLLABUS"
          ? desc.includes("خطة المنهج")
          : categoryFilter === "REFERENCE"
          ? desc.includes("مرجع إثرائي")
          : !desc.includes("خطة المنهج") && !desc.includes("مرجع إثرائي");

      return matchSearch && matchCategory;
    });
  }, [safeMaterials, searchQuery, categoryFilter]);

  // Stats calculation
  const totalStorageBytes = useMemo(() => {
    return safeMaterials.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  }, [safeMaterials]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <LatticeLoader
          status="working"
          label="تحميل المحاضرات والمواد..."
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
              <span className="text-[#14352c] font-semibold">المحاضرات والملازم</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <UploadCloud className="w-6 h-6 text-[#14352c]" />
              المحاضرات والملازم الدراسية
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              رفع وتوزيع المناهج، العروض التقديمية، وملفات الـ PDF لطلبتك بضغطة زر
            </p>
          </div>

          {/* Section Selector & Upload Action */}
          <div className="flex flex-wrap items-center gap-3">
            {safeSections.length > 0 && (
              <div className="w-full sm:w-72">
                <CustomSelect
                  options={sectionOptions}
                  value={selectedSection}
                  onChange={(val) => {
                    setSelectedSection(val);
                    smartCache.setWorkspace("doctor_selected_section", val);
                    loadMaterials(val);
                  }}
                  theme="light"
                  className="w-full"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setUploadModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>رفع محاضرة جديدة</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION SUMMARY & STORAGE KPI BAR                           */}
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
              <span className="text-[10px] text-slate-500 block">الملفات المنشورة</span>
              <span className={`text-xs font-bold text-slate-900 ${mono.className}`}>
                {safeMaterials.length} ملفات
              </span>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block">الحجم الإجمالي</span>
              <span className={`text-xs font-bold text-slate-900 ${mono.className}`}>
                {formatBytes(totalStorageBytes)}
              </span>
            </div>

            {/* Quick Link to Student Grades of this section */}
            <Link
              href={`/dashboard/doctor/grades?sectionId=${selectedSection}`}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14352c] border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5"
              title="الانتقال لرصد درجات هذه الشعبة"
            >
              <span>رصد السعي</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SEARCH & CATEGORY FILTER BAR                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                categoryFilter === "ALL"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              الكل ({safeMaterials.length})
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("LECTURE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                categoryFilter === "LECTURE"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              المحاضرات الأسبوعية
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("SYLLABUS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                categoryFilter === "SYLLABUS"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              خطة المنهج (Syllabus)
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("REFERENCE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                categoryFilter === "REFERENCE"
                  ? "bg-[#14352c] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              المراجع الإثرائية
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عنوان المحاضرة أو الملف..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RICH MATERIALS GRID                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
            <LatticeLoader
              status="working"
              label="جارٍ تحميل المحاضرات والملازم الدراسية..."
              pattern="snake"
              grid={4}
              cellSize={5}
              gap={2}
              fontSize={13}
              showTimer={true}
              color="#14352c"
            />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">لا توجد محاضرات منشورة</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              اضغط على زر "رفع محاضرة جديدة" لنشر ملفات الـ PDF أو سلايدات البوربوينت لطلبتك فورياً.
            </p>
            <button
              type="button"
              onClick={() => setUploadModal(true)}
              className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>رفع أول محاضرة الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMaterials.map((m: any) => {
              const fileTheme = getFileTheme(m.fileType, m.fileName);

              return (
                <div
                  key={m._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md p-5 flex flex-col justify-between space-y-4 shadow-xs transition group"
                >
                  <div className="space-y-3">
                    {/* Header: File Type Badge & Size */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs ${fileTheme.iconClass}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border font-mono ${fileTheme.badgeClass}`}>
                          {fileTheme.label}
                        </span>
                      </div>
                      <span className={`text-xs text-slate-400 font-mono ${mono.className}`}>
                        {formatBytes(m.fileSize)}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#14352c] transition leading-snug line-clamp-2">
                        {m.title}
                      </h4>
                      {m.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {m.description.replace(/^\[.*?\]\s*/, "")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer Meta & Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className={`text-[11px] text-slate-400 flex items-center gap-1 ${mono.className}`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatAcademicDate(m.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Direct Secure Download */}
                      {(() => {
                        const token = typeof window !== "undefined" ? localStorage.getItem("uams_access_token") : "";
                        const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
                        const dlUrl = `${apiBase}/api/files/material/${m._id}/download?token=${encodeURIComponent(token || "")}`;

                        return (
                          <a
                            href={dlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#14352c] border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                            title="تحميل الملف"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تحميل</span>
                          </a>
                        );
                      })()}

                      {/* Delete Button with Safety Dialog */}
                      <button
                        type="button"
                        onClick={() => setMaterialToDelete(m)}
                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
                        title="حذف المحاضرة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
      {/* DRAG & DROP UPLOAD MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        title="رفع محاضرة أو ملزمة دراسية جديدة"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUploadMaterial} className="space-y-4">
          {/* Target Section Reminder */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">الشعبة المستهدفة:</span>
            <span className="font-bold text-[#14352c]">
              {currentSectionObj?.course?.name} (شعبة {currentSectionObj?.sectionNumber})
            </span>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#14352c] bg-emerald-50/50 scale-[0.99]"
                : file
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-300 hover:border-[#14352c] bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              required={!file}
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center gap-3 text-right overflow-hidden">
                  <div className="size-10 rounded-lg bg-emerald-50 text-[#14352c] flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{file.name}</h5>
                    <span className={`text-[10px] text-slate-500 font-mono ${mono.className}`}>
                      {formatBytes(file.size)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                  title="إلغاء الملف"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="size-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-[#14352c] shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    اسحب وأفلت الملف هنا، أو <span className="text-[#14352c] underline">تصفح من جهازك</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    يدعم ملفات PDF، عروض البوربوينت (PPTX)، ومستندات Word
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              عنوان المحاضرة أو الملزمة:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المحاضرة 3 - معمارية المعالجات الدقيقة"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تصنيف المحتوى:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory("LECTURE")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  category === "LECTURE"
                    ? "bg-[#14352c] text-white border-[#14352c]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                محاضرة أسبوعية
              </button>

              <button
                type="button"
                onClick={() => setCategory("SYLLABUS")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  category === "SYLLABUS"
                    ? "bg-[#14352c] text-white border-[#14352c]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                خطة المنهج
              </button>

              <button
                type="button"
                onClick={() => setCategory("REFERENCE")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  category === "REFERENCE"
                    ? "bg-[#14352c] text-white border-[#14352c]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                مرجع إثرائي
              </button>
            </div>
          </div>

          {/* Description / Student Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              وصف أو ملاحظات للطلبة (اختياري):
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: يرجى مراجعة الصفحات من 15 إلى 25 قبل موعد المختبر القادم..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUploadModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {uploading ? (
                <LatticeLoader
                  status="working"
                  label="جارٍ الرفع..."
                  pattern="orbit"
                  grid={3}
                  cellSize={3.5}
                  gap={1.5}
                  fontSize={11}
                  showTimer={true}
                  color="#ffffff"
                />
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  نشر لطلبة الشعبة
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
        isOpen={!!materialToDelete}
        onClose={() => setMaterialToDelete(null)}
        title="تأكيد حذف المحاضرة"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-rose-900">
                هل أنت متأكد من رغبتك في حذف هذا الملف؟
              </h5>
              <p className="text-xs text-rose-700 leading-relaxed">
                الملف: <span className="font-bold">{materialToDelete?.title}</span>
                <br />
                سيتم حذفه نهائياً من خادم الكلية ولن يتمكن طلبة الشعبة من الوصول إليه.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMaterialToDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              إلغاء
            </button>

            <FuseButton
              label="تأكيد الحذف النهائي"
              undoLabel="تراجع عن الحذف"
              doneLabel="تم حذف المحاضرة"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              color="#ffffff"
              background="#e11d48"
              fuseColor="#facc15"
              size="sm"
              radius={12}
              undoWindow={3500}
              fuse="outline"
              commitOn="fuseEnd"
              disabled={deleting}
              onCommit={confirmDeleteMaterial}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function DoctorMaterialsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
          <LatticeLoader
            status="working"
            label="تحميل المحاضرات والمواد..."
            pattern="orbit"
            grid={3}
            cellSize={5}
            gap={2}
            fontSize={14}
            showTimer={false}
            color="#14352c"
          />
        </div>
      }
    >
      <DoctorMaterialsContent />
    </Suspense>
  );
}
