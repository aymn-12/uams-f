"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  theme?: "light" | "dark";
  align?: "right" | "left";
  name?: string;
  id?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "اختر...",
  disabled = false,
  className = "",
  theme = "light",
  align = "right",
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
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

  // Handle escape key
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

  const isDark = theme === "dark";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-right ${className}`}
      dir="rtl"
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold",
          "border transition-all duration-200 outline-none select-none cursor-pointer",
          disabled ? "opacity-50 cursor-not-allowed" : "",
          isDark
            ? "bg-[#0c1322] border-slate-700 text-slate-100 hover:border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            : "bg-white border-slate-300 text-slate-900 hover:border-slate-400 focus:border-[#14352c] focus:ring-2 focus:ring-[#14352c]/15 shadow-sm",
          isOpen
            ? isDark
              ? "border-emerald-400 ring-2 ring-emerald-400/20"
              : "border-[#14352c] ring-2 ring-[#14352c]/15"
            : "",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.subLabel && (
            <span
              className={`text-[10px] font-normal ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              ({selectedOption.subLabel})
            </span>
          )}
        </div>

        <ChevronDown
          className={[
            "w-4 h-4 shrink-0 transition-transform duration-200",
            isDark ? "text-slate-400" : "text-slate-500",
            isOpen ? "rotate-180 text-emerald-600" : "",
          ].join(" ")}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={[
            "absolute z-50 mt-1.5 w-full min-w-[220px] max-h-64 overflow-y-auto p-1.5",
            "rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-150 animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0",
            isDark
              ? "bg-[#0c1322]/95 border-slate-700 text-slate-100 shadow-slate-950/80"
              : "bg-white/98 border-slate-200 text-slate-900 shadow-slate-900/10",
          ].join(" ")}
        >
          {options.length === 0 ? (
            <div
              className={`py-3 px-4 text-center text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              لا توجد خيارات متاحة
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={[
                    "flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 select-none my-0.5",
                    isSelected
                      ? isDark
                        ? "bg-emerald-500/15 text-emerald-400 font-bold"
                        : "bg-emerald-50 text-[#14352c] font-bold"
                      : isDark
                      ? "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon && (
                      <span className="shrink-0">{option.icon}</span>
                    )}
                    <span className="truncate">{option.label}</span>
                    {option.subLabel && (
                      <span
                        className={`text-[10px] font-normal ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        ({option.subLabel})
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDark ? "text-emerald-400" : "text-[#14352c]"
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
