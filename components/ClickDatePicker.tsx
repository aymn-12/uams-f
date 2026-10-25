"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Calendar, ChevronRight, ChevronLeft, X, Clock } from "lucide-react";

interface ClickDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const WEEKDAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const formatDate = (y: number, m: number, d: number): string => {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

export default function ClickDatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  className = "",
  id,
}: ClickDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view year & month from value if available, else today
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(
    () => formatDate(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const parsedValueDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m, day: d };
      }
    }
    return null;
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(
    parsedValueDate ? parsedValueDate.year : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    parsedValueDate ? parsedValueDate.month : today.getMonth()
  );

  // Sync view when opened with a value
  useEffect(() => {
    if (isOpen) {
      if (parsedValueDate) {
        setViewYear(parsedValueDate.year);
        setViewMonth(parsedValueDate.month);
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
    }
  }, [isOpen, parsedValueDate, today]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Quick preset selection (1 click)
  const handleSelectPreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const dateStr = formatDate(
      target.getFullYear(),
      target.getMonth(),
      target.getDate()
    );
    onChange(dateStr);
    setIsOpen(false);
  };

  // Day selection from grid (1 click)
  const handleSelectDay = (day: number) => {
    const dateStr = formatDate(viewYear, viewMonth, day);
    onChange(dateStr);
    setIsOpen(false);
  };

  // Clear date
  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Days in current view month
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-right ${className}`}
      dir="rtl"
    >
      {/* Trigger Button: Clicking opens the calendar without any keyboard focus */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-10 bg-white border ${
          isOpen
            ? "border-[#0284c7] ring-2 ring-[#0284c7]/15"
            : "border-slate-200 hover:border-slate-300"
        } rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 outline-none shadow-2xs transition-all flex items-center justify-between gap-1.5 cursor-pointer select-none`}
        title="انقر لاختيار التاريخ بنقرة واحدة"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
          <span
            className={`truncate ${
              value ? "font-bold text-slate-800" : "font-normal text-slate-400"
            }`}
          >
            {value || placeholder}
          </span>
        </div>

        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
            title="مسح التاريخ"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-sans shrink-0">📅</span>
        )}
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 w-72 text-right select-none animate-in fade-in zoom-in-95 duration-100 space-y-3">
          {/* Quick Presets Header: 1-Click shortcuts */}
          <div className="space-y-1.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
              <Clock className="w-3 h-3 text-[#0284c7]" />
              <span>اختيار سريع بنقرة واحدة:</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => handleSelectPreset(0)}
                className="py-1 px-1.5 text-center text-[10px] font-bold rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0284c7] border border-sky-100 transition cursor-pointer"
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(1)}
                className="py-1 px-1.5 text-center text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 transition cursor-pointer"
              >
                غداً
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(3)}
                className="py-1 px-1.5 text-center text-[10px] font-bold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 transition cursor-pointer"
              >
                +3 أيام
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(7)}
                className="py-1 px-1.5 text-center text-[10px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 transition cursor-pointer"
              >
                أسبوع
              </button>
            </div>
          </div>

          {/* Month & Year Navigator */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-800">
              {ARABIC_MONTHS[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {WEEKDAY_NAMES.map((w, idx) => (
              <span key={idx} className="py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <span key={`empty-${idx}`} />
            ))}

            {/* Days of the month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = formatDate(viewYear, viewMonth, day);
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                    isSelected
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : isToday
                      ? "bg-sky-50 text-[#0284c7] border border-sky-300 font-black hover:bg-sky-100"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => handleSelectPreset(0)}
              className="text-[#0284c7] hover:underline font-bold transition cursor-pointer"
            >
              اليوم ({todayStr})
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-600 hover:underline font-medium transition cursor-pointer"
              >
                مسح التاريخ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
