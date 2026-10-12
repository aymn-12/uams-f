"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IBM_Plex_Mono } from "next/font/google";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import StudentNav from "@/components/StudentNav";
import { Check, MapPin, RefreshCw } from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

/* ───────── Helpers ───────── */

const LOCALE = "ar-IQ-u-nu-latn";
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });

const parseDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace("%", ""));
  return Number.isFinite(n) ? n : null;
};
const fmt = (n: number | null) =>
  n === null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1);
const pct = (n: number | null) => (n === null ? "—" : `${fmt(n)}%`);

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]";
const fieldBase =
  "w-full px-3 bg-white border rounded-md text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50";
const fieldOk =
  "border-slate-300 hover:border-slate-400 focus:border-[#14352c] focus:ring-[#14352c]/15";
const fieldBad = "border-red-400 focus:border-red-500 focus:ring-red-500/20";
const btnPrimary = `h-10 px-4 inline-flex items-center justify-center gap-2 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] active:bg-[#0f2a22] text-white text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${focusRing}`;

/* ───────── Small components ───────── */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-1 rounded-full bg-slate-200 overflow-hidden" role="presentation">
      <div
        className="h-full bg-[#14352c]"
        style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
      />
    </div>
  );
}

function ErrorPanel({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className={`mt-6 ${btnPrimary}`}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

function InlineAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`font-medium underline rounded ${focusRing}`}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </header>
  );
}

function RefreshControl({
  updatedAt,
  refreshing,
  disabled,
  onRefresh,
}: {
  updatedAt: Date | null;
  refreshing: boolean;
  disabled?: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      {updatedAt && (
        <span>
          آخر تحديث{" "}
          <span className={`${mono.className} tabular-nums`}>{timeFmt.format(updatedAt)}</span>
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled || refreshing}
        aria-label="تحديث"
        className={`p-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ───────── Types ───────── */

type RecordRow = {
  markedAt?: string;
  markedMethod?: string;
  session?: { section?: { sectionNumber?: string | number; course?: { name?: string } } };
  section?: { sectionNumber?: string | number; course?: { name?: string } };
};
type Stats = {
  overallRate?: string | number;
  totalAttended?: number;
  totalSessions?: number;
  warningLevel?: string;
  records?: RecordRow[];
};

/* ───────── Helpers ───────── */

const WARNING: Record<string, { label: string; hint: string; tone: string }> = {
  DISMISSAL_THRESHOLD_REACHED: {
    label: "إنذار نهائي",
    hint: "تجاوزت حد الغياب المسموح.",
    tone: "text-red-700",
  },
  FIRST_WARNING: {
    label: "إنذار أول",
    hint: "تنبيه بسبب تكرار الغياب.",
    tone: "text-amber-700",
  },
};

/** Real device location only. Never substitute fake coordinates. */
const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject({ code: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });

const locationMessage = (code?: number) =>
  code === 1
    ? "تم رفض إذن الموقع. فعّله من إعدادات المتصفح ثم أعد المحاولة."
    : code === 2
    ? "تعذّر تحديد موقعك. تأكد من تشغيل خدمة الموقع (GPS)."
    : code === 3
    ? "انتهت مهلة تحديد الموقع. حاول مرة أخرى."
    : "المتصفح لا يدعم تحديد الموقع.";

/* ───────── Page ───────── */

export default function StudentAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/");
      return;
    }
    setUser(stored);
    setReady(true);
  }, [router]);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const [sessionId, setSessionId] = useState("");
  const [token, setToken] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<"idle" | "locating" | "sending">("idle");
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/attendance/student/me");
      setStats(res.data ?? null);
      setUpdatedAt(new Date());
      setError("");
    } catch (err: any) {
      setError(err?.message || "تعذّر تحميل سجل الحضور.");
    }
  }, []);

  const loadAll = useCallback(async () => {
    const cached = smartCache.get<Stats>("/attendance/student/me");
    if (cached?.data) {
      setStats(cached.data);
      setLoading(false);
    }
    await fetchStats();
    setLoading(false);
  }, [fetchStats]);

  useEffect(() => {
    if (ready) loadAll();
  }, [ready, loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const sessionError = !sessionId.trim() ? "أدخل معرّف الجلسة." : "";
  const tokenError = !token.trim() ? "أدخل الرمز المؤقت." : "";
  const busy = phase !== "idle";

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTouched(true);
    setResult(null);
    if (sessionError || tokenError) return;

    try {
      setPhase("locating");
      let position: GeolocationPosition;
      try {
        position = await getPosition();
      } catch (err: any) {
        setResult({ type: "error", message: locationMessage(err?.code) });
        return;
      }

      setPhase("sending");
      await apiFetch("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          token: token.trim(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      setSessionId("");
      setToken("");
      setTouched(false);
      setResult({
        type: "success",
        message: `تم تسجيل حضورك الساعة ${timeFmt.format(new Date())}.`,
      });
      fetchStats();
    } catch (err: any) {
      setResult({
        type: "error",
        message: err?.message || "تعذّر تسجيل الحضور. تحقق من الرمز وأنك داخل القاعة.",
      });
    } finally {
      setPhase("idle");
    }
  };

  const records = useMemo(
    () =>
      [...(stats?.records ?? [])].sort(
        (a, b) => (parseDate(b.markedAt)?.getTime() ?? 0) - (parseDate(a.markedAt)?.getTime() ?? 0)
      ),
    [stats]
  );

  const attended = stats?.totalAttended ?? null;
  const sessions = stats?.totalSessions ?? null;
  const rate =
    num(stats?.overallRate) ??
    (attended !== null && sessions ? Math.round((attended / sessions) * 1000) / 10 : null);
  const warning = stats?.warningLevel ? WARNING[stats.warningLevel] : undefined;

  const helpText = "text-xs text-slate-500 mt-1.5";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StudentNav user={user} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader title="تسجيل الحضور" description="سجّل حضورك في المحاضرة وتابع سجل حضورك.">
        <RefreshControl
          updatedAt={updatedAt}
          refreshing={refreshing}
          disabled={loading}
          onRefresh={refresh}
        />
      </PageHeader>

      {loading ? (
        <div role="status" aria-label="جارٍ التحميل" className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid lg:grid-cols-[22rem_1fr] gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      ) : error && !stats ? (
        <ErrorPanel title="تعذّر تحميل سجل الحضور" message={error} onRetry={loadAll} />
      ) : (
        <>
          {error && <InlineAlert message={error} onRetry={refresh} />}

          {/* Summary */}
          <section
            aria-label="الملخص"
            className="rounded-lg border border-slate-200 border-t-2 border-t-[#b8923f] overflow-hidden"
          >
            <div className="grid sm:grid-cols-3 gap-px bg-slate-200">
              <div className="bg-white p-5">
                <div className="text-sm text-slate-600">نسبة الحضور</div>
                <div className={`${mono.className} mt-2 text-3xl font-semibold tabular-nums`}>
                  {pct(rate !== null ? Math.round(rate) : null)}
                </div>
                <div className="mt-3">
                  <Bar value={rate} />
                </div>
              </div>

              <div className="bg-white p-5">
                <div className="text-sm text-slate-600">المحاضرات المحضورة</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className={`${mono.className} text-3xl font-semibold tabular-nums`}>
                    {attended ?? "—"}
                  </span>
                  <span className={`${mono.className} text-sm text-slate-500 tabular-nums`}>
                    / {sessions ?? "—"}
                  </span>
                </div>
                <div className="mt-3">
                  <Bar value={attended !== null && sessions ? (attended / sessions) * 100 : null} />
                </div>
              </div>

              <div className="bg-white p-5">
                <div className="text-sm text-slate-600">حالة الإنذار</div>
                <div className={`mt-2 text-xl font-semibold ${warning?.tone ?? "text-slate-900"}`}>
                  {stats ? warning?.label ?? "لا إنذارات" : "—"}
                </div>
                {warning && <div className="mt-2 text-xs text-slate-500">{warning.hint}</div>}
              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-[22rem_1fr] gap-6 items-start">
            {/* Check-in */}
            <section className="rounded-lg border border-slate-200 bg-white lg:sticky lg:top-36">
              <header className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold">تسجيل حضور المحاضرة</h2>
                <p className="mt-1 text-xs text-slate-600">
                  أدخل البيانات المعروضة على شاشة القاعة.
                </p>
              </header>

              <form onSubmit={handleCheckIn} noValidate className="p-5 space-y-4">
                <div>
                  <label htmlFor="session" className="block text-sm font-medium text-slate-800 mb-1.5">
                    معرّف الجلسة
                  </label>
                  <input
                    id="session"
                    type="text"
                    dir="ltr"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={sessionId}
                    disabled={busy}
                    onChange={(e) => {
                      setSessionId(e.target.value);
                      setResult(null);
                    }}
                    aria-invalid={touched && !!sessionError}
                    aria-describedby={touched && sessionError ? "session-error" : undefined}
                    className={`${fieldBase} ${mono.className} h-10 text-left ${
                      touched && sessionError ? fieldBad : fieldOk
                    }`}
                  />
                  {touched && sessionError && (
                    <p id="session-error" className="mt-1.5 text-xs text-red-700">
                      {sessionError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-slate-800 mb-1.5">
                    الرمز المؤقت
                  </label>
                  <input
                    id="token"
                    type="text"
                    dir="ltr"
                    autoComplete="one-time-code"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={token}
                    disabled={busy}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setResult(null);
                    }}
                    aria-invalid={touched && !!tokenError}
                    aria-describedby={touched && tokenError ? "token-error" : "token-help"}
                    className={`${fieldBase} ${mono.className} h-11 text-center text-lg tracking-[0.3em] ${
                      touched && tokenError ? fieldBad : fieldOk
                    }`}
                  />
                  {touched && tokenError ? (
                    <p id="token-error" className="mt-1.5 text-xs text-red-700">
                      {tokenError}
                    </p>
                  ) : (
                    <p id="token-help" className={helpText}>
                      يتغير الرمز كل 60 ثانية. أدخله فور ظهوره.
                    </p>
                  )}
                </div>

                <p className="flex items-start gap-2 text-xs text-slate-600 leading-5">
                  <MapPin className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
                  سيطلب المتصفح إذن الموقع للتأكد من وجودك داخل القاعة.
                </p>

                <div aria-live="polite">
                  {result?.type === "error" && (
                    <p
                      role="alert"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                    >
                      {result.message}
                    </p>
                  )}
                  {result?.type === "success" && (
                    <p
                      role="status"
                      className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
                    >
                      <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {result.message}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={busy} className={`w-full ${btnPrimary}`}>
                  {busy && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {phase === "locating"
                    ? "جارٍ تحديد الموقع..."
                    : phase === "sending"
                    ? "جارٍ التحقق..."
                    : "تسجيل الحضور"}
                </button>
              </form>
            </section>

            {/* Records */}
            {records.length === 0 ? (
              <EmptyState>لا توجد سجلات حضور بعد.</EmptyState>
            ) : (
              <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold">سجل الحضور</h2>
                  <span className={`${mono.className} text-sm text-slate-500 tabular-nums`}>
                    {records.length}
                  </span>
                </header>

                <div className="overflow-auto max-h-[32rem]">
                  <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">سجل الحضور الموثق</caption>
                    <thead className="sticky top-0">
                      <tr className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                        <th scope="col" className="px-5 py-3 text-start font-medium">المقرر</th>
                        <th scope="col" className="px-5 py-3 text-start font-medium">التاريخ</th>
                        <th scope="col" className="px-5 py-3 text-start font-medium">الطريقة</th>
                        <th scope="col" className="px-5 py-3 text-start font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r, i) => {
                        const section = r.session?.section || r.section;
                        const d = parseDate(r.markedAt);
                        return (
                          <tr key={i} className="hover:bg-slate-50/70">
                            <th scope="row" className="px-5 py-3.5 text-start font-medium">
                              {section?.course?.name || "محاضرة"}
                              {section?.sectionNumber && (
                                <span className="ms-2 text-xs text-slate-500 font-normal">
                                  شعبة {section.sectionNumber}
                                </span>
                              )}
                            </th>
                            <td className="px-5 py-3.5 text-slate-700">
                              {d ? (
                                <>
                                  {dateFmt.format(d)}
                                  <span className={`${mono.className} text-slate-500 tabular-nums`}>
                                    {" "}
                                    · {timeFmt.format(d)}
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {r.markedMethod ? (
                                <span
                                  className={`${mono.className} text-[11px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600`}
                                >
                                  {r.markedMethod}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border border-slate-300 text-slate-700">
                                <Check className="w-3 h-3" aria-hidden="true" />
                                حاضر
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </>
      )}
      </main>
    </div>
  );
}