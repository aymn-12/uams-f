"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from '@/components/Navbar';
import Dialog from "@/components/Dialog";
import CustomSelect from "@/components/CustomSelect";
import {
  UploadCloud,
  Plus,
  FileText,
  Trash2,
  Calendar,
  RefreshCw,
  Download,
  BookOpen,
} from "lucide-react";

const mono = { className: "font-mono" };

export default function DoctorMaterialsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [materials, setMaterials] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Upload Dialog
  const [uploadModal, setUploadModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Status Dialog
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
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    apiFetch("/dashboards/doctor")
      .then((res) => {
        const secList = res.data?.sections || [];
        setSections(secList);
        if (secList.length > 0) {
          const remembered = smartCache.getWorkspace("doctor_selected_section", "");
          const activeSecId = secList.some((s: any) => s._id === remembered) ? remembered : secList[0]._id;
          setSelectedSection(activeSecId);
          loadMaterials(activeSecId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const loadMaterials = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      const res = await apiFetch(`/materials/section/${secId}`);
      setMaterials(res.data || []);
    } catch {
      setMaterials([]);
    } finally {
      setFetching(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !title.trim() || !file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sectionId", selectedSection);
      formData.append("title", title.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }

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
        throw new Error(resData.message || "فشل رفع الملف");
      }

      setUploadModal(false);
      setTitle("");
      setDescription("");
      setFile(null);
      setDialog({
        isOpen: true,
        title: "تم رفع المحاضرة بنجاح",
        message: "الملف متاح الآن لجميع طلبة الشعبة للدراسة والتدوين.",
        type: "success",
      });

      loadMaterials(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في الرفع",
        message: err.message || "تعذر رفع المحاضرة.",
        type: "danger",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await apiFetch(`/materials/${id}`, { method: "DELETE" });
      setMaterials((prev) => prev.filter((m) => m._id !== id));
      setDialog({
        isOpen: true,
        title: "تم حذف المحاضرة",
        message: "تمت إزالة الملف الأكاديمي من الشعبة بنجاح.",
        type: "success",
      });
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في الحذف",
        message: err.message || "فشل حذف المحاضرة.",
        type: "danger",
      });
    }
  };

  const sectionOptions = useMemo(() => {
    return sections.map((sec: any) => ({
      value: sec._id,
      label: sec.courseName || sec.course?.name || "المادة",
      subLabel: `شعبة ${sec.sectionNumber || "1"}`,
    }));
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
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة التدريسي
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">المحاضرات والملازم</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <UploadCloud className="w-7 h-7 text-[#14352c]" />
              المحاضرات والملازم الدراسية
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              رفع وتوزيع المناهج، العروض التقديمية، وملفات المحاضرات لشعبك الدراسية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sections.length > 0 && (
              <CustomSelect
                options={sectionOptions}
                value={selectedSection}
                onChange={(val) => {
                  setSelectedSection(val);
                  smartCache.setWorkspace("doctor_selected_section", val);
                  loadMaterials(val);
                }}
                className="min-w-[240px]"
                theme="light"
              />
            )}

            <button
              onClick={() => setUploadModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              رفع محاضرة جديدة
            </button>
          </div>
        </div>

        {/* Materials List */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-medium">جارٍ جلب المحاضرات الدراسية...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لم يتم رفع ملازم لهذه الشعبة بعد</h3>
            <p className="text-xs text-slate-500">اضغط "رفع محاضرة جديدة" لنشر أول ملف لطلبتك.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {materials.map((m: any) => (
              <div
                key={m._id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-4 shadow-sm transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono uppercase">
                      {m.fileType || "PDF"}
                    </span>
                    <span className={`text-xs text-slate-500 ${mono.className}`}>
                      {m.fileSize ? `${(m.fileSize / (1024 * 1024)).toFixed(1)} MB` : "ملف"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#14352c]" />
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className={`text-xs text-slate-500 flex items-center gap-1.5 ${mono.className}`}>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatAcademicDate(m.createdAt)}
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const token = typeof window !== "undefined" ? localStorage.getItem("uams_access_token") : "";
                      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
                      const dlUrl = `${apiBase}/api/files/material/${m._id}/download?token=${encodeURIComponent(token || "")}`;
                      return (
                        <a
                          href={dlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#14352c] text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          تحميل
                        </a>
                      );
                    })()}

                    <button
                      onClick={() => handleDeleteMaterial(m._id)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
                      title="حذف المحاضرة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        title="رفع محاضرة / ملزمة دراسية جديدة"
      >
        <form onSubmit={handleUploadMaterial} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان المحاضرة:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المحاضرة الثالثة - البرمجة كائنية التوجه..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الوصف والملخص:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لموضوع المحاضرة..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر الملف (PDF / مستند):</label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#14352c]/10 file:text-[#14352c]"
            />
          </div>

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
              disabled={uploading}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              تأكيد الرفع
            </button>
          </div>
        </form>
      </Dialog>

      {/* Status Feedback Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        type={dialog.type}
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium">{dialog.message}</p>
          <button
            onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
            className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </Dialog>
    </div>
  );
}
