"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";
import Navbar from '@/components/Navbar';
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Calendar,
  RefreshCw,
  Users,
  CheckCircle2,
  Building2,
  AlertCircle,
} from "lucide-react";

const mono = { className: "font-mono" };

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Create Announcement Dialog
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("ALL");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    // Security check: Only ADMIN role allowed
    if (!stored || stored.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Smart Caching
    const cached = smartCache.get<any[]>("/announcements");
    if (cached?.data) {
      setAnnouncements(cached.data);
      setLoading(false);
    }

    loadAnnouncements();
  }, [router]);

  const loadAnnouncements = async () => {
    setFetching(true);
    try {
      const res = await apiFetch("/announcements");
      const list = res.data || [];
      setAnnouncements(list);
      smartCache.set("/announcements", list);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);

    try {
      await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          targetAudience,
          isPinned,
        }),
      });

      // Invalidate caches
      smartCache.invalidate("/announcements*");

      setCreateModal(false);
      setTitle("");
      setContent("");
      setIsPinned(false);
      setDialog({
        isOpen: true,
        title: "تم نشر البيان الأكاديمي",
        message: "تم تعميم الإعلان وإشعاره رسميًا على لوحة الإعلانات الجامعية.",
        type: "success",
      });

      loadAnnouncements();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "فشل نشر الإعلان",
        message: err.message || "تعذر نشر التبليغ.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await apiFetch(`/announcements/${id}`, { method: "DELETE" });
      smartCache.invalidate("/announcements*");
      loadAnnouncements();
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في الحذف",
        message: err.message || "تعذر حذف الإعلان.",
        type: "danger",
      });
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/admin" className="hover:text-[#14352c] transition">
                لوحة الإدارة
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">التعميمات والأوامر الإدارية</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Megaphone className="w-7 h-7 text-[#14352c]" />
              التعميمات والتبليغات الرسمية
            </h1>
            <p className="text-sm text-slate-600">
              إصدار الأوامر الجامعية، التبليغات العاجلة، وإدارة لوحة الإعلانات المركزية
            </p>
          </div>

          <button
            onClick={() => setCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إصدار إعلان جديد
          </button>
        </div>

        {/* Announcements List */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-medium">جارٍ جلب التعميمات الجامعية...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لا توجد إعلانات منشورة حالياً</h3>
            <p className="text-xs text-slate-500">اضغط على زر "إصدار إعلان جديد" لنشر أول بيان رسمي.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann: any) => (
              <div
                key={ann._id}
                className={`p-6 rounded-2xl border shadow-sm transition space-y-4 ${
                  ann.isPinned
                    ? "bg-white border-[#14352c] ring-1 ring-[#14352c]/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {ann.isPinned && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#14352c] border border-emerald-200 flex items-center gap-1">
                          <Pin className="w-3 h-3" /> مثبت في الصدارة
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        موجه إلى: {ann.targetAudience === "STUDENTS" ? "الطلبة" : ann.targetAudience === "DOCTORS" ? "التدريسيين" : "الجميع"}
                      </span>
                      <span className={`text-[11px] text-slate-500 flex items-center gap-1 ${mono.className}`}>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatAcademicDate(ann.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{ann.content}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteAnnouncement(ann._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                    title="حذف الإعلان"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="إصدار إعلان / تعميم جامعي جديد"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان الإعلان الرسمي:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: موعد بدء الامتحانات النهائية للفصل الدراسي الأول..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">نص البيان أو التبليغ:</label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب نص القرار الجامعي أو التوجيه الإداري بالتفصيل..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الفئة المستهدفة:</label>
              <CustomSelect
                options={[
                  { value: "ALL", label: "الجميع (كافة الكادر والطلبة)" },
                  { value: "STUDENTS", label: "الطلبة فقط" },
                  { value: "DOCTORS", label: "الكادر التدريسي فقط" },
                ]}
                value={targetAudience}
                onChange={(val) => setTargetAudience(val)}
                theme="light"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-[#14352c] focus:ring-[#14352c]"
                />
                تثبيت الإعلان في الصدارة
              </label>
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
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
              نشر وتعميم الإعلان
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
