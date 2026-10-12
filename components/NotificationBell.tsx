"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  FileText,
  Award,
  Calendar,
  BookOpen,
  MessageSquare,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatAcademicDate, formatAcademicTime } from "@/lib/date";

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  theme?: "light" | "dark";
}

export default function NotificationBell({ theme = "light" }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLight = theme === "light";

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/notifications/my-notifications?limit=15", {
        skipCache: true,
      });
      if (res && res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Quiet fail - no intrusive alerts
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Silent polling every 45 seconds
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  // Mark single as read
  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    } catch {
      // Quiet fail
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await apiFetch("/notifications/mark-all-read", { method: "PUT" });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Quiet fail
    }
  };

  // Delete notification
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      const deleted = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Quiet fail
    }
  };

  const getIcon = (type: string) => {
    const upper = (type || "").toUpperCase();
    if (upper === "ANNOUNCEMENT") return <Megaphone className="w-4 h-4 text-emerald-600" />;
    if (upper === "ASSIGNMENT") return <FileText className="w-4 h-4 text-amber-600" />;
    if (upper === "GRADE") return <Award className="w-4 h-4 text-emerald-600" />;
    if (upper === "EXAM") return <Calendar className="w-4 h-4 text-purple-600" />;
    if (upper === "MATERIAL") return <BookOpen className="w-4 h-4 text-sky-600" />;
    if (upper === "QUESTION") return <MessageSquare className="w-4 h-4 text-indigo-600" />;
    return <Bell className="w-4 h-4 text-[#14352c]" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) loadNotifications();
        }}
        aria-label="الإشعارات"
        className={`relative size-10 rounded-xl flex items-center justify-center transition-all ${
          isLight
            ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            : "border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-emerald-400/10 hover:text-emerald-300 hover:border-emerald-400/30"
        } ${isOpen ? (isLight ? "ring-2 ring-[#14352c]/20 border-[#14352c]" : "ring-2 ring-emerald-400/20") : ""}`}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-[#14352c] text-white flex items-center justify-center">
                <Bell className="size-3.5 text-emerald-300" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                الإشعارات الأكاديمية
              </h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-[#14352c] hover:underline flex items-center gap-1 transition"
              >
                <CheckCheck className="size-3.5" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="size-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  لا توجد إشعارات جديدة حالياً.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleMarkAsRead(item._id, item.link)}
                  className={`p-3 text-right cursor-pointer transition flex items-start gap-3 ${
                    item.isRead
                      ? "bg-white hover:bg-slate-50 text-slate-700"
                      : "bg-emerald-50/40 hover:bg-emerald-50/70 text-slate-900"
                  }`}
                >
                  {/* Type Icon Badge */}
                  <div
                    className={`size-8 rounded-xl shrink-0 flex items-center justify-center border ${
                      item.isRead
                        ? "bg-slate-100 border-slate-200"
                        : "bg-white border-emerald-200 shadow-xs"
                    }`}
                  >
                    {getIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold truncate text-slate-900">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono" dir="ltr">
                        {formatAcademicTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Delete or Unread Indicator */}
                  <div className="shrink-0 flex items-center gap-1 self-center">
                    {!item.isRead && (
                      <span className="size-2 rounded-full bg-emerald-600" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item._id)}
                      title="حذف الإشعار"
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
