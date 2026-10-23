"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import DoctorNav from "@/components/DoctorNav";
import Dialog from "@/components/Dialog";
import CustomSelect from "@/components/CustomSelect";
import {
  FileCheck2,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Award,
  Send,
  FileText,
  Clock,
} from "lucide-react";

import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";

const mono = { className: "font-mono" };

export default function DoctorAssignmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Create Assignment Dialog with draft persistence
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState<number>(10);
  const [creating, setCreating] = useState(false);

  // Submissions Modal
  const [viewSubmissionsModal, setViewSubmissionsModal] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Grade Modal
  const [gradeModal, setGradeModal] = useState<any | null>(null);
  const [score, setScore] = useState<number>(10);
  const [feedback, setFeedback] = useState("");
  const [grading, setGrading] = useState(false);

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
          loadAssignments(activeSecId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const loadAssignments = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      const res = await apiFetch(`/assignments/section/${secId}`);
      setAssignments(res.data || []);
    } catch {
      setAssignments([]);
    } finally {
      setFetching(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !title.trim() || !dueDate) return;
    setCreating(true);

    try {
      await apiFetch("/assignments", {
        method: "POST",
        body: JSON.stringify({
          sectionId: selectedSection,
          title: title.trim(),
          description: description.trim(),
          deadline: dueDate,
          dueDate: dueDate,
          maxScore: Number(maxScore) || 10,
        }),
      });

      setCreateModal(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setDialog({
        isOpen: true,
        title: "تم نشر الواجب بنجاح",
        message: "تم تعميم التكليف على طلبة الشعبة وإتاحته للتسليم الأكاديمي.",
        type: "success",
      });

      loadAssignments(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في إنشاء الواجب",
        message: err.message || "تعذر إنشاء الواجب.",
        type: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenSubmissions = async (assignment: any) => {
    setViewSubmissionsModal(assignment);
    setLoadingSubmissions(true);
    try {
      const res = await apiFetch(`/assignments/${assignment._id}/submissions`);
      setSubmissions(res.data || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleOpenGradeDialog = (sub: any) => {
    setGradeModal(sub);
    setScore(sub.score || 10);
    setFeedback(sub.feedback || "");
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeModal) return;
    setGrading(true);

    try {
      await apiFetch(`/assignments/submissions/${gradeModal._id}/grade`, {
        method: "PUT",
        body: JSON.stringify({
          score: Number(score),
          feedback: feedback.trim() || undefined,
        }),
      });

      setGradeModal(null);
      setDialog({
        isOpen: true,
        title: "تم رصد الدرجة بنجاح",
        message: "تم تثبيت تقييم الطالب وإشعاره بنتيجة التكليف.",
        type: "success",
      });

      if (viewSubmissionsModal) {
        handleOpenSubmissions(viewSubmissionsModal);
      }
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في الرصد",
        message: err.message || "فشل رصد الدرجة.",
        type: "danger",
      });
    } finally {
      setGrading(false);
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
      <DoctorNav user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard/doctor" className="hover:text-[#14352c] transition">
                لوحة التدريسي
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">الواجبات والتصحيح</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <FileCheck2 className="w-7 h-7 text-[#14352c]" />
              الواجبات والتصحيح الأكاديمي
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              إنشاء التكليفات الدراسية، مراجعة تسليمات الطلبة، وتثبيت الدرجات والتغذية الراجعة
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
                  loadAssignments(val);
                }}
                className="min-w-[240px]"
                theme="light"
              />
            )}

            <button
              onClick={() => setCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              تكليف واجب جديد
            </button>
          </div>
        </div>

        {/* Assignments List */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-medium">جارٍ جلب التكليفات الأكاديمية...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <FileText className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لا توجد واجبات منشأة لهذه الشعبة</h3>
            <p className="text-xs text-slate-500">اضغط على زر "تكليف واجب جديد" لتعيين تكليف للطلبة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {assignments.map((item: any) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-4 shadow-sm transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                      الدرجة القصوى: {item.maxScore}
                    </span>
                    <span className={`text-xs text-slate-500 flex items-center gap-1.5 ${mono.className}`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatAcademicDate(item.deadline || item.dueDate)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    متابعة وتقييم
                  </span>

                  <button
                    onClick={() => handleOpenSubmissions(item)}
                    className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#14352c] text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    عرض وتصحيح التسليمات
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Assignment Dialog */}
      <Dialog
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="تكليف واجب أكاديمي جديد"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">عنوان الواجب:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: الواجب الأول - هياكل البيانات..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-2 focus:ring-[#14352c]/10"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">تفاصيل ومحتوى التكليف:</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصف التكليف والتعليمات المطلوبة من الطلبة..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-2 focus:ring-[#14352c]/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">آخر موعد للتسليم:</label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">الدرجة القصوى:</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={maxScore}
                onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold ${mono.className}`}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              تأكيد ونشر التكليف
            </button>
          </div>
        </form>
      </Dialog>

      {/* Submissions List Dialog */}
      <Dialog
        isOpen={!!viewSubmissionsModal}
        onClose={() => setViewSubmissionsModal(null)}
        title={`تسليمات: ${viewSubmissionsModal?.title || ""}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {loadingSubmissions ? (
            <p className="text-center text-xs text-slate-500 py-10">جارٍ جلب إجابات الطلبة...</p>
          ) : submissions.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-10">لم يقم أي طالب بتسليم الحل بعد.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub: any) => (
                <div
                  key={sub._id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{sub.student?.name || "طالب"}</span>
                      {sub.status === "GRADED" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          تم التصحيح ({sub.score} درجة)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          بانتظار التقييم
                        </span>
                      )}
                    </div>
                    {sub.submissionText && (
                      <p className="text-slate-600 line-clamp-2">{sub.submissionText}</p>
                    )}
                    {sub.attachmentUrl && (
                      <a
                        href={sub.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#14352c] hover:underline inline-flex items-center gap-1 font-mono text-[11px] font-bold"
                      >
                        <ExternalLink className="w-3 h-3" /> استعراض الرابط أو الملف
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenGradeDialog(sub)}
                    className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Award className="w-3.5 h-3.5" />
                    {sub.status === "GRADED" ? "تعديل الدرجة" : "رصد الدرجة"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Grade Submission Dialog */}
      <Dialog
        isOpen={!!gradeModal}
        onClose={() => setGradeModal(null)}
        title={`تقييم تسليم الطالب: ${gradeModal?.student?.name || ""}`}
      >
        <form onSubmit={handleSubmitGrade} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              الدرجة المستحقة (الحد الأقصى: {viewSubmissionsModal?.maxScore || 10}):
            </label>
            <input
              type="number"
              min="0"
              max={viewSubmissionsModal?.maxScore || 100}
              required
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
              className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#14352c] ${mono.className}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              ملاحظات وتغذية راجعة للطالب:
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="اكتب توجيهاتك أو ملاحظاتك العلمية للحل..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setGradeModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={grading}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {grading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              حفظ التقييم
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
          <p className="text-xs text-slate-600 leading-relaxed">{dialog.message}</p>
          <button
            onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
            className="w-full py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition shadow-sm"
          >
            إغلاق
          </button>
        </div>
      </Dialog>
    </div>
  );
}
