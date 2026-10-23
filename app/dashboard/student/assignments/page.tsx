"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import StudentNav from "@/components/StudentNav";
import CustomSelect from "@/components/CustomSelect";
import {
  Check,
  ChevronDown,
  RefreshCw,
  X,
  UploadCloud,
  FileText,
  Trash2,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from "lucide-react";

const mono = { className: "font-mono" };

/* ───────── Types ───────── */

type Submission = {
  score?: number | null;
  isLate?: boolean;
  doctorFeedback?: string;
  studentNotes?: string;
  submittedFiles?: { fileUrl?: string }[];
};
type Assignment = {
  _id: string;
  title?: string;
  description?: string;
  deadline?: string;
  dueDate?: string;
  maxScore?: number;
  allowLate?: boolean;
  displayStatus?: string;
  mySubmission?: Submission;
  doctor?: { name?: string };
  section?: {
    sectionNumber?: string | number;
    course?: { name?: string; code?: string };
    doctor?: { name?: string };
  };
};
type State = "open" | "submitted" | "graded" | "overdue";
type Filter = "all" | State;

/* ───────── Helpers ───────── */

const LOCALE = "ar-IQ-u-nu-latn";
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]";

const NOTES_SEP = "\n\nملاحظات: ";

const parseDate = (v?: string) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const deadlineOf = (a: Assignment) => parseDate(a.deadline || a.dueDate);

const relative = (d: Date, now: Date | null) => {
  if (!now) return { text: "—", urgent: false };
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000
  );
  if (d.getTime() < now.getTime()) return { text: "انتهى الموعد", urgent: false };
  if (days === 0) return { text: "اليوم", urgent: true };
  if (days === 1) return { text: "غدًا", urgent: true };
  if (days === 2) return { text: "بعد يومين", urgent: false };
  if (days <= 10) return { text: `بعد ${days} أيام`, urgent: false };
  return { text: `بعد ${days} يومًا`, urgent: false };
};

const getState = (a: Assignment, now: Date | null): State => {
  const s = a.displayStatus || "NOT_SUBMITTED";
  if (s === "GRADED") return "graded";
  if (s === "SUBMITTED" || s === "LATE") return "submitted";
  const d = deadlineOf(a);
  if (!d || !now) return "open";
  return now > d ? "overdue" : "open";
};

const RANK: Record<State, number> = { open: 0, overdue: 1, submitted: 2, graded: 3 };

const STATE_LABEL: Record<State, string> = {
  open: "مفتوح للتسليم",
  submitted: "تم التسليم",
  graded: "تم التقييم",
  overdue: "فات الموعد",
};
const STATE_BADGE: Record<State, string> = {
  open: "border-slate-300 text-slate-700 bg-white",
  submitted: "border-slate-300 text-slate-700 bg-white",
  graded: "border-[#14352c] text-white bg-[#14352c]",
  overdue: "border-red-200 text-red-800 bg-red-50",
};
const STATE_RAIL: Record<State, string> = {
  open: "bg-[#14352c]",
  submitted: "bg-slate-400",
  graded: "bg-[#b8923f]",
  overdue: "bg-red-600",
};

const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/* ───────── Components ───────── */

function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div>
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold leading-snug">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className={`p-1.5 -m-1 rounded-md text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 ${focusRing}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

type StepState = "done" | "current" | "pending" | "fail";

function Track({ state }: { state: State }) {
  const second: StepState =
    state === "submitted" || state === "graded" ? "done" : state === "overdue" ? "fail" : "current";
  const third: StepState =
    state === "graded" ? "done" : state === "submitted" ? "current" : "pending";
  const steps: { label: string; s: StepState }[] = [
    { label: "نُشر", s: "done" },
    { label: "سُلّم", s: second },
    { label: "قُيّم", s: third },
  ];

  return (
    <ol className="flex items-center" aria-label="مراحل التكليف">
      {steps.map((st, i) => (
        <li key={st.label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`grid place-items-center w-4 h-4 rounded-full shrink-0 ${
                st.s === "done"
                  ? "bg-[#14352c]"
                  : st.s === "fail"
                  ? "bg-red-600"
                  : st.s === "current"
                  ? "bg-white ring-2 ring-[#14352c]"
                  : "bg-slate-200"
              }`}
            >
              {st.s === "done" && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              {st.s === "fail" && <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
            <span
              className={`text-xs ${
                st.s === "pending" ? "text-slate-400" : "text-slate-700 font-medium"
              }`}
            >
              {st.label}
            </span>
          </span>
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`flex-1 h-px mx-3 ${
                steps[i + 1].s === "done" || steps[i + 1].s === "fail" ? "bg-[#14352c]/60" : "bg-slate-200"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

const fieldBase =
  "w-full px-3 bg-white border rounded-md text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50";
const fieldOk =
  "border-slate-300 hover:border-slate-400 focus:border-[#14352c] focus:ring-[#14352c]/15";
const fieldBad = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

/* ───────── Page ───────── */

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const [sections, setSections] = useState<{ value: string; label: string }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [filter, setFilter] = useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const reqId = useRef(0);

  const [target, setTarget] = useState<Assignment | null>(null);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [touched, setTouched] = useState(false);

  const [toast, setToast] = useState("");

  const fetchAssignments = useCallback(async (sectionId: string) => {
    const id = ++reqId.current;
    try {
      const res = await apiFetch(
        sectionId !== "ALL"
          ? `/assignments/my?sectionId=${encodeURIComponent(sectionId)}`
          : "/assignments/my"
      );
      if (id !== reqId.current) return;
      setAssignments(res.data || []);
      setUpdatedAt(new Date());
      setError("");
    } catch (err: any) {
      if (id !== reqId.current) return;
      setError(err?.message || "تعذّر تحميل التكليفات.");
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dash, list] = await Promise.all([
        apiFetch("/dashboards/student"),
        apiFetch("/assignments/my"),
      ]);
      const seen = new Set<string>();
      const opts: { value: string; label: string }[] = [];
      for (const sec of dash.data?.enrolledSections || []) {
        const value = sec.section?._id || sec._id;
        if (!value || seen.has(value)) continue;
        seen.add(value);
        const name = sec.course?.name || sec.section?.course?.name || "مقرر";
        const num = sec.sectionNumber || sec.section?.sectionNumber;
        opts.push({ value, label: num ? `${name} (شعبة ${num})` : name });
      }
      setSections(opts);
      setAssignments(list.data || []);
      setUpdatedAt(new Date());
    } catch (err: any) {
      setError(err?.message || "تعذّر تحميل التكليفات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/");
      return;
    }
    setUser(stored);
    loadAll();
  }, [router, loadAll]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const refresh = async (sectionId = selectedSection) => {
    setRefreshing(true);
    await fetchAssignments(sectionId);
    setRefreshing(false);
  };

  const changeSection = (value: string) => {
    setSelectedSection(value);
    smartCache.setWorkspace("student_selected_section_filter", value);
    refresh(value);
  };

  const items = useMemo(
    () =>
      assignments
        .map((a) => ({ a, state: getState(a, now), date: deadlineOf(a) }))
        .sort((x, y) => {
          if (RANK[x.state] !== RANK[y.state]) return RANK[x.state] - RANK[y.state];
          const dx = x.date?.getTime() ?? Infinity;
          const dy = y.date?.getTime() ?? Infinity;
          return x.state === "graded" ? dy - dx : dx - dy;
        }),
    [assignments, now]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, open: 0, submitted: 0, graded: 0, overdue: 0 };
    items.forEach((i) => c[i.state]++);
    return c;
  }, [items]);

  const totals = useMemo(() => {
    let got = 0;
    let max = 0;
    items.forEach(({ a, state }) => {
      const s = a.mySubmission?.score;
      if (state === "graded" && typeof s === "number" && typeof a.maxScore === "number") {
        got += s;
        max += a.maxScore;
      }
    });
    return max > 0 ? { got, max } : null;
  }, [items]);

  const visible = filter === "all" ? items : items.filter((i) => i.state === filter);

  const cells: { key: Filter; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "open", label: "مفتوحة" },
    { key: "submitted", label: "مسلّمة" },
    { key: "graded", label: "مقيَّمة" },
    { key: "overdue", label: "فائتة" },
  ];

  /* Submit flow */

  const validateAndSetFile = (file: File) => {
    setFileError("");
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      setFileError("حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميغابايت).");
      setSelectedFile(null);
      return false;
    }

    const safeExts = [
      ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".txt", ".zip", ".rar", ".png", ".jpg", ".jpeg"
    ];
    const dangerousExts = [
      "exe", "bat", "cmd", "sh", "php", "jsp", "asp", "aspx", "js", "vbs", "py", "html", "svg", "msi"
    ];

    const fileNameLower = file.name.toLowerCase();
    const parts = fileNameLower.split(".");

    if (parts.length > 2) {
      for (let i = 1; i < parts.length; i++) {
        if (dangerousExts.includes(parts[i])) {
          setFileError("الملف محظور أمنياً لاحتوائه على امتداد تنفيذي خطير.");
          setSelectedFile(null);
          return false;
        }
      }
    }

    const ext = "." + (parts.pop() || "");
    if (!safeExts.includes(ext)) {
      setFileError("نوع الملف غير مدعوم. المسموح: PDF, Word, PowerPoint, Excel, ZIP, صور.");
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const openSubmit = (a: Assignment) => {
    const prev = a.mySubmission;
    const raw = prev?.studentNotes || "";
    const idx = raw.indexOf(NOTES_SEP);
    setText(idx === -1 ? raw : raw.slice(0, idx));
    setNotes(idx === -1 ? "" : raw.slice(idx + NOTES_SEP.length));
    setSelectedFile(null);
    setFileError("");
    setFormError("");
    setTouched(false);
    setTarget(a);
  };

  const closeSubmit = () => {
    if (!submitting) {
      setTarget(null);
      setSelectedFile(null);
      setFileError("");
      setFormError("");
      setTouched(false);
    }
  };

  const contentError =
    !text.trim() && !selectedFile ? "يرجى سحب ملف الواجب أو كتابة نص الحل." : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || submitting) return;
    setTouched(true);
    setFormError("");
    if (contentError || fileError) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("files", selectedFile);
      }
      if (text.trim()) {
        formData.append("submissionText", text.trim());
      }
      if (notes.trim()) {
        formData.append("comments", notes.trim());
      }
      const fullNotes = text.trim() + (notes.trim() ? `${NOTES_SEP}${notes.trim()}` : "");
      if (fullNotes) {
        formData.append("studentNotes", fullNotes);
      }

      await apiFetch(`/assignments/${target._id}/submit`, {
        method: "POST",
        body: formData,
      });

      setTarget(null);
      setSelectedFile(null);
      setText("");
      setNotes("");
      setToast("تم تسليم الواجب بنجاح مع الملف المرفق.");
      fetchAssignments(selectedSection);
    } catch (err: any) {
      setFormError(err?.message || "تعذّر إرسال الحل. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  const targetDeadline = target ? deadlineOf(target) : null;
  const targetCourse = target?.section?.course?.name;

  /* Render */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StudentNav user={user} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title block */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold">التكليفات</h1>
            <p className="mt-1 text-sm text-slate-600">
              مواعيد التسليم وحالة كل تكليف ودرجته.
            </p>
          </div>

        
        </header>

        {/* Filter cells */}
        <section
          aria-label="تصفية حسب الحالة"
          className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden"
        >
          {cells.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(c.key);
                  smartCache.setWorkspace("student_assignment_tab_filter", c.key);
                }}
                className={`flex items-baseline justify-between gap-3 px-4 py-3.5 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#14352c] ${
                  active
                    ? "bg-white shadow-[inset_0_-2px_0_#14352c]"
                    : "bg-slate-50 hover:bg-white"
                } ${c.key === "all" ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <span className={`text-sm ${active ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                  {c.label}
                </span>
                <span
                  className={`${mono.className} text-xl tabular-nums ${
                    c.key === "overdue" && counts.overdue > 0
                      ? "text-red-700"
                      : active
                      ? "text-[#14352c]"
                      : "text-slate-500"
                  }`}
                >
                  {counts[c.key]}
                </span>
              </button>
            );
          })}
        </section>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CustomSelect
            id="section"
            options={[{ value: "ALL", label: "كل المقررات" }, ...sections]}
            value={selectedSection}
            onChange={(val) => changeSection(val)}
            disabled={loading}
            className="sm:w-72"
            theme="light"
          />

          <div className="flex items-center gap-3 text-xs text-slate-500">
            {updatedAt && (
              <span>
                آخر تحديث{" "}
                <span className={`${mono.className} tabular-nums`}>{timeFmt.format(updatedAt)}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading || refreshing}
              aria-label="تحديث القائمة"
              className={`p-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div role="status" aria-label="جارٍ التحميل" className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : error && assignments.length === 0 ? (
          <div role="alert" className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">تعذّر تحميل التكليفات</h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={loadAll}
              className={`mt-6 h-10 px-4 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] text-white text-sm font-medium ${focusRing}`}
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {visible.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
                {items.length === 0 ? "لا توجد تكليفات منشورة بعد." : "لا توجد تكليفات بهذه الحالة."}
              </p>
            ) : (
              <ul
                aria-busy={refreshing}
                className={`space-y-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}
              >
                {visible.map(({ a, state, date }) => {
                  const course = a.section?.course;
                  const doctor = a.section?.doctor?.name || a.doctor?.name;
                  const sub = a.mySubmission;
                  const rel = date && state === "open" ? relative(date, now) : null;
                  const canSubmit = state === "open" || (state === "overdue" && a.allowLate);

                  return (
                    <li key={a._id}>
                      <article className="relative rounded-lg border border-slate-200 bg-white overflow-hidden">
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-0 start-0 w-1 ${STATE_RAIL[state]}`}
                        />

                        {/* Record header */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 ps-6 pe-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                          {course?.code && (
                            <span className={`${mono.className} font-medium text-slate-900`}>
                              {course.code}
                            </span>
                          )}
                          {course?.name && <span>{course.name}</span>}
                          {a.section?.sectionNumber && <span>شعبة {a.section.sectionNumber}</span>}
                          {doctor && <span>{doctor}</span>}
                          <span className="ms-auto flex items-center gap-3">
                            <span className={`${mono.className} text-slate-400`} title="رقم التكليف">
                              #{String(a._id).slice(-6).toUpperCase()}
                            </span>
                            <span
                              className={`font-medium px-2 py-0.5 rounded border ${STATE_BADGE[state]}`}
                            >
                              {STATE_LABEL[state]}
                              {state === "submitted" && sub?.isLate ? " (متأخر)" : ""}
                            </span>
                          </span>
                        </div>

                        {/* Body */}
                        <div className="grid md:grid-cols-[1fr_14rem] gap-x-8 gap-y-4 ps-6 pe-5 py-5">
                          <div className="min-w-0 space-y-2">
                            <h2 className="text-base font-semibold leading-snug">
                              {a.title || "بدون عنوان"}
                            </h2>
                            {a.description && (
                              <p className="text-sm text-slate-600 leading-7 line-clamp-2">
                                {a.description}
                              </p>
                            )}
                            {state === "graded" && sub?.doctorFeedback && (
                              <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 px-3.5 py-3">
                                <div className="text-xs font-medium text-slate-500 mb-1">
                                  ملاحظة الأستاذ
                                </div>
                                <p className="text-sm text-slate-800 leading-6">{sub.doctorFeedback}</p>
                              </div>
                            )}
                          </div>

                          <dl className="space-y-3 md:border-s md:border-slate-200 md:ps-6">
                            <div>
                              <dt className="text-xs text-slate-500">آخر موعد</dt>
                              <dd className="mt-0.5 text-sm">
                                {date ? (
                                  <>
                                    <span className="font-medium">{dateFmt.format(date)}</span>
                                    <span className={`${mono.className} text-slate-600 tabular-nums`}>
                                      {" "}
                                      · {timeFmt.format(date)}
                                    </span>
                                  </>
                                ) : (
                                  "غير محدد"
                                )}
                                {rel && (
                                  <span
                                    className={`block text-xs mt-0.5 ${
                                      rel.urgent ? "text-amber-700 font-medium" : "text-slate-500"
                                    }`}
                                  >
                                    {rel.text}
                                  </span>
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">الدرجة</dt>
                              <dd className={`${mono.className} mt-0.5 tabular-nums`}>
                                {state === "graded" ? (
                                  <>
                                    <span className="text-xl font-semibold">{sub?.score ?? "—"}</span>
                                    {a.maxScore != null && (
                                      <span className="text-sm text-slate-500"> / {a.maxScore}</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-slate-600">
                                    {a.maxScore != null ? `— / ${a.maxScore}` : "—"}
                                  </span>
                                )}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Footer: progress + action */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 ps-6 pe-5 py-3.5 border-t border-slate-100">
                          <div className="flex-1 min-w-0 sm:max-w-md">
                            <Track state={state} />
                          </div>
                          <div className="sm:ms-auto sm:w-40">
                            {state === "graded" ? null : canSubmit ? (
                              <button
                                type="button"
                                onClick={() => openSubmit(a)}
                                className={`w-full h-9 rounded-md text-sm font-medium transition-colors ${focusRing} ${
                                  state === "open"
                                    ? "bg-[#14352c] hover:bg-[#1b4a3d] text-white"
                                    : "border border-slate-300 bg-white hover:bg-slate-50"
                                }`}
                              >
                                {state === "overdue" ? "تسليم متأخر" : "تسليم الحل"}
                              </button>
                            ) : state === "submitted" ? (
                              <button
                                type="button"
                                onClick={() => openSubmit(a)}
                                className={`w-full h-9 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium ${focusRing}`}
                              >
                                تعديل التسليم
                              </button>
                            ) : (
                              <p className="text-sm text-slate-500 sm:text-center">التسليم مغلق.</p>
                            )}
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      <div
        aria-live="polite"
        className="fixed bottom-5 start-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm pointer-events-none"
      >
        {toast && (
          <div className="pointer-events-auto rounded-md bg-[#14352c] text-white text-sm px-4 py-3 shadow-lg text-center">
            {toast}
          </div>
        )}
      </div>

      {/* Submit modal */}
      <Modal
        open={!!target}
        onClose={closeSubmit}
        title={target?.title || "تسليم الحل"}
        subtitle={[
          targetCourse,
          targetDeadline && `الموعد ${dateFmt.format(targetDeadline)} ${timeFmt.format(targetDeadline)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        <form onSubmit={submit} noValidate className="space-y-4">
          {targetDeadline && now && now > targetDeadline && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              انتهى الموعد. سيُسجَّل التسليم كمتأخر.
            </p>
          )}

          {/* Secure File Drag & Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              ملف الحل والواجب <span className="text-emerald-700 font-semibold">*</span>
            </label>

            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    validateAndSetFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 text-center ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40 text-slate-600"
                } ${fileError ? "border-red-400 bg-red-50/30" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSetFile(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.zip,.rar,.png,.jpg,.jpeg"
                />
                <div className="p-3 rounded-full bg-emerald-100 text-emerald-800 mb-2 shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  اسحب وأفلت ملف الواجب هنا، أو <span className="text-emerald-800 underline">تصفح من جهازك</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  الملفات المدعومة: PDF, Word, PowerPoint, Excel, ZIP (الحد الأقصى 15MB)
                </p>
                <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>فحص أمني تلقائي ضد البرمجيات الخبيثة والامتدادات التنفيذية</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-200/70 text-emerald-900 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • جاهز للإرسال الآمن
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileError("");
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition"
                  title="إزالة الملف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {fileError && (
              <p className="mt-1.5 text-xs text-red-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fileError}</span>
              </p>
            )}

            {touched && contentError && !fileError && (
              <p className="mt-1.5 text-xs text-red-700 font-medium">
                {contentError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-slate-800 mb-1.5">
              نص الإجابة أو توضيحات إضافية <span className="text-slate-500 font-normal">(اختياري عند إرفاق ملف)</span>
            </label>
            <textarea
              id="answer"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              placeholder="اكتب أي ملاحظات أو توضيحات للحل هنا..."
              className={`${fieldBase} py-2.5 leading-6 resize-y ${fieldOk}`}
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-800 mb-1.5">
              ملاحظات خاصة للأستاذ <span className="text-slate-500 font-normal">(اختياري)</span>
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="مثال: تم إرفاق الواجب كاملاً مع حل التمارين الإضافية"
              className={`${fieldBase} h-10 ${fieldOk}`}
            />
          </div>

          {formError && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeSubmit}
              disabled={submitting}
              className={`h-10 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium disabled:opacity-60 ${focusRing}`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`h-10 px-5 inline-flex items-center gap-2 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] text-white text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed ${focusRing}`}
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {submitting ? "جارٍ الإرسال..." : "تأكيد التسليم"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}