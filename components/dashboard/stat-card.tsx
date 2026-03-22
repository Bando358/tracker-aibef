"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const VARIANT_STYLES = {
  default: {
    card: "bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/60 hover:border-slate-300 dark:from-slate-900/60 dark:to-slate-800/40 dark:border-slate-700/50 dark:hover:border-slate-600",
    iconBg: "bg-white dark:bg-slate-800 shadow-sm",
    iconColor: "text-primary",
    valueBg: "",
    glow: "",
  },
  primary: {
    card: "bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white border-0",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueBg: "",
    glow: "shadow-lg shadow-blue-600/25",
  },
  success: {
    card: "bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200/60 hover:border-emerald-300 dark:from-emerald-950/50 dark:to-teal-950/30 dark:border-emerald-800/50 dark:hover:border-emerald-700",
    iconBg: "bg-white dark:bg-emerald-900/60 shadow-sm",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueBg: "text-emerald-700 dark:text-emerald-300",
    glow: "",
  },
  warning: {
    card: "bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200/60 hover:border-amber-300 dark:from-amber-950/50 dark:to-orange-950/30 dark:border-amber-800/50 dark:hover:border-amber-700",
    iconBg: "bg-white dark:bg-amber-900/60 shadow-sm",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueBg: "text-amber-700 dark:text-amber-300",
    glow: "",
  },
  danger: {
    card: "bg-gradient-to-br from-red-50 to-rose-50/80 border border-red-200/60 hover:border-red-300 dark:from-red-950/50 dark:to-rose-950/30 dark:border-red-800/50 dark:hover:border-red-700",
    iconBg: "bg-white dark:bg-red-900/60 shadow-sm",
    iconColor: "text-red-600 dark:text-red-400",
    valueBg: "text-red-700 dark:text-red-300",
    glow: "",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        styles.card,
        styles.glow,
        className
      )}
    >
      {variant === "primary" && (
        <>
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
          <div className="absolute right-8 top-2 h-2 w-2 rounded-full bg-white/20" />
        </>
      )}
      {variant === "success" && (
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-200/30 dark:bg-emerald-500/10 transition-transform duration-500 group-hover:scale-110" />
      )}
      {variant === "warning" && (
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-200/30 dark:bg-amber-500/10 transition-transform duration-500 group-hover:scale-110" />
      )}
      {variant === "danger" && (
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-200/30 dark:bg-red-500/10 transition-transform duration-500 group-hover:scale-110" />
      )}
      {variant === "default" && (
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-200/40 dark:bg-slate-500/10 transition-transform duration-500 group-hover:scale-110" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm font-medium",
              variant === "primary"
                ? "text-primary-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-3xl font-bold tracking-tight",
                styles.valueBg
              )}
            >
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                  variant === "primary"
                    ? trend.isPositive
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-red-500/30 text-primary-foreground"
                    : trend.isPositive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p
              className={cn(
                "text-xs",
                variant === "primary"
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {description}
            </p>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
