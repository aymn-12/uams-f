import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "نظام إدارة التعليم الأكاديمي | الجامعة المستنصرية",
    template: "%s | الجامعة المستنصرية",
  },
  description:
    "نظام إدارة التعليم الأكاديمي (UAMS) في الجامعة المستنصرية: الدرجات والجداول والإعلانات.",
  applicationName: "UAMS",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14352c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex flex-col bg-white text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}