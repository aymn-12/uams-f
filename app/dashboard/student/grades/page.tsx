"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IBM_Plex_Mono } from "next/font/google";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import StudentNav from "@/components/StudentNav";
import CustomSelect from "@/components/CustomSelect";
import { ChevronDown, RefreshCw } from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

/* ───────── Types ───────── */

type GradeRow = {
  examTitle?: string;
  title?: string;
  examType?: string;
  score?: number | string | null;
  maxScore?: number | string | null;
  weightPercentage?: number | string | null;
  percentage?: number | string | null;
};
type GradeData = {
  breakdown?: GradeRow[];
  grades?: GradeRow[];
  accumulatedScore?: number | string;
  totalScore?: number | string;
  maxTotal?: number | string;
  totalWeightEvaluated?: number | string;
  letterGrade?: string;
  evaluation?: string;
};

/* ───────── Helpers ───────── */

const TOTAL_MAX_DEFAULT = 100; // coursework total, override with gradeData.maxTotal if the API sends it

const LOCALE = "ar-IQ-u-nu-latn";
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace("%", ""));
  return Number.isFinite(n) ? n : null;
};
const fmt = (n: number | null) =>
  n === null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1);
const pct = (n: number | null) => (n === null ? "—" : `${fmt(n)}%`);

const fieldBase =
  "w-full px-3 bg-white border rounded-md text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50";
const fieldOk =
  "border-slate-300 hover:border-slate-400 focus:border-[#14352c] focus:ring-[#14352c]/15";

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

/* ───────── Page ───────── */

export default function StudentGradesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [sections, setSections] = useState<{ value: string; label: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<GradeData | null>(null);

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const reqId = useRef(0);

  const fetchGrades = useCallback(async (sectionId: string) => {
    if (!sectionId) return;
    const id = ++reqId.current;
    setFetching(true);
    setGradeError("");
    try {
      const res = await apiFetch(`/exams/section/${encodeURIComponent(sectionId)}/my-breakdown`);
      if (id !== reqId.current) return;
      setData(res.data ?? null);
      setUpdatedAt(new Date());
    } catch (err: any) {
      if (id !== reqId.current) return;
      setData(null);
      setGradeError(err?.message || "تعذّر تحميل الدرجات.");
    } finally {
      if (id === reqId.current) setFetching(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiFetch("/dashboards/student");
      const seen = new Set<string>();
      const opts: { value: string; label: string }[] = [];
      for (const sec of res.data?.enrolledSections || []) {
        const value = sec.section?._id || sec._id;
        if (!value || seen.has(value)) continue;
        seen.add(value);
        opts.push({
          value,
          label: sec.section?.course?.name || sec.course?.name || "مقرر",
        });
      }
      setSections(opts);
      if (opts.length > 0) {
        const remembered = smartCache.getWorkspace("student_selected_section", "");
        const activeVal = opts.some((o) => o.value === remembered) ? remembered : opts[0].value;
        setSelected(activeVal);
        fetchGrades(activeVal);
      }
    } catch (err: any) {
      setLoadError(err?.message || "تعذّر تحميل المقررات.");
    } finally {
      setLoading(false);
    }
  }, [fetchGrades]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/");
      return;
    }
    setUser(stored);
    loadAll();
  }, [router, loadAll]);

  const rows = data?.breakdown ?? data?.grades ?? [];
  const total = num(data?.accumulatedScore ?? data?.totalScore);
  const totalMax = num(data?.maxTotal) ?? TOTAL_MAX_DEFAULT;
  const totalPct = total !== null ? (total / totalMax) * 100 : null;
  const weightEvaluated = num(data?.totalWeightEvaluated);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StudentNav user={user} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold">كشف الدرجات</h1>
            <p className="mt-1 text-sm text-slate-600">
              درجات الامتحانات والواجبات والمشاركة لكل مقرر.
            </p>
          </div>

          {sections.length > 0 && (
            <div className="flex items-center gap-3">
              <CustomSelect
                id="section"
                options={sections}
                value={selected}
                onChange={(val) => {
                  setSelected(val);
                  smartCache.setWorkspace("student_selected_section", val);
                  fetchGrades(val);
                }}
                className="w-64"
                theme="light"
              />
              <button
                type="button"
                onClick={() => fetchGrades(selected)}
                disabled={fetching}
                aria-label="تحديث الدرجات"
                className={`p-2.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
              >
                <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <div role="status" aria-label="جارٍ التحميل" className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">تعذّر تحميل المقررات</h2>
            <p className="mt-2 text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={loadAll}
              className={`mt-6 h-10 px-4 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] text-white text-sm font-medium ${focusRing}`}
            >
              إعادة المحاولة
            </button>
          </div>
        ) : sections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
            لا توجد مقررات مسجَّلة لك.
          </p>
        ) : (
          <div aria-busy={fetching} className={`space-y-6 transition-opacity ${fetching ? "opacity-60" : ""}`}>
            {gradeError ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 flex items-center justify-between gap-3 text-sm text-red-800">
                <span>{gradeError}</span>
                <button
                  type="button"
                  onClick={() => fetchGrades(selected)}
                  className={`font-medium underline rounded ${focusRing}`}
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <>
                {/* Summary */}
                <section
                  aria-label="الملخص"
                  className="rounded-lg border border-slate-200 border-t-2 border-t-[#b8923f] overflow-hidden"
                >
                  <div className="grid sm:grid-cols-3 gap-px bg-slate-200">
                    <div className="bg-white p-5">
                      <div className="text-sm text-slate-600">الدرجة المتراكمة</div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className={`${mono.className} text-3xl font-semibold tabular-nums`}>
                          {fmt(total)}
                        </span>
                        <span className={`${mono.className} text-sm text-slate-500 tabular-nums`}>
                          / {fmt(totalMax)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Bar value={totalPct} />
                      </div>
                      <div className={`${mono.className} mt-2 text-xs text-slate-500 tabular-nums`}>
                        {pct(totalPct !== null ? Math.round(totalPct * 10) / 10 : null)}
                      </div>
                    </div>

                    <div className="bg-white p-5">
                      <div className="text-sm text-slate-600">الوزن المقيَّم</div>
                      <div className="mt-2">
                        <span className={`${mono.className} text-3xl font-semibold tabular-nums`}>
                          {pct(weightEvaluated)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Bar value={weightEvaluated} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">من مجموع درجات المقرر</div>
                    </div>

                    <div className="bg-white p-5">
                      <div className="text-sm text-slate-600">التقدير</div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className={`${mono.className} text-3xl font-semibold`}>
                          {data?.letterGrade || "—"}
                        </span>
                        {data?.evaluation && (
                          <span className="text-sm text-slate-600">{data.evaluation}</span>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        {updatedAt && (
                          <>
                            آخر تحديث{" "}
                            <span className={`${mono.className} tabular-nums`}>
                              {timeFmt.format(updatedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Ledger */}
                {rows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
                    لم تُرصد درجات لهذا المقرر بعد. تظهر النتائج فور اعتمادها.
                  </p>
                ) : (
                  <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                      <h2 className="text-base font-semibold">تفاصيل التقييمات</h2>
                      <span className={`${mono.className} text-sm text-slate-500 tabular-nums`}>
                        {rows.length}
                      </span>
                    </header>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <caption className="sr-only">تفاصيل درجات التقييمات</caption>
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                            <th scope="col" className="px-5 py-3 text-start font-medium">التقييم</th>
                            <th scope="col" className="px-5 py-3 text-start font-medium">الدرجة</th>
                            <th scope="col" className="px-5 py-3 text-start font-medium">الوزن</th>
                            <th scope="col" className="px-5 py-3 text-start font-medium w-48">النسبة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((g, i) => {
                            const score = num(g.score);
                            const max = num(g.maxScore);
                            const p =
                              num(g.percentage) ??
                              (score !== null && max ? (score / max) * 100 : null);
                            const weight = num(g.weightPercentage);
                            return (
                              <tr key={i} className="hover:bg-slate-50/70">
                                <th scope="row" className="px-5 py-4 text-start font-medium">
                                  {g.examTitle || g.title || "تقييم"}
                                  {g.examType && (
                                    <span
                                      className={`${mono.className} ms-2 text-[11px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 font-normal`}
                                    >
                                      {g.examType}
                                    </span>
                                  )}
                                </th>
                                <td className={`${mono.className} px-5 py-4 tabular-nums`}>
                                  <span className="font-semibold">{fmt(score)}</span>
                                  {max !== null && (
                                    <span className="text-slate-500"> / {fmt(max)}</span>
                                  )}
                                </td>
                                <td className={`${mono.className} px-5 py-4 tabular-nums text-slate-700`}>
                                  {pct(weight)}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <Bar value={p} />
                                    </div>
                                    <span className={`${mono.className} w-14 text-xs tabular-nums text-slate-700`}>
                                      {pct(p !== null ? Math.round(p * 10) / 10 : null)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-200">
                            <th scope="row" className="px-5 py-3.5 text-start font-semibold">
                              المجموع المتراكم
                            </th>
                            <td className={`${mono.className} px-5 py-3.5 tabular-nums`}>
                              <span className="font-semibold">{fmt(total)}</span>
                              <span className="text-slate-500"> / {fmt(totalMax)}</span>
                            </td>
                            <td className={`${mono.className} px-5 py-3.5 tabular-nums text-slate-700`}>
                              {pct(weightEvaluated)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}