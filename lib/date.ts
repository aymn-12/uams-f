/**
 * University Academic Management System (UAMS)
 * Safe Date & Time Formatting Utilities
 */

export function formatAcademicDate(val: any, fallback = "غير محدد"): string {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function formatAcademicTime(val: any, fallback = "غير محدد"): string {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
