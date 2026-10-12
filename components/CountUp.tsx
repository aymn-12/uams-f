"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export default function CountUp({
  to,
  from = 0,
  duration = 1.0,
  decimals = 0,
  suffix = "",
  className = "",
}: CountUpProps) {
  const [val, setVal] = useState(from);

  useEffect(() => {
    // Respect user's reduced motion preference
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(to);
      return;
    }

    let start: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / (duration * 1000), 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * ease;
      setVal(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [to, from, duration]);

  const output = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();

  return (
    <span className={className}>
      {output}
      {suffix}
    </span>
  );
}
