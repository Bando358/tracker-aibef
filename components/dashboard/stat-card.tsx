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
    card: "bg-card border",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueBg: "",
  },
  primary: {
    card: "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground border-0 shadow-lg shadow-primary/20",
    iconBg: "bg-white/20",
    iconColor: "text-primary-foreground",
    valueBg: "",
  },
  success: {
    card: "bg-card border border-emerald-200 dark:border-emerald-800",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueBg: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    card: "bg-card border border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueBg: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    card: "bg-card border border-red-200 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
    valueBg: "text-red-700 dark:text-red-300",
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
        "relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:shadow-md",
        styles.card,
        className
      )}
    >
      {/* Decorative circle */}
      {variant === "primary" && (
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      )}

      <div className="flex items-start justify-between">
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
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
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
        <div className={cn("rounded-xl p-2.5", styles.iconBg)}>
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
