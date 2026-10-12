"use client";

export default function AcademicGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Architectural Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Subtle University Institutional Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090f1d]/40 via-transparent to-[#090f1d] pointer-events-none" />

      {/* Soft Top Glow Accent (Institutional Emerald) */}
      <div className="absolute top-[-100px] right-1/3 w-[600px] h-[300px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
