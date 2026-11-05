import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14352c]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "rounded-xl bg-[#14352c] text-white shadow-md shadow-[#14352c]/25 hover:bg-[#1b4a3d] hover:shadow-lg hover:shadow-[#14352c]/35 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]",
        "dark-soft-pill":
          "rounded-full bg-gradient-to-b from-[#1b493d] via-[#14352c] to-[#0e251f] text-white border border-[#286050]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(0,0,0,0.35),0_10px_22px_-5px_rgba(20,53,44,0.42),0_4px_8px_-2px_rgba(20,53,44,0.28)] active:scale-[0.985] active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.55),0_2px_4px_rgba(0,0,0,0.1)]",
        neumorphic:
          "rounded-2xl bg-[#f0f4f8] text-slate-800 border border-white/70 shadow-[5px_5px_12px_#cbd5e1,-5px_-5px_12px_#ffffff] hover:shadow-[7px_7px_16px_#cbd5e1,-7px_-7px_16px_#ffffff] active:scale-[0.99] active:shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff]",
        "neumorphic-dark":
          "rounded-full bg-[#14352c] text-white border border-[#1b4a3d] shadow-[5px_5px_14px_rgba(10,26,22,0.7),-4px_-4px_10px_rgba(28,74,62,0.5)] hover:shadow-[7px_7px_18px_rgba(10,26,22,0.8),-5px_-5px_12px_rgba(28,74,62,0.6)] active:shadow-[inset_3px_3px_6px_rgba(10,26,22,0.8),inset_-2px_-2px_5px_rgba(28,74,62,0.4)]",
        destructive:
          "rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/20 hover:shadow-red-500/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]",
        outline:
          "rounded-xl border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 hover:border-[#14352c]/40 hover:scale-[1.01] active:scale-[0.98]",
        secondary:
          "rounded-xl bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 hover:border-slate-300 hover:scale-[1.01] active:scale-[0.98]",
        ghost:
          "rounded-xl text-slate-700 hover:bg-slate-100",
        link: "text-[#14352c] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 rounded-xl px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        pill: "h-11 rounded-full px-6 text-sm",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
