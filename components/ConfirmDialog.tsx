"use client";

import { useState, type ReactNode } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import Dialog from "@/components/Dialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Reusable destructive-action confirmation dialog.
 * Used before deleting any item system-wide (questions, announcements,
 * schedule periods, ...) to prevent accidental data loss.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء بعد التنفيذ.",
  confirmLabel = "تأكيد الحذف",
  cancelLabel = "إلغاء",
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      type="danger"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-center">
        <p className="text-xs text-slate-700 leading-relaxed">{message}</p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
