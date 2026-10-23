"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";
import { getStoredUser, User } from "@/lib/auth";
import DoctorNav from "@/components/DoctorNav";
import Dialog from "@/components/Dialog";
import CustomSelect from "@/components/CustomSelect";
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
} from "lucide-react";

const mono = { className: "font-mono" };

export default function DoctorQuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  // Answer Dialog
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

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
      const res = await apiFetch(`/questions/section/${secId}`);
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

  const handleDeleteQuestion = async (id: string) => {
    try {
      await apiFetch(`/questions/${id}`, { method: "DELETE" });
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      setDialog({
        isOpen: true,
        title: "تم الحذف",
        message: "تمت إزالة السؤال من الحائط بنجاح.",
        type: "success",
      });
    } catch {
      setDialog({
        isOpen: true,
        title: "خطأ في الحذف",
        message: "تعذر حذف السؤال حالياً.",
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

        {/* Questions Stream */}
        {fetching ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-medium">جارٍ جلب استفسارات الشعبة...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لا توجد أسئلة مطروحة في هذه الشعبة</h3>
            <p className="text-xs text-slate-500">ستظهر استفسارات طلبتك هنا فور طرحها في حائط المقرر.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q: any) => {
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
                      <button
                        onClick={() => openAnswerDialog(q)}
                        className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {q.isAnswered ? "تعديل الرد" : "كتابة الرد"}
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(q._id)}
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
