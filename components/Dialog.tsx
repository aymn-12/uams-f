"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  GraduationCap,
} from "lucide-react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  type?: "default" | "success" | "danger" | "info";
  maxWidth?: string;
}

const appearance = {
  default: {
    icon: GraduationCap,
    iconColor: "text-[#14352c]",
    iconBg: "bg-[#14352c]/10 border-[#14352c]/20",
    accent: "bg-[#14352c]",
    title: "text-slate-900",
  },
  success: {
    icon: CheckCircle2,
    iconColor: "text-emerald-700",
    iconBg: "bg-emerald-50 border-emerald-200",
    accent: "bg-emerald-600",
    title: "text-emerald-950",
  },
  danger: {
    icon: AlertCircle,
    iconColor: "text-rose-700",
    iconBg: "bg-rose-50 border-rose-200",
    accent: "bg-rose-600",
    title: "text-rose-950",
  },
  info: {
    icon: Info,
    iconColor: "text-[#14352c]",
    iconBg: "bg-slate-100 border-slate-200",
    accent: "bg-[#14352c]",
    title: "text-slate-900",
  },
};

export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  type = "default",
  maxWidth = "max-w-lg",
}: DialogProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  const style = appearance[type] || appearance.default;
  const Icon = style.icon;

  useEffect(() => {
    let frame = 0;
    let timeout: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setShouldRender(true);
      frame = requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      timeout = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab" && !dialogRef.current) {
      event.preventDefault();
    }
  };

  return (
    <div
      dir="rtl"
      onMouseDown={handleBackdropClick}
      className={[
        "fixed inset-0 z-[100] flex items-center justify-center",
        "overflow-y-auto p-4 sm:p-6",
        "bg-slate-900/40 backdrop-blur-xs",
        "transition-opacity duration-200 ease-out",
        "motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      aria-hidden={!isOpen}
      style={{
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={isOpen ? "true" : undefined}
        aria-labelledby="dialog-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={[
          "relative my-auto w-full",
          maxWidth,
          "overflow-hidden rounded-2xl sm:rounded-3xl",
          "border border-slate-200",
          "bg-white text-slate-900",
          "shadow-2xl shadow-slate-900/10",
          "outline-none",
          "transition-[opacity,transform] duration-250",
          "ease-[cubic-bezier(0.16,1,0.3,1)]",
          "motion-reduce:transition-none",
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.98] opacity-0",
        ].join(" ")}
      >
        {/* Top Accent Stripe */}
        <div className={`h-1 w-full ${style.accent}`} />

        {/* Header without X button */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex size-10 shrink-0 items-center justify-center",
                "rounded-xl border shadow-xs",
                style.iconBg,
              ].join(" ")}
            >
              <Icon
                size={20}
                strokeWidth={1.8}
                className={style.iconColor}
                aria-hidden="true"
              />
            </div>

            <h2
              id="dialog-title"
              className={`text-sm sm:text-base font-bold leading-snug line-clamp-2 ${style.title}`}
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className={[
            "max-h-[min(75dvh,680px)] overflow-y-auto",
            "overscroll-contain px-6 py-6 text-slate-800",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
