"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from '@/components/Navbar';
import Dialog from "@/components/Dialog";
import CustomSelect from "@/components/CustomSelect";
import {
  MessageSquare,
  Plus,
  CheckCircle2,
  HelpCircle,
  Trash2,
  RefreshCw,
  Send,
  ShieldCheck,
  Clock,
  GraduationCap,
  Search,
  BookOpen,
  Sparkles,
  ChevronDown,
  MessagesSquare,
  UserCheck,
} from "lucide-react";

const mono = { className: "font-mono" };

type FilterTab = "all" | "answered" | "pending" | "mine";

interface QuestionItem {
  _id: string;
  section: string;
  questionText: string;
  title?: string;
  content?: string;
  answerText?: string;
  answer?: string;
  isAnswered: boolean;
  answeredAt?: string;
  createdAt: string;
  student?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  answeredBy?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export default function StudentQuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Ask Modal with draft memory
  const [askModal, setAskModal] = useState(false);
  const [modalSectionId, setModalSectionId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback Dialog
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "danger" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const loadQuestions = useCallback(async (secId: string) => {
    if (!secId) return;
    setFetchingQuestions(true);
    try {
      const res = await apiFetch(`/questions/section/${secId}`);
      setQuestions(res.data || []);
    } catch {
      setQuestions([]);
    } finally {
      setFetchingQuestions(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    apiFetch("/dashboards/student")
      .then((res) => {
        const enrolled = res.data?.enrolledSections || [];
        setSections(enrolled);
        if (enrolled.length > 0) {
          const remembered = smartCache.getWorkspace("student_selected_section", "");
          const activeSec = enrolled.find((e: any) => (e.section?._id || e._id) === remembered);
          const firstId = enrolled[0].section?._id || enrolled[0]._id;
          const targetId = activeSec ? remembered : firstId;
          setSelectedSection(targetId);
          setModalSectionId(targetId);
          loadQuestions(targetId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, loadQuestions]);

  const handleSectionChange = (secId: string) => {
    setSelectedSection(secId);
    smartCache.setWorkspace("student_selected_section", secId);
    setModalSectionId(secId);
    loadQuestions(secId);
  };

  const handleTabChange = (t: FilterTab) => {
    setActiveTab(t);
    smartCache.setWorkspace("student_questions_tab", t);
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSection = modalSectionId || selectedSection;
    if (!targetSection || !content.trim()) {
      setDialog({
        isOpen: true,
        title: "حقول مطلوبة",
        message: "يرجى كتابة نص السؤال واختيار المادة الدراسية.",
        type: "danger",
      });
      return;
    }

    setSubmitting(true);
    const fullText = title.trim() ? `${title.trim()}\n\n${content.trim()}` : content.trim();

    try {
      await apiFetch("/questions", {
        method: "POST",
        body: JSON.stringify({
          sectionId: targetSection,
          questionText: fullText,
          title: title.trim(),
          content: content.trim(),
        }),
      });

      setAskModal(false);
      setTitle("");
      setContent("");
      smartCache.setWorkspace("draft_student_question_title", "");
      smartCache.setWorkspace("draft_student_question_content", "");
      setDialog({
        isOpen: true,
        title: "تم نشر الاستفسار بنجاح",
        message: "تم إرسال استفسارك إلى حائط المادة وإشعار أستاذ المقرر مباشرة.",
        type: "success",
      });

      if (targetSection === selectedSection) {
        loadQuestions(targetSection);
      } else {
        setSelectedSection(targetSection);
        loadQuestions(targetSection);
      }
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "تعذر نشر السؤال",
        message: err.message || "حدث خطأ أثناء إرسال السؤال، يرجى المحاولة لاحقاً.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/questions/${questionToDelete}`, { method: "DELETE" });
      setQuestions((prev) => prev.filter((q) => q._id !== questionToDelete));
      setQuestionToDelete(null);
      setDialog({
        isOpen: true,
        title: "تم الحذف",
        message: "تم حذف الاستفسار من حائط المادة بنجاح.",
        type: "success",
      });
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "فشل الحذف",
        message: err.message || "تعذر حذف السؤال حالياً.",
        type: "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = questions.length;
    const answered = questions.filter((q) => q.isAnswered).length;
    const pending = total - answered;
    const mine = questions.filter(
      (q) => q.student?._id === user?._id || (q.student as any) === user?._id
    ).length;
    return { total, answered, pending, mine };
  }, [questions, user]);

  // Filtered Questions list
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const isMine =
        q.student?._id === user?._id || (q.student as any) === user?._id;

      if (activeTab === "answered" && !q.isAnswered) return false;
      if (activeTab === "pending" && q.isAnswered) return false;
      if (activeTab === "mine" && !isMine) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const text = (q.questionText || "").toLowerCase();
        const t = (q.title || "").toLowerCase();
        const c = (q.content || "").toLowerCase();
        const ans = (q.answerText || q.answer || "").toLowerCase();
        const studentName = (q.student?.name || "").toLowerCase();
        return (
          text.includes(query) ||
          t.includes(query) ||
          c.includes(query) ||
          ans.includes(query) ||
          studentName.includes(query)
        );
      }
      return true;
    });
  }, [questions, activeTab, searchQuery, user]);

  // Selected Section Object
  const currentSectionObj = useMemo(() => {
    return sections.find(
      (s) => (s.section?._id || s._id) === selectedSection
    );
  }, [sections, selectedSection]);

  const currentCourseName =
    currentSectionObj?.section?.course?.name ||
    currentSectionObj?.course?.name ||
    "المقرر الدراسي";

  const currentSectionCode =
    currentSectionObj?.section?.sectionNumber ||
    currentSectionObj?.sectionNumber ||
    "1";

  const sectionOptions = useMemo(() => {
    return sections.map((sec: any) => {
      const sId = sec.section?._id || sec._id;
      const cName = sec.section?.course?.name || sec.course?.name || "المادة";
      const sNum = sec.section?.sectionNumber || sec.sectionNumber || "1";
      return {
        value: sId,
        label: `${cName} (شعبة ${sNum})`,
      };
    });
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard/student" className="hover:text-[#14352c] transition">
                الرئيسية
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">حائط الأسئلة والمناقشات</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <MessagesSquare className="w-7 h-7 text-[#14352c]" />
              حائط المناقشات والأسئلة الأكاديمية
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              طرح الاستفسارات العلمية والتواصل المباشر مع أساتذة المقررات والشُعب الدراسية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              حائط استفسارات أكاديمي رسمي
            </span>
          </div>
        </div>

        {/* Metrics KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#14352c]" />
              إجمالي الاستفسارات
            </span>
            <p className={`text-2xl font-bold text-slate-900 pt-1 ${mono.className}`}>
              {metrics.total}
            </p>
            <span className="text-xs text-slate-500 block">أسئلة مطروحة في المقرر</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-emerald-600 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              إجابات معتمدة من الأستاذ
            </span>
            <p className={`text-2xl font-bold text-emerald-700 pt-1 ${mono.className}`}>
              {metrics.answered}
            </p>
            <span className="text-xs text-slate-500 block">ردود موثقة ومجابة</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-amber-500 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              بانتظار رد الأستاذ
            </span>
            <p className={`text-2xl font-bold text-amber-700 pt-1 ${mono.className}`}>
              {metrics.pending}
            </p>
            <span className="text-xs text-slate-500 block">قيد المراجعة العلمية</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 border-t-2 border-t-[#b8923f] shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#b8923f]" />
              استفساراتي الخاصة
            </span>
            <p className={`text-2xl font-bold text-[#b8923f] pt-1 ${mono.className}`}>
              {metrics.mine}
            </p>
            <span className="text-xs text-slate-500 block">أسئلة طرحتها شخصياً</span>
          </div>
        </div>

        {/* Action Bar & Course Selector */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Course Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="course-select" className="text-xs font-bold text-slate-700 shrink-0">
                المقرر الدراسي:
              </label>
              {sections.length > 0 ? (
                <CustomSelect
                  id="course-select"
                  options={sectionOptions}
                  value={selectedSection}
                  onChange={handleSectionChange}
                  className="min-w-[260px]"
                  theme="light"
                />
              ) : (
                <span className="text-xs text-slate-500">لا توجد مواد مسجلة</span>
              )}

              <button
                type="button"
                onClick={() => loadQuestions(selectedSection)}
                disabled={fetchingQuestions}
                title="تحديث حائط الأسئلة"
                className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${fetchingQuestions ? "animate-spin text-[#14352c]" : ""}`} />
              </button>
            </div>

            {/* Actions: Ask Question Button */}
            <button
              type="button"
              onClick={() => {
                setModalSectionId(selectedSection);
                setAskModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              طرح استفسار جديد
            </button>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Filter Tabs */}
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
                onClick={() => handleTabChange("answered")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "answered"
                    ? "bg-[#14352c] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                تم الرد ({metrics.answered})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("pending")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "pending"
                    ? "bg-[#14352c] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                بانتظار الأستاذ ({metrics.pending})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("mine")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "mine"
                    ? "bg-[#14352c] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                استفساراتي ({metrics.mine})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في نصوص الأسئلة..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
              />
            </div>
          </div>
        </div>

        {/* Questions Stream */}
        {fetchingQuestions ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
            <p className="text-xs text-slate-500 font-bold">جارٍ جلب استفسارات الشعبة...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-4 p-6">
            <div className="size-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery.trim()
                  ? "لا توجد نتائج تطابق بحثك"
                  : "لا توجد استفسارات مطروحة في هذا القسم"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery.trim()
                  ? "جرّب تغيير كلمات البحث أو إلغاء التصفية للوصول إلى السؤال."
                  : "كن أول من يطرح استفساراً علمياً أو مسألة أكاديمية للمناقشة مع أستاذ المقرر."}
              </p>
            </div>
            {!searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  setModalSectionId(selectedSection);
                  setAskModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                طرح أول استفسار الآن
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const isMine =
                q.student?._id === user?._id || (q.student as any) === user?._id;
              const studentName = q.student?.name || "طالب جامعي";
              const studentInitial = studentName.trim().charAt(0);

              // Parse title and content if split by \n\n
              let cardTitle = q.title || "";
              let cardContent = q.content || q.questionText || "";
              if (!cardTitle && cardContent.includes("\n\n")) {
                const parts = cardContent.split("\n\n");
                cardTitle = parts[0];
                cardContent = parts.slice(1).join("\n\n");
              }

              const doctorAnswer = q.answerText || q.answer;
              const doctorName = q.answeredBy?.name || "أستاذ المقرر الدراسي";

              const createdDateStr = mounted
                ? new Date(q.createdAt).toLocaleDateString("ar-IQ", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "";

              const answeredDateStr = mounted && q.answeredAt
                ? new Date(q.answeredAt).toLocaleDateString("ar-IQ", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "";

              return (
                <article
                  key={q._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 space-y-4 shadow-sm transition"
                >
                  {/* Top Metadata Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-slate-100 border border-slate-200 text-[#14352c] font-bold flex items-center justify-center text-sm shrink-0">
                        {studentInitial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {studentName}
                          </span>
                          {isMine && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                              سؤالي
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{currentCourseName}</span>
                          <span>•</span>
                          <span className={`font-medium ${mono.className}`}>{createdDateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                          q.isAnswered
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {q.isAnswered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            تم الرد والاعتماد
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            بانتظار رد الأستاذ
                          </>
                        )}
                      </span>

                      {isMine && (
                        <button
                          type="button"
                          onClick={() => setQuestionToDelete(q._id)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition"
                          title="حذف هذا الاستفسار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Body */}
                  <div className="space-y-1.5 pt-1">
                    {cardTitle && (
                      <h2 className="text-base font-bold text-slate-900">
                        {cardTitle}
                      </h2>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {cardContent}
                    </p>
                  </div>

                  {/* Doctor's Verified Answer Container */}
                  {q.isAnswered && doctorAnswer ? (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 sm:p-5 space-y-2 mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <GraduationCap className="w-4 h-4 text-[#14352c]" />
                          <span>رد واعتماد رسمي: {doctorName}</span>
                        </div>
                        {answeredDateStr && (
                          <span className={`text-xs text-emerald-800/80 ${mono.className}`}>
                            {answeredDateStr}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line pt-1">
                        {doctorAnswer}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        لم يتم الرد بعد من قبل أستاذ المادة، ستصلك رسالة إشعار فور اعتماد الإجابة.
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Ask Question Dialog */}
      <Dialog
        isOpen={askModal}
        onClose={() => setAskModal(false)}
        title="طرح استفسار علمي جديد"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAskQuestion} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              المقرر الدراسي المستهدف:
            </label>
            <CustomSelect
              options={sectionOptions}
              value={modalSectionId}
              onChange={setModalSectionId}
              className="w-full"
              theme="light"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              عنوان الاستفسار (اختياري وموجز):
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: استفسار حول خوارزميات الترتيب السريع..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تفاصيل السؤال أو الملاحظة العلمية: <span className="text-[#14352c]">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب سؤالك بوضوح وتفصيل ليتمكن أستاذ المادة من تقديم إجابة دقيقة..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] focus:ring-1 focus:ring-[#14352c] transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              يظهر هذا الاستفسار لجميع طلاب شعبتك ولأستاذ المقرر على حائط المناقشات.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAskModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              إرسال الاستفسار
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        title="تأكيد حذف الاستفسار"
        type="danger"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700">
            هل أنت متأكد من رغبتك في حذف هذا السؤال من حائط المقرر؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuestionToDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirmDeleteQuestion}
              disabled={deleting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              تأكيد الحذف
            </button>
          </div>
        </div>
      </Dialog>

      {/* Dialog Feedback */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        type={dialog.type}
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium">{dialog.message}</p>
          <button
            type="button"
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
