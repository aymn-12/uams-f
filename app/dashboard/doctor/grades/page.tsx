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
} from "lucide-react";

import { smartCache } from "@/lib/cache";
import { formatAcademicDate } from "@/lib/date";

const mono = { className: "font-mono" };

export default function DoctorGradesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [exams, setExams] = useState<any[]>([]);
  const [gradesSheet, setGradesSheet] = useState<any | null>(null);
  const [fetching, setFetching] = useState(false);

  // Create Exam Dialog
  const [createExamModal, setCreateExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState("MIDTERM");
  const [maxScore, setMaxScore] = useState(30);
  const [examDate, setExamDate] = useState("");
  const [creatingExam, setCreatingExam] = useState(false);

  // Record Grades Dialog
  const [recordModal, setRecordModal] = useState<any | null>(null);
  const [studentScores, setStudentScores] = useState<Record<string, number>>({});
  const [savingGrades, setSavingGrades] = useState(false);

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
          loadSectionExamsAndGrades(activeSecId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const loadSectionExamsAndGrades = async (secId: string) => {
    if (!secId) return;
    setFetching(true);
    try {
      const [examsRes, sheetRes] = await Promise.allSettled([
        apiFetch(`/exams/section/${secId}`),
        apiFetch(`/exams/section/${secId}/grades-sheet`),
      ]);

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value.data || []);
      }
      if (sheetRes.status === "fulfilled") {
        setGradesSheet(sheetRes.value.data);
      }
    } finally {
      setFetching(false);
    }
  };

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
          examType,
          maxScore: Number(maxScore) || 30,
          date: examDate,
        }),
      });

      setCreateExamModal(false);
      setExamTitle("");
      setExamDate("");
      setDialog({
        isOpen: true,
        title: "تم جدولة الاختبار بنجاح",
        message: "تم تثبيت موعد الاختبار وإتاحته لرصد درجات الطلبة.",
        type: "success",
      });

      loadSectionExamsAndGrades(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في إنشاء الاختبار",
        message: err.message || "فشلت عملية إنشاء الاختبار.",
        type: "danger",
      });
    } finally {
      setCreatingExam(false);
    }
  };

  const openRecordGrades = (exam: any) => {
    setRecordModal(exam);
    const initialMap: Record<string, number> = {};
    const enrolled = gradesSheet?.students || [];
    enrolled.forEach((s: any) => {
      initialMap[s._id] = 0;
    });
    setStudentScores(initialMap);
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordModal) return;
    setSavingGrades(true);

    const gradesPayload = Object.entries(studentScores).map(([studentId, score]) => ({
      studentId,
      score: Number(score) || 0,
    }));

    try {
      await apiFetch(`/exams/${recordModal._id}/grades`, {
        method: "POST",
        body: JSON.stringify({
          grades: gradesPayload,
        }),
      });

      setRecordModal(null);
      setDialog({
        isOpen: true,
        title: "تم حفظ واعتماد الدرجات",
        message: "تم رصد درجات جميع طلبة الشعبة وحساب السعي التراكمي بنجاح.",
        type: "success",
      });

      loadSectionExamsAndGrades(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في حفظ الدرجات",
        message: err.message || "تعذر حفظ الدرجات.",
        type: "danger",
      });
    } finally {
      setSavingGrades(false);
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

  const enrolledStudents = gradesSheet?.students || [];

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
              <span className="text-[#14352c] font-semibold">رصد الدرجات</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Award className="w-7 h-7 text-[#14352c]" />
              رصد الدرجات وسجل السعي الأكاديمي
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              إدارة الاختبارات الفصلية، رصد الدرجات لطلبة الشعبة، واستخراج السعي النهائي المعتمد
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
                  loadSectionExamsAndGrades(val);
                }}
                className="min-w-[240px]"
                theme="light"
              />
            )}

            <button
              onClick={() => setCreateExamModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة اختبار جديد
            </button>
          </div>
        </div>

        {/* Exams List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#14352c]" />
              الاختبارات والتقييمات المجدولة في هذا المقرر:
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {exams.length} اختبار
            </span>
          </div>

          {fetching ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#14352c]" />
              <p className="text-xs text-slate-500 font-medium mt-2">جارٍ جلب سجل الدرجات...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <Award className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">لا توجد اختبارات مجدولة بعد</p>
              <p className="text-xs text-slate-500">اضغط "إضافة اختبار جديد" لإنشاء امتحان فصلي أو كويز للشعبة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {exams.map((ex: any) => (
                <div
                  key={ex._id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 space-y-3 shadow-sm transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        {ex.examType || "EXAM"}
                      </span>
                      <span className={`text-xs font-bold text-slate-800 ${mono.className}`}>
                        {ex.maxScore} درجة
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{ex.title}</h4>
                    <p className={`text-xs text-slate-500 flex items-center gap-1.5 ${mono.className}`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatAcademicDate(ex.examDate || ex.date)}
                    </p>
                  </div>

                  <button
                    onClick={() => openRecordGrades(ex)}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#14352c] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    رصد درجات الطلبة
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Exam Dialog */}
      <Dialog
        isOpen={createExamModal}
        onClose={() => setCreateExamModal(false)}
        title="جدولة اختبار جديد للشعبة"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">عنوان الاختبار:</label>
            <input
              type="text"
              required
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="مثال: امتحان الشهر الأول..."
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
                ]}
                value={examType}
                onChange={(val) => setExamType(val)}
                theme="light"
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
                onChange={(e) => setMaxScore(parseInt(e.target.value) || 30)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold ${mono.className}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">تاريخ الاختبار:</label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] font-bold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateExamModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={creatingExam}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {creatingExam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ الاختبار
            </button>
          </div>
        </form>
      </Dialog>

      {/* Record Grades Modal */}
      <Dialog
        isOpen={!!recordModal}
        onClose={() => setRecordModal(null)}
        title={`رصد درجات: ${recordModal?.title || ""}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveGrades} className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between font-bold">
            <span>الدرجة القصوى للاختبار: {recordModal?.maxScore}</span>
            <span>عدد الطلبة المسجلين: {enrolledStudents.length}</span>
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
            {enrolledStudents.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">
                لا يوجد طلبة مسجلين في هذه الشعبة بعد.
              </p>
            ) : (
              enrolledStudents.map((st: any) => (
                <div
                  key={st._id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{st.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{st.studentId || st.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-600 font-semibold">الدرجة:</label>
                    <input
                      type="number"
                      min="0"
                      max={recordModal?.maxScore || 100}
                      value={studentScores[st._id] ?? 0}
                      onChange={(e) =>
                        setStudentScores((prev) => ({
                          ...prev,
                          [st._id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={`w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold text-[#14352c] focus:outline-none focus:border-[#14352c] shadow-xs ${mono.className}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRecordModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={savingGrades || enrolledStudents.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {savingGrades ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              اعتماد وحفظ الدرجات
            </button>
          </div>
        </form>
      </Dialog>

      {/* Status Dialog */}
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
