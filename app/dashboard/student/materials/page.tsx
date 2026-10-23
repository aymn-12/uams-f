"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import StudentNav from "@/components/StudentNav";
import CustomSelect from "@/components/CustomSelect";
import { ChevronDown, Download, RefreshCw, Search, Trash2, X } from "lucide-react";

const mono = { className: "font-mono" };

/* ───────── Config ───────── */

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "uams_access_token";

/* ───────── Types ───────── */

type Material = {
  _id: string;
  title?: string;
  description?: string;
  fileType?: string;
  fileSize?: number;
  createdAt?: string;
};
type Annotation = { _id: string; pageNumber?: number; content?: string };
type SectionOption = { value: string; label: string };

/* ───────── Helpers ───────── */

const LOCALE = "ar-IQ-u-nu-latn";
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });

const parseDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** filename from Content-Disposition (RFC 5987 first, then plain) */
const filenameFrom = (header: string | null) => {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14352c]";
const fieldBase =
  "w-full px-3 bg-white border rounded-md text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50";
const fieldOk =
  "border-slate-300 hover:border-slate-400 focus:border-[#14352c] focus:ring-[#14352c]/15";
const fieldBad = "border-red-400 focus:border-red-500 focus:ring-red-500/20";
const btnPrimary = `h-10 px-4 inline-flex items-center justify-center gap-2 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] active:bg-[#0f2a22] text-white text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${focusRing}`;
const btnSecondary = `h-10 px-4 inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${focusRing}`;

/* ───────── Small components ───────── */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
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

function SectionSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SectionOption[];
  className?: string;
}) {
  return (
    <CustomSelect
      id="section-select"
      options={options}
      value={value}
      onChange={onChange}
      className={className}
      theme="light"
    />
  );
}

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
              {subtitle && <p className="mt-0.5 text-xs text-slate-600 truncate">{subtitle}</p>}
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

/* ───────── Page ───────── */

export default function StudentMaterialsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");
  const [selected, setSelected] = useState("");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [fetching, setFetching] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const matReq = useRef(0);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // annotations
  const [active, setActive] = useState<Material | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState("");
  const [pageNumber, setPageNumber] = useState("1");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const annReq = useRef(0);

  /* session guard */
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/");
      return;
    }
    setUser(stored);
    setReady(true);
  }, [router]);

  /* sections */
  const loadSections = useCallback(async () => {
    setSectionsLoading(true);
    setSectionsError("");
    try {
      const res = await apiFetch("/dashboards/student");
      const seen = new Set<string>();
      const opts: SectionOption[] = [];
      for (const sec of res.data?.enrolledSections || []) {
        const value = sec.section?._id || sec._id;
        if (!value || seen.has(value)) continue;
        seen.add(value);
        const name = sec.section?.course?.name || sec.course?.name || "مقرر";
        const num = sec.sectionNumber || sec.section?.sectionNumber;
        opts.push({ value, label: num ? `${name} (شعبة ${num})` : name });
      }
      setSections(opts);
    } catch (err: any) {
      setSectionsError(err?.message || "تعذّر تحميل المقررات.");
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadSections();
  }, [ready, loadSections]);

  /* materials */
  const fetchMaterials = useCallback(async (sectionId: string) => {
    if (!sectionId) return;
    const id = ++matReq.current;
    setFetching(true);
    setMaterialsError("");
    try {
      const res = await apiFetch(`/materials/section/${encodeURIComponent(sectionId)}`);
      if (id !== matReq.current) return;
      setMaterials(res.data || []);
      setUpdatedAt(new Date());
    } catch (err: any) {
      if (id !== matReq.current) return;
      setMaterials([]);
      setMaterialsError(err?.message || "تعذّر تحميل الملفات.");
    } finally {
      if (id === matReq.current) setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!selected && sections.length > 0) {
      const remembered = smartCache.getWorkspace("student_selected_section", "");
      const activeVal = sections.some((s) => s.value === remembered) ? remembered : sections[0].value;
      setSelected(activeVal);
      fetchMaterials(activeVal);
    }
  }, [sections, selected, fetchMaterials]);

  const changeSection = (value: string) => {
    setSelected(value);
    smartCache.setWorkspace("student_selected_section", value);
    setQuery("");
    setActionError("");
    fetchMaterials(value);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...materials]
      .sort(
        (a, b) => (parseDate(b.createdAt)?.getTime() ?? 0) - (parseDate(a.createdAt)?.getTime() ?? 0)
      )
      .filter(
        (m) =>
          !q ||
          (m.title ?? "").toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q)
      );
  }, [materials, query]);

  /* download: Authorization header, never a token in the URL */
  const download = async (m: Material) => {
    if (downloadingId) return;
    setActionError("");
    if (!API_URL) {
      setActionError("عنوان الخادم غير مضبوط (NEXT_PUBLIC_API_URL).");
      return;
    }
    setDownloadingId(m._id);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_URL}/files/material/${encodeURIComponent(m._id)}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(
          res.status === 401 || res.status === 403
            ? "لا تملك صلاحية تحميل هذا الملف. أعد تسجيل الدخول."
            : res.status === 404
            ? "الملف غير موجود."
            : "تعذّر تحميل الملف."
        );
      }
      const blob = await res.blob();
      const name =
        filenameFrom(res.headers.get("Content-Disposition")) ||
        `${m.title || "material"}${m.fileType ? `.${m.fileType.toLowerCase()}` : ""}`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (err: any) {
      setActionError(err?.message || "تعذّر تحميل الملف.");
    } finally {
      setDownloadingId(null);
    }
  };

  /* annotations */
  const loadAnnotations = useCallback(async (materialId: string) => {
    const id = ++annReq.current;
    setAnnLoading(true);
    setAnnError("");
    try {
      const res = await apiFetch(`/materials/${encodeURIComponent(materialId)}/my-annotations`);
      if (id !== annReq.current) return;
      setAnnotations(res.data || []);
    } catch (err: any) {
      if (id !== annReq.current) return;
      setAnnotations([]);
      setAnnError(err?.message || "تعذّر تحميل الملاحظات.");
    } finally {
      if (id === annReq.current) setAnnLoading(false);
    }
  }, []);

  const openAnnotations = (m: Material) => {
    setActive(m);
    setAnnotations([]);
    setPageNumber("1");
    setNote("");
    setTouched(false);
    setFormError("");
    setConfirmDeleteId(null);
    loadAnnotations(m._id);
  };

  const closeAnnotations = () => {
    annReq.current++;
    setActive(null);
  };

  const pageNum = Number(pageNumber);
  const pageError =
    !pageNumber.trim() || !Number.isInteger(pageNum) || pageNum < 1 ? "أدخل رقم صفحة صحيحًا." : "";
  const noteError = !note.trim() ? "اكتب الملاحظة." : "";

  const addAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || saving) return;
    setTouched(true);
    setFormError("");
    if (pageError || noteError) return;

    setSaving(true);
    try {
      const res = await apiFetch(`/materials/${encodeURIComponent(active._id)}/annotations`, {
        method: "POST",
        body: JSON.stringify({ pageNumber: pageNum, content: note.trim() }),
      });
      if (res.data) setAnnotations((prev) => [...prev, res.data]);
      else await loadAnnotations(active._id);
      setNote("");
      setTouched(false);
    } catch (err: any) {
      setFormError(err?.message || "تعذّر حفظ الملاحظة.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnotation = async (annId: string) => {
    if (!active || deletingId) return;
    setDeletingId(annId);
    setAnnError("");
    try {
      await apiFetch(
        `/materials/${encodeURIComponent(active._id)}/annotations/${encodeURIComponent(annId)}`,
        { method: "DELETE" }
      );
      setAnnotations((prev) => prev.filter((a) => a._id !== annId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setAnnError(err?.message || "تعذّر حذف الملاحظة.");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedAnnotations = useMemo(
    () => [...annotations].sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0)),
    [annotations]
  );

  /* render */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StudentNav user={user} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader title="المحاضرات والملازم" description="حمّل ملفات المقرر ودوّن ملاحظاتك على صفحاتها.">
          {sections.length > 0 && (
            <div className="flex items-center gap-3">
              <SectionSelect
                value={selected}
                onChange={changeSection}
                options={sections}
                className="w-64"
              />
              <RefreshControl
                updatedAt={updatedAt}
                refreshing={fetching}
                onRefresh={() => fetchMaterials(selected)}
              />
            </div>
          )}
        </PageHeader>

        {sectionsLoading ? (
          <div role="status" aria-label="جارٍ التحميل" className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : sectionsError ? (
          <ErrorPanel title="تعذّر تحميل المقررات" message={sectionsError} onRetry={loadSections} />
        ) : sections.length === 0 ? (
          <EmptyState>لا توجد مقررات مسجَّلة لك.</EmptyState>
        ) : materialsError && materials.length === 0 ? (
          <ErrorPanel
            title="تعذّر تحميل الملفات"
            message={materialsError}
            onRetry={() => fetchMaterials(selected)}
          />
        ) : (
          <div aria-busy={fetching} className={`space-y-4 transition-opacity ${fetching ? "opacity-60" : ""}`}>
            {actionError && <InlineAlert message={actionError} />}

            {materials.length > 0 && (
              <div className="relative sm:w-80">
                <label htmlFor="search" className="sr-only">
                  بحث في الملفات
                </label>
                <Search
                  className="w-4 h-4 text-slate-500 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث بعنوان الملف"
                  className={`${fieldBase} ${fieldOk} h-10 ps-9`}
                />
              </div>
            )}

            {materials.length === 0 ? (
              <EmptyState>لا توجد ملفات مرفوعة لهذا المقرر بعد.</EmptyState>
            ) : visible.length === 0 ? (
              <EmptyState>لا توجد نتائج مطابقة.</EmptyState>
            ) : (
              <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold">ملفات المقرر</h2>
                  <span className={`${mono.className} text-sm text-slate-500 tabular-nums`}>
                    {visible.length}
                  </span>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <caption className="sr-only">ملفات المقرر</caption>
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                        <th scope="col" className="px-5 py-3 text-start font-medium">الملف</th>
                        <th scope="col" className="px-5 py-3 text-start font-medium">النوع</th>
                        <th scope="col" className="px-5 py-3 text-start font-medium">الحجم</th>
                        <th scope="col" className="px-5 py-3 text-start font-medium">تاريخ الرفع</th>
                        <th scope="col" className="px-5 py-3 w-px">
                          <span className="sr-only">إجراءات</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map((m) => {
                        const d = parseDate(m.createdAt);
                        const busy = downloadingId === m._id;
                        return (
                          <tr key={m._id} className="hover:bg-slate-50/70 align-top">
                            <th scope="row" className="px-5 py-4 text-start font-medium">
                              {m.title || "بدون عنوان"}
                              {m.description && (
                                <span className="block mt-1 text-xs font-normal text-slate-600 leading-5 line-clamp-2 max-w-md">
                                  {m.description}
                                </span>
                              )}
                            </th>
                            <td className="px-5 py-4">
                              {m.fileType ? (
                                <span
                                  className={`${mono.className} text-[11px] uppercase px-1.5 py-0.5 rounded border border-slate-300 text-slate-600`}
                                >
                                  {m.fileType}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className={`${mono.className} px-5 py-4 tabular-nums text-slate-700 whitespace-nowrap`}>
                              {fmtSize(m.fileSize)}
                            </td>
                            <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                              {d ? dateFmt.format(d) : "—"}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => openAnnotations(m)}
                                  className={`h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium whitespace-nowrap ${focusRing}`}
                                >
                                  ملاحظاتي
                                </button>
                                <button
                                  type="button"
                                  onClick={() => download(m)}
                                  disabled={!!downloadingId}
                                  className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-md bg-[#14352c] hover:bg-[#1b4a3d] text-white text-sm font-medium whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${focusRing}`}
                                >
                                  {busy ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Download className="w-4 h-4" aria-hidden="true" />
                                  )}
                                  {busy ? "جارٍ التحميل" : "تحميل"}
                                </button>
                              </div>
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
        )}
      </main>

      {/* Annotations */}
      <Modal
        open={!!active}
        onClose={closeAnnotations}
        title="ملاحظاتي"
        subtitle={active?.title}
      >
        <div className="space-y-5">
          <form onSubmit={addAnnotation} noValidate className="space-y-3">
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <div>
                <label htmlFor="page" className="block text-sm font-medium text-slate-800 mb-1.5">
                  الصفحة
                </label>
                <input
                  id="page"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={pageNumber}
                  disabled={saving}
                  onChange={(e) => setPageNumber(e.target.value)}
                  aria-invalid={touched && !!pageError}
                  className={`${fieldBase} ${mono.className} h-10 text-left tabular-nums ${
                    touched && pageError ? fieldBad : fieldOk
                  }`}
                />
              </div>
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-slate-800 mb-1.5">
                  الملاحظة
                </label>
                <textarea
                  id="note"
                  rows={2}
                  value={note}
                  disabled={saving}
                  onChange={(e) => setNote(e.target.value)}
                  aria-invalid={touched && !!noteError}
                  className={`${fieldBase} py-2 leading-6 resize-y ${
                    touched && noteError ? fieldBad : fieldOk
                  }`}
                />
              </div>
            </div>

            {touched && (pageError || noteError) && (
              <p className="text-xs text-red-700">{pageError || noteError}</p>
            )}
            {formError && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {formError}
              </p>
            )}

            <button type="submit" disabled={saving} className={`w-full ${btnPrimary}`}>
              {saving && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {saving ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
            </button>
          </form>

          <div>
            <h3 className="text-sm font-semibold mb-2">الملاحظات المدوّنة</h3>

            {annError && (
              <div className="mb-3">
                <InlineAlert
                  message={annError}
                  onRetry={active ? () => loadAnnotations(active._id) : undefined}
                />
              </div>
            )}

            {annLoading ? (
              <div role="status" aria-label="جارٍ التحميل" className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : sortedAnnotations.length === 0 ? (
              !annError && (
                <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  لا توجد ملاحظات على هذا الملف بعد.
                </p>
              )
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {sortedAnnotations.map((a) => {
                  const confirming = confirmDeleteId === a._id;
                  const deleting = deletingId === a._id;
                  return (
                    <li
                      key={a._id}
                      className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <span
                          className={`${mono.className} text-[11px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 tabular-nums`}
                        >
                          ص {a.pageNumber ?? "—"}
                        </span>
                        <p className="mt-1.5 text-sm leading-6 text-slate-800 break-words">
                          {a.content}
                        </p>
                      </div>

                      {confirming ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => deleteAnnotation(a._id)}
                            disabled={deleting}
                            className={`h-8 px-2.5 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-medium disabled:opacity-70 ${focusRing}`}
                          >
                            {deleting ? "..." : "تأكيد الحذف"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deleting}
                            className={`h-8 px-2.5 rounded-md border border-slate-300 text-xs font-medium hover:bg-slate-50 ${focusRing}`}
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(a._id)}
                          aria-label="حذف الملاحظة"
                          className={`p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700 shrink-0 ${focusRing}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}