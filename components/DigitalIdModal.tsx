"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw, Copy, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface DigitalIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export default function DigitalIdModal({
  isOpen,
  onClose,
  initialData,
}: DigitalIdModalProps) {
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [cardData, setCardData] = useState<any>(initialData || null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!cardData) {
        loadCard();
      }
    }
  }, [isOpen]);

  const loadCard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/digital-id/my-card");
      setCardData(res.data);
    } catch (err: any) {
      setError(err?.message || "تعذّر تحميل بيانات البطاقة.");
    } finally {
      setLoading(false);
    }
  };

  const rotateToken = async () => {
    setRotating(true);
    setError("");
    try {
      const res = await apiFetch("/digital-id/rotate-token", { method: "POST" });
      if (!res.data?.qrImage) throw new Error("لم يتم استلام رمز جديد.");
      setCardData((prev: any) => ({
        ...prev,
        qrImage: res.data.qrImage,
        tokenRotatedAt: res.data.tokenRotatedAt,
      }));
    } catch (err: any) {
      setError(err?.message || "تعذّر تجديد الرمز.");
    } finally {
      setRotating(false);
    }
  };

  const copyId = async () => {
    const sid = cardData?.studentId || "STD_2022101";
    try {
      await navigator.clipboard.writeText(sid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (isoDate?: string) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return new Intl.DateTimeFormat("ar-IQ", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
    } catch {
      return isoDate;
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[340px] bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Clean Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="/uom-logo.png"
              alt="شعار الجامعة المستنصرية"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">الجامعة المستنصرية</h3>
              <p className="text-[10px] text-slate-500 font-medium">الهوية الجامعية الذكية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Content */}
        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">جارٍ تحميل الرمز...</p>
          </div>
        ) : error && !cardData ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-rose-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={loadCard}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black transition"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Minimalist QR Card */}
            <div className="flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
                {cardData?.qrImage ? (
                  <img
                    src={cardData.qrImage}
                    alt="رمز QR للبطاقة الجامعية"
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-44 h-44 grid place-items-center text-xs text-slate-400">
                    الرمز غير متوفر
                  </div>
                )}
              </div>

              {/* Student Identity */}
              <div className="mt-4 text-center space-y-1">
                <h4 className="text-base font-bold text-slate-900 tracking-tight">
                  {cardData?.studentName || "أيمن أحمد كريم"}
                </h4>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-700">
                    {cardData?.studentId || "STD_2022101"}
                  </span>
                  <button
                    type="button"
                    onClick={copyId}
                    className="text-slate-400 hover:text-slate-700 transition"
                    title="نسخ الرقم الجامعي"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  {cardData?.department || "قسم هندسة الحاسوب"}
                  {cardData?.stage ? ` • المرحلة ${cardData.stage}` : " • المرحلة 3"}
                </p>
              </div>
            </div>

            {/* Error note if rotation fails */}
            {error && (
              <p className="text-[11px] text-rose-600 text-center font-medium">
                {error}
              </p>
            )}

            {/* Premium Minimal Action */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={rotateToken}
                disabled={rotating}
                className="w-full py-2.5 rounded-xl bg-[#18181b] hover:bg-black text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`} />
                <span>{rotating ? "جارٍ التحديث..." : "تحديث الرمز"}</span>
              </button>

              {cardData?.tokenRotatedAt && (
                <p className="text-[10px] text-slate-400 font-mono text-center">
                  آخر تحديث: {formatDate(cardData.tokenRotatedAt)}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
