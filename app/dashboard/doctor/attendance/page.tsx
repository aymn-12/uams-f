"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { smartCache } from "@/lib/cache";
import { getStoredUser, User } from "@/lib/auth";
import DoctorNav from "@/components/DoctorNav";
import Dialog from "@/components/Dialog";
import CustomSelect from "@/components/CustomSelect";
import {
  QrCode,
  Users,
  Play,
  Square,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

const mono = { className: "font-mono" };

export default function DoctorAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");

  // Live Session State
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);

  // Dialog
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

  const checkActiveSession = useCallback(async (secId: string) => {
    if (!secId) return;
    try {
      const res = await apiFetch(`/attendance/sections/${secId}/active-session`);
      if (res.data) {
        const s = res.data;
        const sId = s._id || s.session?._id;
        setActiveSession({ ...s, _id: sId });
        if (sId) {
          apiFetch(`/attendance/sessions/${sId}/live`)
            .then((liveRes) => {
              if (liveRes.data) {
                setAttendees(liveRes.data.attendees || []);
              }
            })
            .catch(() => {});
        }
      } else {
        setActiveSession(null);
        setAttendees([]);
      }
    } catch {
      setActiveSession(null);
      setAttendees([]);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/");
      return;
    }
    setUser(stored);

    Promise.all([
      apiFetch("/dashboards/doctor"),
      apiFetch("/attendance/active-session").catch(() => ({ data: null })),
    ])
      .then(([docRes, activeRes]) => {
        const secList = docRes.data?.sections || [];
        setSections(secList);

        if (activeRes.data) {
          const s = activeRes.data;
          const sId = s._id || s.session?._id;
          setActiveSession({ ...s, _id: sId });
          if (s.section) {
            setSelectedSection(s.section);
          } else if (secList.length > 0) {
            setSelectedSection(secList[0]._id);
          }
          if (sId) {
            apiFetch(`/attendance/sessions/${sId}/live`)
              .then((liveRes) => {
                if (liveRes.data) setAttendees(liveRes.data.attendees || []);
              })
              .catch(() => {});
          }
        } else if (secList.length > 0) {
          const remembered = smartCache.getWorkspace("doctor_selected_section", "");
          const activeSecId = secList.some((s: any) => s._id === remembered) ? remembered : secList[0]._id;
          setSelectedSection(activeSecId);
          checkActiveSession(activeSecId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, checkActiveSession]);

  const handleSectionChange = (secId: string) => {
    setSelectedSection(secId);
    smartCache.setWorkspace("doctor_selected_section", secId);
    checkActiveSession(secId);
  };

  // Periodic polling for live session updates if session is active
  useEffect(() => {
    const sId = activeSession?._id || activeSession?.session?._id;
    if (!sId) return;

    const interval = setInterval(() => {
      apiFetch(`/attendance/sessions/${sId}/live`)
        .then((res) => {
          if (res.data) {
            setActiveSession((prev: any) => ({
              ...prev,
              _id: sId,
              qrImage: res.data.qrImage || prev?.qrImage,
              token: res.data.token || prev?.token,
            }));
            setAttendees(res.data.attendees || []);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [activeSession?._id, activeSession?.session?._id]);

  const handleStartSession = async () => {
    if (!selectedSection) return;
    setCreating(true);

    try {
      const res = await apiFetch("/attendance/sessions", {
        method: "POST",
        body: JSON.stringify({
          sectionId: selectedSection,
          sessionType: "LECTURE",
          durationMinutes: 90,
          latitude: 33.3128,
          longitude: 44.3615,
          radiusMeters: 50,
        }),
      });

      const sData = res.data?.session || res.data;
      const sId = sData?._id || res.data?._id;
      setActiveSession({
        ...sData,
        _id: sId,
        qrImage: res.data?.qrImage,
        token: res.data?.token,
      });
      setAttendees([]);
      setDialog({
        isOpen: true,
        title: "تم فتح الجلسة بنجاح",
        message: "الجلسة نشطة الآن وبدأ توليد الرموز اللحظية للطلبة.",
        type: "success",
      });
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في بدء الجلسة",
        message: err.message || "تعذر بدء الجلسة.",
        type: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCloseSession = async () => {
    const sId = activeSession?._id || activeSession?.session?._id;
    if (!sId) {
      setDialog({
        isOpen: true,
        title: "تنبيه",
        message: "معرف الجلسة غير متوفر للإغلاق.",
        type: "danger",
      });
      return;
    }
    setClosing(true);

    try {
      await apiFetch(`/attendance/sessions/${sId}/close`, {
        method: "PUT",
      });

      setActiveSession(null);
      setAttendees([]);
      setDialog({
        isOpen: true,
        title: "تم إغلاق الجلسة الأكاديمية",
        message: "تم تثبيت الحضور وحفظ السجلات في قاعدة البيانات بنجاح.",
        type: "success",
      });
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في الإغلاق",
        message: err.message || "فشل إغلاق الجلسة.",
        type: "danger",
      });
    } finally {
      setClosing(false);
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
              <span className="text-[#14352c] font-semibold">الحضور الحي</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <QrCode className="w-7 h-7 text-[#14352c]" />
              غرفة إدارة الحضور الحي (Live QR Engine)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              عرض شاشة القاعة وتحديث رمز الاستجابة السريعة كل دقيقة مع حماية الموقع الجغرافي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sections.length > 0 && !activeSession && (
              <CustomSelect
                options={sectionOptions}
                value={selectedSection}
                onChange={handleSectionChange}
                className="min-w-[240px]"
                theme="light"
              />
            )}

            {!activeSession ? (
              <button
                onClick={handleStartSession}
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                بدء جلسة الحضور
              </button>
            ) : (
              <button
                onClick={handleCloseSession}
                disabled={closing}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {closing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                إنهاء وإغلاق الجلسة
              </button>
            )}
          </div>
        </div>

        {/* Live Presentation Area */}
        {activeSession ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live QR Screen */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-sm relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                جلسة نشطة ومباشرة في القاعة الدراسية
              </div>

              {activeSession.qrImage && (
                <div className="p-6 bg-slate-50 rounded-2xl inline-block shadow-inner border border-slate-200">
                  <img
                    src={activeSession.qrImage}
                    alt="Active Session QR"
                    className="w-72 h-72 mx-auto object-contain rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                  <span className={`bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 ${mono.className}`}>
                    Session ID: {activeSession._id}
                  </span>
                  <span className={`bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-[#14352c] font-bold ${mono.className}`}>
                    Token: {activeSession.token || "******"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  الرمز يتجدد أوتوماتيكياً كل دقيقة لمنع تصوير الشاشة وتمريرها بين الطلبة.
                </p>
              </div>
            </div>

            {/* Live Attendee Stream */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#14352c]" />
                    قائمة الحاضرين حالياً
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 ${mono.className}`}>
                    {attendees.length} طالب
                  </span>
                </div>

                <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto">
                  {attendees.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-12">
                      بانتظار مسح الطلبة للرمز...
                    </p>
                  ) : (
                    attendees.map((att: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-800">
                            {att.student?.name || att.studentName || "طالب"}
                          </span>
                        </div>
                        <span className={`text-[11px] text-slate-500 ${mono.className}`}>
                          {att.checkedInAt ? new Date(att.checkedInAt).toLocaleTimeString("ar-IQ") : "الآن"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>التحقق بالموقع الجغرافي نشط ضمن دائرة 50 متراً.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-4 p-6">
            <div className="size-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <QrCode className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">لا توجد جلسة حضور مفتوحة حالياً</h3>
              <p className="text-xs text-slate-500">اختر الشعبة الدراسية واضغط على زر "بدء جلسة الحضور" بالأعلى.</p>
            </div>
          </div>
        )}
      </main>

      {/* Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        type={dialog.type}
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-300">{dialog.message}</p>
          <button
            onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </Dialog>
    </div>
  );
}
