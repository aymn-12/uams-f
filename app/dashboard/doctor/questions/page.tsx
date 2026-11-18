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
import ConfirmDialog from "@/components/ConfirmDialog";
import CustomSelect from "@/components/CustomSelect";
import LatticeLoader from "@/components/ui/lattice-loader";
import {
  MessagesSquare,
  HelpCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Send,
  MessageCircle,
  Clock,
  GraduationCap,
  Globe,
  Lock,
  EyeOff,
} from "lucide-react";

const mono = { className: "font-mono" };

type FilterTab = "all" | "public" | "private" | "pending";

export default function DoctorQuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Stream Filter Tabs
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Answer Dialog
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Publish-to-Class Dialog (privacy toggle with optional anonymization)
  const [publishTarget, setPublishTarget] = useState<any | null>(null);
  const [anonymize, setAnonymize] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Delete Confirmation
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

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
          loadQuestions(activeSecId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const loadQuestions = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      // Always fetch from the server: the Q&A stream is interactive and
      // privacy-scoped, so a cached snapshot must never be rendered.
      const res = await apiFetch(`/questions/section/${secId}`, { skipCache: true });
      setQuestions(res.data || []);
    } catch {
      setQuestions([]);
    } finally {
      setFetching(false);
    }
  };

  const openAnswerDialog = (q: any) => {
    setActiveQuestion(q);
    setAnswerText(q.answerText || q.answer || "");
  };

  const handleSaveAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !answerText.trim()) return;
    setSubmittingAnswer(true);

    try {
      await apiFetch(`/questions/${activeQuestion._id}/answer`, {
        method: "PUT",
        body: JSON.stringify({
          answerText: answerText.trim(),
          answer: answerText.trim(),
        }),
      });

      setActiveQuestion(null);
      setDialog({
        isOpen: true,
        title: "تم توثيق الإجابة بنجاح",
        message: "تم نشر إجابتك الأكاديمية على حائط الشعبة وإشعار الطالب مباشرة.",
        type: "success",
      });

      loadQuestions(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في الرد",
        message: err.message || "تعذر حفظ الإجابة.",
        type: "danger",
      });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await apiFetch(`/questions/${questionToDelete}`, { method: "DELETE" });
      setQuestions((prev) => prev.filter((q) => q._id !== questionToDelete));
      setQuestionToDelete(null);
      setDialog({
        isOpen: true,
        title: "تم الحذف",
        message: "تمت إزالة السؤال من الحائط بنجاح.",
        type: "success",
      });
    } catch {
      setQuestionToDelete(null);
      setDialog({
        isOpen: true,
        title: "خطأ في الحذف",
        message: "تعذر حذف السؤال حالياً.",
        type: "danger",
      });
    }
  };

  const openPublishDialog = (q: any) => {
    setPublishTarget(q);
    setAnonymize(false);
  };

  const handlePublishToClass = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    try {
      await apiFetch(`/questions/${publishTarget._id}/privacy`, {
        method: "PUT",
        body: JSON.stringify({ isPrivate: false, anonymize }),
      });

      setPublishTarget(null);
      setDialog({
        isOpen: true,
        title: "تم النشر على حائط الشعبة",
        message: anonymize
          ? "تم نشر الاستشارة على حائط الشعبة مع إخفاء اسم الطالب، وستصل إشعاراً له بإتمام النشر."
          : "تم نشر الاستشارة على حائط الشعبة ليتسنى لجميع الطلبة الاطلاع على المحتوى العلمي.",
        type: "success",
      });
      loadQuestions(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "تعذر النشر",
        message: err.message || "حدث خطأ أثناء نشر الاستشارة على حائط الشعبة.",
        type: "danger",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleTabChange = (t: FilterTab) => {
    setActiveTab(t);
    smartCache.setWorkspace("doctor_questions_tab", t);
  };

  // Tab counts
  const metrics = useMemo(() => {
    const total = questions.length;
    const publicCount = questions.filter((q) => !q.isPrivate).length;
    const privateCount = questions.filter((q) => q.isPrivate).length;
    const pending = questions.filter((q) => !q.isAnswered).length;
    return { total, publicCount, privateCount, pending };
  }, [questions]);

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (activeTab === "public" && q.isPrivate) return false;
      if (activeTab === "private" && !q.isPrivate) return false;
      if (activeTab === "pending" && q.isAnswered) return false;
      return true;
    });
  }, [questions, activeTab]);

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
        <LatticeLoader
          status="working"
          label="تحميل استفسارات الطلبة..."
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
              <span className="text-[#14352c] font-semibold">حائط المناقشات</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <MessagesSquare className="w-7 h-7 text-[#14352c]" />
              حائط استفسارات ومناقشات الشعبة
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              متابعة تساؤلات الطلبة، تقديم الإرشادات العلمية، وتثبيت الإجابات النموذجية المعتمدة
            </p>
          </div>

          <div className="flex items-center gap-3">
            {sections.length > 0 && (
              <CustomSelect
                options={sectionOptions}
                value={selectedSection}
                onChange={(val) => {
                  setSelectedSection(val);
                  smartCache.setWorkspace("doctor_selected_section", val);
                  loadQuestions(val);
                }}
                className="min-w-[240px]"
                theme="light"
              />
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "all"
                  ? "bg-[#14352c] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              الكل ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("public")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "public"
                  ? "bg-[#14352c] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              عامة ({metrics.publicCount})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("private")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "private"
                  ? "bg-[#14352c] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              استشارات خاصة ({metrics.privateCount})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "pending"
                  ? "bg-[#14352c] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              بانتظار الإجابة ({metrics.pending})
            </button>
          </div>
        </div>

        {/* Questions Stream */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-medium">جارٍ جلب استفسارات الشعبة...</p>
          </div>
        ) : visibleQuestions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === "private" ? "لا توجد استشارات خاصة في هذه الشعبة" : "لا توجد أسئلة مطروحة في هذه الشعبة"}
            </h3>
            <p className="text-xs text-slate-500">ستظهر استفسارات طلبتك هنا فور طرحها في حائط المقرر.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleQuestions.map((q: any) => {
              const studentName = q.student?.name || "طالب جامعي";
              const studentInitial = studentName.trim().charAt(0);

              let cardTitle = q.title || "";
              let cardContent = q.content || q.questionText || "";
              if (!cardTitle && cardContent.includes("\n\n")) {
                const parts = cardContent.split("\n\n");
                cardTitle = parts[0];
                cardContent = parts.slice(1).join("\n\n");
              }

              const doctorAnswer = q.answerText || q.answer;

              return (
                <article
                  key={q._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 space-y-4 shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-slate-100 border border-slate-200 text-[#14352c] font-bold flex items-center justify-center text-sm shrink-0">
                        {studentInitial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{studentName}</span>
                          {q.isPrivate ? (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 bg-[#14352c] text-white border border-[#14352c] shadow-sm">
                              <Lock className="w-3 h-3" />
                              استشارة خاصة
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200/80">
                              <Globe className="w-3 h-3" />
                              عام
                            </span>
                          )}
                          {q.isAnonymized && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                              منشور مجهولاً
                            </span>
                          )}
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              q.isAnswered
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {q.isAnswered ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                تمت الإجابة
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                بانتظار ردك
                              </>
                            )}
                          </span>
                        </div>
                        <p className={`text-xs text-slate-500 mt-0.5 ${mono.className}`}>
                          {formatAcademicDate(q.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {q.isPrivate && (
                        <button
                          onClick={() => openPublishDialog(q)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 hover:border-[#14352c]/40 hover:text-[#14352c] text-slate-600 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          title="نشر الاستشارة على حائط الشعبة للاستفادة العلمية العامة"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          نشر للجميع
                        </button>
                      )}
                      <button
                        onClick={() => openAnswerDialog(q)}
                        className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {q.isAnswered ? "تعديل الرد" : "كتابة الرد"}
                      </button>

                      <button
                        onClick={() => setQuestionToDelete(q._id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                        title="حذف السؤال"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    {cardTitle && (
                      <h3 className="text-base font-bold text-slate-900">{cardTitle}</h3>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {cardContent}
                    </p>
                  </div>

                  {q.isAnswered && doctorAnswer && (
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5 mt-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                        <GraduationCap className="w-4 h-4 text-[#14352c]" />
                        <span>ردك الأكاديمي المعتمد:</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line pr-1">
                        {doctorAnswer}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Answer Dialog */}
      <Dialog
        isOpen={!!activeQuestion}
        onClose={() => setActiveQuestion(null)}
        title={activeQuestion?.title ? `الرد على استفسار: ${activeQuestion.title}` : "الرد على استفسار الطالب"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveAnswer} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-900 font-bold">
              <span className="flex items-center gap-1.5 text-[#14352c]">
                <GraduationCap className="w-4 h-4 text-[#14352c]" />
                نص استفسار الطالب:
              </span>
              {activeQuestion?.student?.name && (
                <span className="text-[11px] text-slate-500 font-normal">
                  {activeQuestion.student.name}
                </span>
              )}
            </div>
            {activeQuestion?.isPrivate && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#14352c] bg-[#14352c]/5 border border-[#14352c]/15 rounded-lg px-2.5 py-1.5">
                <Lock className="w-3.5 h-3.5" />
                استشارة خاصة: لن يظهر هذا السؤال وردّه إلا للطالب صاحب الاستفسار.
              </div>
            )}
            <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-line text-sm pt-1">
              {activeQuestion?.content || activeQuestion?.questionText}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              إجابة الأستاذ والتوضيح العلمي:
            </label>
            <textarea
              required
              rows={5}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="اكتب التوضيح العلمي أو الإجابة النموذجية ليطلع عليها طلبة الشعبة..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveQuestion(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submittingAnswer}
              className="px-6 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {submittingAnswer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              اعتماد ونشر الرد
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleDeleteQuestion}
        title="تأكيد حذف السؤال"
        message="هل أنت متأكد من رغبتك في حذف هذا السؤال من حائط المقرر؟ سيتم إزالته نهائياً ولا يمكن التراجع عن هذا الإجراء."
      />

      {/* Publish-to-Class Dialog (Privacy Toggle) */}
      <Dialog
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="نشر الاستشارة على حائط الشعبة"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            بالنشر، يتحول هذا الاستفسار من خاص إلى عام فيتاح لجميع طلبة الشعبة الاطلاع عليه والاستفادة من رده العلمي.
          </p>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:border-slate-300 transition">
            <input
              type="checkbox"
              checked={anonymize}
              onChange={(e) => setAnonymize(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#14352c] shrink-0"
            />
            <span className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-[#14352c]" />
                نشر مجهول (إخفاء اسم الطالب)
              </span>
              <span className="block text-[11px] text-slate-500">
                يُعرض السؤال وردّه على الطلبة دون إظهار هوية صاحب الاستفسار.
              </span>
            </span>
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPublishTarget(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handlePublishToClass}
              disabled={publishing}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              تأكيد النشر
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
