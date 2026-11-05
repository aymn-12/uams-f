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
import FuseButton from "@/components/ui/fuse-button";
import BellToggle from "@/components/ui/bell-toggle";

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
      {/* Animated BellToggle Trigger */}
      <BellToggle
        pressed={isOpen}
        count={unreadCount}
        badge={true}
        badgeColor="#ef4444"
        badgeTextColor="#ffffff"
        waves={true}
        clapper={false}
        size="sm"
        radius={9999}
        offLabel=""
        onLabel=""
        label="الإشعارات الأكاديمية"
        color={isLight ? "#334155" : "#e2e8f0"}
        background={
          isLight
            ? "#ffffff"
            : "rgba(255, 255, 255, 0.08)"
        }
        onColor="#0f172a"
        onBackground="#ffffff"
        onChange={(pressed) => {
          setIsOpen(pressed);
          if (pressed) loadNotifications();
        }}
      />

      {/* Popover Dropdown (Neumorphic Soft UI) */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/80 shadow-[0_22px_50px_-10px_rgba(0,0,0,0.18),0_4px_14px_rgba(0,0,0,0.05),inset_0_1px_1.5px_rgba(255,255,255,0.95)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-b from-slate-50/95 to-slate-100/70 border-b border-slate-200/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-gradient-to-b from-[#1b463a] to-[#102d25] text-white flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_2px_5px_rgba(20,53,44,0.25)]">
                <Bell className="size-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  الإشعارات الأكاديمية
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  تحديثات المقررات والامتحانات
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.04)]">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <FuseButton
                label="تحديد كمقروء"
                undoLabel="تراجع"
                doneLabel="تم"
                icon={<CheckCheck className="size-3.5" />}
                color="#14352c"
                background="#ffffff"
                fuseColor="#10b981"
                size="sm"
                radius={12}
                undoWindow={3000}
                fuse="bottom"
                fuseThickness={2}
                commitOn="fuseEnd"
                onCommit={handleMarkAllAsRead}
                style={{ height: '28px', fontSize: '11px', padding: '0 10px', fontWeight: 600, border: '1px solid rgba(203, 213, 225, 0.8)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.04)' }}
              />
            )}
          </div>

          {/* List */}
          <div className="max-h-84 overflow-y-auto p-2 sm:p-2.5 space-y-1.5 divide-y-0">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="size-12 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(255,255,255,0.8)] mx-auto flex items-center justify-center text-slate-400 mb-2.5">
                  <Bell className="size-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">لا توجد إشعارات جديدة</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ستظهر التنبيهات فور اعتمادها من الكلية</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleMarkAsRead(item._id, item.link)}
                  className={`p-3 rounded-2xl text-right cursor-pointer transition-all duration-200 flex items-start gap-3 border ${
                    item.isRead
                      ? "bg-white/80 hover:bg-slate-50/90 text-slate-700 border-transparent hover:border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                      : "bg-gradient-to-l from-emerald-50/70 via-white to-white text-slate-950 font-medium border-emerald-200/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(16,185,129,0.06)]"
                  }`}
                >
                  {/* Type Icon Badge */}
                  <div
                    className={`size-9 rounded-2xl shrink-0 flex items-center justify-center border transition-all ${
                      item.isRead
                        ? "bg-slate-50 border-slate-200/80 text-slate-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.03)]"
                        : "bg-white border-emerald-200/90 text-emerald-800 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_2px_5px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    {getIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className={`text-xs truncate ${item.isRead ? "font-semibold text-slate-800" : "font-bold text-slate-950"}`}>
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
                  <div className="shrink-0 flex items-center gap-1.5 self-center">
                    {!item.isRead && (
                      <span className="size-2 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.5)]" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item._id)}
                      title="حذف الإشعار"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
