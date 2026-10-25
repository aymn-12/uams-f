"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getStoredUser, User } from "@/lib/auth";
import { smartCache } from "@/lib/cache";
import Navbar from '@/components/Navbar';
import Dialog from "@/components/Dialog";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";

const mono = { className: "font-mono" };

const DAYS_ARABIC: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
};

export default function AdminSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  // Add / Edit Slot Dialog
  const [slotModal, setSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("SUNDAY");
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("10:30");
  const [room, setRoom] = useState("قاعة الخوارزمي 1");
  const [building, setBuilding] = useState("مبنى العلوم");
  const [slotType, setSlotType] = useState("LECTURE");
  const [submitting, setSubmitting] = useState(false);

  const dayOptions: SelectOption[] = [
    { value: "SUNDAY", label: "الأحد" },
    { value: "MONDAY", label: "الاثنين" },
    { value: "TUESDAY", label: "الثلاثاء" },
    { value: "WEDNESDAY", label: "الأربعاء" },
    { value: "THURSDAY", label: "الخميس" },
  ];

  const slotTypeOptions: SelectOption[] = [
    { value: "LECTURE", label: "نظري (Lecture)" },
    { value: "LAB", label: "مختبر عملي (Lab)" },
    { value: "TUTORIAL", label: "مناقشة وتطبيقات" },
  ];

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
    // Security check: Only ADMIN role allowed
    if (!stored || stored.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(stored);

    // Smart Caching for sections
    const cachedSections = smartCache.get<any[]>("/academic/sections");
    if (cachedSections?.data && cachedSections.data.length > 0) {
      setSections(cachedSections.data);
      const remembered = smartCache.getWorkspace("admin_selected_section", cachedSections.data[0]._id);
      const valid = cachedSections.data.some((s: any) => s._id === remembered) ? remembered : cachedSections.data[0]._id;
      setSelectedSection(valid);
      handleSectionSelect(valid);
      setLoading(false);
    }

    apiFetch("/academic/sections")
      .then((res) => {
        const secList = res.data || [];
        setSections(secList);
        if (secList.length > 0) {
          const remembered = smartCache.getWorkspace("admin_selected_section", secList[0]._id);
          const valid = secList.some((s: any) => s._id === remembered) ? remembered : secList[0]._id;
          setSelectedSection(valid);
          handleSectionSelect(valid);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleSectionSelect = async (secId: string) => {
    if (!secId) return;
    setSelectedSection(secId);
    smartCache.setWorkspace("admin_selected_section", secId);
    setFetchingSlots(true);

    // Try cache for section schedule
    const cacheKey = `/academic/sections/${secId}/schedule`;
    const cachedSchedule = smartCache.get<any[]>(cacheKey);
    if (cachedSchedule?.data) {
      setScheduleSlots(cachedSchedule.data);
    }

    try {
      const res = await apiFetch(`/academic/sections/${secId}/schedule`);
      setScheduleSlots(res.data || []);
    } catch {
      setScheduleSlots([]);
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSlot(null);
    setDayOfWeek("SUNDAY");
    setStartTime("08:30");
    setEndTime("10:30");
    setRoom("قاعة الخوارزمي 1");
    setBuilding("مبنى العلوم");
    setSlotType("LECTURE");
    setSlotModal(true);
  };

  const handleOpenEdit = (slot: any) => {
    setEditingSlot(slot);
    setDayOfWeek(slot.dayOfWeek || "SUNDAY");
    setStartTime(slot.startTime || "08:30");
    setEndTime(slot.endTime || "10:30");
    setRoom(slot.room || "");
    setBuilding(slot.building || "");
    setSlotType(slot.slotType || "LECTURE");
    setSlotModal(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room.trim()) return;
    setSubmitting(true);

    try {
      if (editingSlot) {
        // Update existing slot
        await apiFetch(`/academic/schedules/slots/${editingSlot._id}`, {
          method: "PUT",
          body: JSON.stringify({
            dayOfWeek,
            startTime,
            endTime,
            room: room.trim(),
            building: building.trim(),
            slotType,
          }),
        });

        setDialog({
          isOpen: true,
          title: "تم تعديل المحاضرة بنجاح",
          message: "تم تحديث وقت وقاعة المحاضرة في الجداول فورياً.",
          type: "success",
        });
      } else {
        // Add new slot to section
        if (!selectedSection) return;
        await apiFetch(`/academic/sections/${selectedSection}/schedule`, {
          method: "POST",
          body: JSON.stringify({
            dayOfWeek,
            startTime,
            endTime,
            room: room.trim(),
            building: building.trim(),
            slotType,
          }),
        });

        setDialog({
          isOpen: true,
          title: "تم تثبيت موعد المحاضرة",
          message: "تم حفظ الفترة الزمنية وتوزيع القاعة على جدول الشعبة الأسبوعي وتفادي أي تعارض.",
          type: "success",
        });
      }

      // Invalidate academic, doctor & student schedules
      smartCache.invalidate("/academic/*");
      smartCache.invalidate("/doctor/*");
      smartCache.invalidate("/student/*");

      setSlotModal(false);
      setEditingSlot(null);
      handleSectionSelect(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "خطأ في حفظ الموعد",
        message: err.message || "تعذر حفظ الموعد المحدد.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await apiFetch(`/academic/schedules/slots/${deleteConfirmId}`, {
        method: "DELETE",
      });

      smartCache.invalidate("/academic/*");
      smartCache.invalidate("/doctor/*");
      smartCache.invalidate("/student/*");

      setDeleteConfirmId(null);
      setDialog({
        isOpen: true,
        title: "تم حذف الفترة الدراسية",
        message: "تم حذف موعد المحاضرة وإلغاء حجز القاعة بنجاح.",
        type: "success",
      });

      handleSectionSelect(selectedSection);
    } catch (err: any) {
      setDialog({
        isOpen: true,
        title: "تعذر حذف الفترة",
        message: err.message || "حدث خطأ أثناء محاولة حذف المحاضرة.",
        type: "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  const sectionOptions: SelectOption[] = useMemo(() => {
    return sections.map((sec) => ({
      value: sec._id,
      label: `${sec.course?.name || "مادة"} (شعبة ${sec.sectionNumber})`,
      subLabel: `${sec.doctor?.name || "لم يحدد أستاذ"} • ${sec.capacity || 50} مقعد`,
    }));
  }, [sections]);

  const activeSectionObj = useMemo(() => {
    return sections.find((s) => s._id === selectedSection) || null;
  }, [sections, selectedSection]);

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-t-2 border-t-[#14352c] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/admin" className="hover:text-[#14352c] transition">
                لوحة الإدارة
              </Link>
              <span>/</span>
              <span className="text-[#14352c] font-semibold">الجداول وتوزيع القاعات</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <CalendarDays className="w-7 h-7 text-[#14352c]" />
              الجداول الأسبوعية وتوزيع القاعات
            </h1>
            <p className="text-sm text-slate-600">
              تنظيم الأوقات وتفادي التعارض اللحظي بين القاعات والأساتذة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sections.length > 0 && (
              <CustomSelect
                options={sectionOptions}
                value={selectedSection}
                onChange={handleSectionSelect}
                className="min-w-[260px]"
                theme="light"
              />
            )}

            <button
              onClick={handleOpenCreate}
              disabled={sections.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#14352c] hover:bg-[#1b4a3d] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              إضافة فترة دراسية
            </button>
          </div>
        </div>

        {/* Selected Section Header Banner */}
        {activeSectionObj && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-50 text-[#14352c] border border-emerald-200 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeSectionObj.course?.name || "المقرر"} - شعبة {activeSectionObj.sectionNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الأستاذ المكلف: <span className="font-semibold text-slate-800">{activeSectionObj.doctor?.name || "غير محدد"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                السنة: {activeSectionObj.academicYear || "2025-2026"}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {scheduleSlots.length} فترات مجدولة
              </span>
            </div>
          </div>
        )}

        {/* Schedule Slots Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              الفترات الزمنية المعتمدة للشعبة:
            </h3>
            {fetchingSlots && (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#14352c]" />
                جارٍ التحديث...
              </span>
            )}
          </div>

          {fetchingSlots ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#14352c]" />
              <p className="text-xs text-slate-500 font-medium">جارٍ جلب جدول الشعبة وتفاصيل القاعات...</p>
            </div>
          ) : scheduleSlots.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 p-6">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">لا توجد محاضرات مجدولة لهذه الشعبة</h4>
              <p className="text-xs text-slate-500">
                اضغط على زر "إضافة فترة دراسية" لتثبيت أوقات المحاضرات الأسبوعية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {scheduleSlots.map((slot: any) => (
                <div
                  key={slot._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-6 flex flex-col justify-between space-y-4 shadow-sm transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {DAYS_ARABIC[slot.dayOfWeek] || slot.dayOfWeek}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {slot.slotType === "LAB" ? "مختبر عملي" : "محاضرة نظرية"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                      <Clock className="w-4 h-4 text-[#14352c]" />
                      <span className={`font-mono ${mono.className}`}>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>القاعة: <strong className="text-slate-900">{slot.room}</strong></span>
                      </div>
                      {slot.building && (
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>المبنى: {slot.building}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      معتمد بدون تعارض
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(slot)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#14352c] hover:bg-emerald-50 transition"
                        title="تعديل موعد وقاعة المحاضرة"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(slot._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                        title="حذف المحاضرة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Slot Dialog */}
      <Dialog
        isOpen={slotModal}
        onClose={() => {
          setSlotModal(false);
          setEditingSlot(null);
        }}
        title={editingSlot ? "تعديل موعد وقاعة المحاضرة" : "تثبيت فترة دراسية وحجز قاعة"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">يوم المحاضرة:</label>
            <CustomSelect
              options={dayOptions}
              value={dayOfWeek}
              onChange={(val) => setDayOfWeek(val)}
              theme="light"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">وقت البدء:</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] transition ${mono.className}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">وقت الانتهاء:</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#14352c] transition ${mono.className}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">القاعة أو المختبر:</label>
              <input
                type="text"
                required
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="قاعة الخوارزمي 1"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الحصة:</label>
              <CustomSelect
                options={slotTypeOptions}
                value={slotType}
                onChange={(val) => setSlotType(val)}
                theme="light"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المبنى / الجناح الأكاديمي:</label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="مبنى هندسة الحاسوب"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#14352c] transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setSlotModal(false);
                setEditingSlot(null);
              }}
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
              ) : editingSlot ? (
                <Pencil className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {editingSlot ? "حفظ التعديل" : "تثبيت الفترة"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Slot Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="تأكيد حذف الفترة الدراسية"
        type="danger"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium">
            هل أنت متأكد من رغبتك في حذف موعد هذه المحاضرة؟ سيتم إزالتها فوراً من جداول الطلاب وتحديث القاعات.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteSlot}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              تأكيد الحذف
            </button>
          </div>
        </div>
      </Dialog>

      {/* Status Feedback Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        type={dialog.type}
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-700 font-medium">{dialog.message}</p>
          <button
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
