"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import Navbar from '@/components/Navbar';
import DigitalIdModal from '@/components/DigitalIdModal';
import { QrCode, RefreshCw, Copy, Check, X, ChevronLeft } from "lucide-react";

/* ───────── Types (adjust to the real API shape) ───────── */

type Course = { name?: string; code?: string };
type Lecture = {
  startTime?: string;
  endTime?: string;
  room?: string;
  section?: { course?: Course; doctor?: { name?: string } };
};
type Task = {
  id?: string | number;
  title?: string;
  name?: string;
  dueDate?: string;
  deadline?: string;
  date?: string;
  examDate?: string;
  startTime?: string;
  room?: string;
  course?: Course;
  section?: { course?: Course };
};
type Student = {
  name?: string;
  email?: string;
  studentId?: string;
  college?: string;
  department?: string;
  stage?: string | number;
  studyType?: string;
};
type Dashboard = {
  studentInfo?: Student;
  metrics?: {
    overallAttendanceRate?: string | number;
    enrolledCoursesCount?: number;
    totalEnrolledCredits?: number;
  };
  todayLectures?: Lecture[];
  upcomingAssignments?: Task[];
  upcomingExams?: Task[];
};
type CardData = { qrImage?: string; tokenRotatedAt?: string };

/* ───────── Helpers ───────── */

const LOCALE = "ar-IQ-u-nu-latn";
const dayFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]";

const toMin = (t?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const hhmm = (t?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "—";
};
const parseDate = (v?: string) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const dayDiff = (d: Date, now: Date) => {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86400000);
};
const relDay = (n: number) =>
  n < 0
    ? "متأخر"
    : n === 0
    ? "اليوم"
    : n === 1
    ? "غدًا"
    : n === 2
    ? "بعد يومين"
    : n <= 10
    ? `بعد ${n} أيام`
    : `بعد ${n} يومًا`;

const taskTitle = (t: Task) =>
  t.title || t.name || t.section?.course?.name || t.course?.name || "بدون عنوان";
const taskCourse = (t: Task) => t.section?.course?.name || t.course?.name;
const taskDate = (t: Task) =>
  parseDate(t.dueDate || t.deadline || t.date || t.examDate);

/* ───────── Small components ───────── */

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className={`p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
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

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-0.5 text-sm font-medium text-[#14352c] hover:underline rounded ${focusRing}`}
    >
      {children}
      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}

function Kpi({
  href,
  label,
  value,
  hint,
  children,
}: {
  href: string;
  label: string;
  value: string | number;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block bg-white p-5 hover:bg-slate-50 transition-colors ${focusRing} focus-visible:-outline-offset-2`}
    >
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {children}
      <div className="mt-2 text-xs text-slate-500">{hint}</div>
    </Link>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-500">{text}</p>;
}

function Shell({
  user,
  onOpenCard,
  children,
}: {
  user: User | null;
  onOpenCard?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={user} onOpenCard={onOpenCard} />
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {children}
      </main>
    </div>
  );
}

/* ───────── Page ───────── */

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const [copied, setCopied] = useState(false);

  const [showCard, setShowCard] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    const cached = smartCache.get<Dashboard>("/dashboards/student");
    if (cached?.data) {
      setData(cached.data);
      setLoading(false);
    }
    setLoadError("");
    try {
      const res = await apiFetch("/dashboards/student");
      setData(res.data);
    } catch (err: any) {
      setLoadError(err?.message || "تعذّر تحميل بيانات اللوحة.");
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
    load();
  }, [router, load]);

  // keep "current / next lecture" accurate
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const loadCard = useCallback(async () => {
    setCardLoading(true);
    setCardError("");
    try {
      const res = await apiFetch("/digital-id/my-card");
      setCardData(res.data);
    } catch (err: any) {
      setCardError(err?.message || "تعذّر تحميل البطاقة.");
    } finally {
      setCardLoading(false);
    }
  }, []);

  const openCard = () => {
    setShowCard(true);
    if (!cardData && !cardLoading) loadCard();
  };

  const rotateToken = async () => {
    setRotating(true);
    setCardError("");
    try {
      const res = await apiFetch("/digital-id/rotate-token", { method: "POST" });
      if (!res.data?.qrImage) throw new Error("لم يصل رمز جديد من الخادم.");
      setCardData((prev) => ({
        ...prev,
        qrImage: res.data.qrImage,
        tokenRotatedAt: res.data.tokenRotatedAt,
      }));
    } catch (err: any) {
      setCardError(err?.message || "تعذّر تجديد الرمز.");
    } finally {
      setRotating(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <Shell user={user} onOpenCard={openCard}>
      {children}
    </Shell>
  );

  /* Loading */
  if (loading) {
    return shell(
      <div role="status" aria-label="جارٍ تحميل البيانات" className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-28 w-full" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  /* Failed with nothing to show */
  if (loadError && !data) {
    return shell(
      <div
        role="alert"
        className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center"
      >
        <h1 className="text-lg font-semibold">تعذّر تحميل اللوحة</h1>
        <p className="mt-2 text-sm text-slate-600">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className={`mt-6 h-10 px-4 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] text-white text-sm font-medium ${focusRing}`}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const student = data?.studentInfo ?? {};
  const metrics = data?.metrics ?? {};
  const assignments = data?.upcomingAssignments ?? [];
  const exams = data?.upcomingExams ?? [];
  const name = student.name || user?.name || "الطالب";
  const email = student.email || user?.email;

  const attendance = (() => {
    const n = parseFloat(String(metrics.overallAttendanceRate ?? ""));
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : null;
  })();

  const nextExamDate = now ? exams.map(taskDate).find((d) => d && dayDiff(d, now) >= 0) : null;

  // Lectures: sorted, with live / next / done state
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const lectures = [...(data?.todayLectures ?? [])]
    .sort((a, b) => (toMin(a.startTime) ?? 0) - (toMin(b.startTime) ?? 0))
    .map((l) => {
      const s = toMin(l.startTime);
      const e = toMin(l.endTime);
      const status =
        s === null || e === null || nowMin === null
          ? "unknown"
          : nowMin >= e
          ? "done"
          : nowMin >= s
          ? "live"
          : "upcoming";
      return { l, status };
    });
  const nextIdx = lectures.findIndex((x) => x.status === "upcoming");

  const meta = [
    student.college && `كلية ${student.college}`,
    student.department && `قسم ${student.department}`,
    student.stage && `المرحلة ${student.stage}`,
    student.studyType,
  ].filter(Boolean);

  const record: [string, React.ReactNode][] = [
    ["الكلية", student.college || "—"],
    ["القسم", student.department || "—"],
    ["المرحلة", student.stage ? `المرحلة ${student.stage}` : "—"],
    [
      "البريد الجامعي",
      <span key="e" dir="ltr" className="block truncate text-left" title={email}>
        {email || "—"}
      </span>,
    ],
  ];

  return (
    <>
      {shell(
        <>
          

          {/* Partial failure (data loaded earlier, refresh failed) */}
          {loadError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={load}
                className={`font-medium underline rounded ${focusRing}`}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* KPIs */}
          <section
            aria-label="ملخص"
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden"
          >
            <Kpi
              href="/dashboard/student/attendance"
              label="نسبة الحضور"
              value={attendance === null ? "—" : `${Math.round(attendance)}%`}
              hint="سجل الحضور"
            >
              {attendance !== null && (
                <div
                  className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden"
                  role="presentation"
                >
                  <div
                    className="h-full bg-[#14352c]"
                    style={{ width: `${attendance}%` }}
                  />
                </div>
              )}
            </Kpi>
            <Kpi
              href="/dashboard/student/materials"
              label="المقررات"
              value={metrics.enrolledCoursesCount ?? "—"}
              hint={
                metrics.totalEnrolledCredits != null
                  ? `${metrics.totalEnrolledCredits} ساعة معتمدة`
                  : "الملازم والمواد"
              }
            />
            <Kpi
              href="/dashboard/student/assignments"
              label="تكليفات قادمة"
              value={assignments.length}
              hint={assignments.length ? "بانتظار التسليم" : "لا شيء بانتظار التسليم"}
            />
            <Kpi
              href="/dashboard/student/grades"
              label="امتحانات قادمة"
              value={exams.length}
              hint={
                nextExamDate && now
                  ? `الأقرب: ${relDay(dayDiff(nextExamDate, now))}`
                  : "لا امتحانات مجدولة"
              }
            />
          </section>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {/* Today */}
              <Panel
                title="محاضرات اليوم"
                action={
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm text-slate-500 font-medium">
                      {now ? dayFmt.format(now) : ""}
                    </span>
                    <Link
                      href="/dashboard/student/schedule"
                      className="text-xs text-[#14352c] font-bold hover:underline flex items-center gap-1 border-r border-slate-200 pr-3"
                    >
                      الجدول المركزي ←
                    </Link>
                    <Link
                      href="/dashboard/student/planner"
                      className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1 border-r border-slate-200 pr-3"
                    >
                      جدولي الذاتي ←
                    </Link>
                  </div>
                }
              >
                {lectures.length === 0 ? (
                  <EmptyRow text="لا توجد محاضرات اليوم." />
                ) : (
                  <ol>
                    {lectures.map(({ l, status }, i) => {
                      const course = l.section?.course;
                      const details = [
                        course?.code,
                        l.room,
                        l.section?.doctor?.name,
                      ].filter(Boolean);
                      return (
                        <li
                          key={i}
                          className={`grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 px-5 py-4 border-t first:border-t-0 border-slate-100 ${
                            status === "done" ? "opacity-55" : ""
                          }`}
                        >
                          <div
                            dir="ltr"
                            className="text-sm tabular-nums leading-5 text-slate-700"
                          >
                            <div className="font-medium">{hhmm(l.startTime)}</div>
                            <div className="text-slate-400">{hhmm(l.endTime)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {course?.name || "مقرر دراسي"}
                            </div>
                            {details.length > 0 && (
                              <div className="mt-0.5 text-sm text-slate-600 truncate">
                                {details.join(" · ")}
                              </div>
                            )}
                          </div>
                          {status === "live" ? (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-[#14352c] text-white">
                              جارية الآن
                            </span>
                          ) : i === nextIdx ? (
                            <span className="text-xs font-medium px-2 py-1 rounded border border-[#14352c]/40 text-[#14352c]">
                              التالية
                            </span>
                          ) : (
                            <span />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Panel>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Assignments */}
                <Panel
                  title="التكليفات"
                  action={<PanelLink href="/dashboard/student/assignments">الكل</PanelLink>}
                >
                  {assignments.length === 0 ? (
                    <EmptyRow text="لا توجد تكليفات قادمة." />
                  ) : (
                    <ul>
                      {assignments.slice(0, 5).map((t, i) => {
                        const d = taskDate(t);
                        const diff = d && now ? dayDiff(d, now) : null;
                        return (
                          <li
                            key={t.id ?? i}
                            className="px-5 py-3.5 border-t first:border-t-0 border-slate-100 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {taskTitle(t)}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500 truncate">
                                {[taskCourse(t) !== taskTitle(t) && taskCourse(t), d && dayFmt.format(d)]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                            {diff !== null && (
                              <span
                                className={`shrink-0 text-xs font-medium ${
                                  diff <= 1 ? "text-amber-700" : "text-slate-600"
                                }`}
                              >
                                {relDay(diff)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>

                {/* Exams */}
                <Panel title="الامتحانات">
                  {exams.length === 0 ? (
                    <EmptyRow text="لا توجد امتحانات مجدولة." />
                  ) : (
                    <ul>
                      {exams.slice(0, 5).map((t, i) => {
                        const d = taskDate(t);
                        const diff = d && now ? dayDiff(d, now) : null;
                        return (
                          <li
                            key={t.id ?? i}
                            className="px-5 py-3.5 border-t first:border-t-0 border-slate-100 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {taskTitle(t)}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500 truncate">
                                {[
                                  d && dayFmt.format(d),
                                  t.startTime && hhmm(t.startTime),
                                  t.room,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                            {diff !== null && (
                              <span
                                className={`shrink-0 text-xs font-medium ${
                                  diff <= 1 ? "text-amber-700" : "text-slate-600"
                                }`}
                              >
                                {relDay(diff)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>

            {/* Record */}
            <section
              id="record"
              tabIndex={-1}
              aria-labelledby="record-title"
              className="rounded-lg border border-slate-200 bg-white focus:outline-none scroll-mt-20"
            >
              <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 id="record-title" className="text-base font-semibold">
                  بيانات القيد
                </h2>
                <Link
                  href="/dashboard/student/profile"
                  className="text-xs font-semibold text-[#14352c] hover:underline"
                >
                  عرض السجل الكامل ←
                </Link>
              </header>
              <dl className="px-5 text-sm">
                <div className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-100">
                  <dt className="text-slate-600">الرقم الجامعي</dt>
                  <dd className="flex items-center gap-1 font-medium tabular-nums">
                    <span dir="ltr">{student.studentId || "—"}</span>
                    {student.studentId && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(student.studentId!);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } catch {
                            setCopied(false);
                          }
                        }}
                        aria-label="نسخ الرقم الجامعي"
                        className={`p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-[#14352c]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <span className="sr-only" role="status">
                      {copied ? "تم النسخ" : ""}
                    </span>
                  </dd>
                </div>
                {record.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex items-center justify-between gap-3 py-3.5 ${
                      i < record.length - 1 ? "border-b border-slate-100" : ""
                    }`}
                  >
                    <dt className="text-slate-600 shrink-0">{k}</dt>
                    <dd className="font-medium min-w-0">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      )}

      {/* Digital ID */}
      <DigitalIdModal
        isOpen={showCard}
        onClose={() => setShowCard(false)}
        initialData={cardData}
      />
    </>
  );
}