"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Zap, Crown } from "lucide-react";

interface UsageIndicatorProps {
  used: number;
  total: number;
  plan: string;
  className?: string;
}

export function UsageIndicator({
  used,
  total,
  plan,
  className,
}: UsageIndicatorProps) {
  const percentage = Math.min((used / total) * 100, 100);
  const remaining = Math.max(total - used, 0);

  // Determine color scheme based on usage
  const getUsageColor = () => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    return "bg-green-500";
  };

  const isPro = plan === "pro";

  return (
    <div
      className={cn(
        "bg-white/95 backdrop-blur border border-gray-200 rounded-lg p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isPro ? (
            <Crown className="w-4 h-4 text-yellow-600" />
          ) : (
            <Zap className="w-4 h-4 text-blue-600" />
          )}
          <span className="text-xs font-medium text-gray-700">
            Weekly Usage
          </span>
        </div>
        <Badge
          variant={isPro ? "default" : "secondary"}
          className={cn(
            "text-xs font-bold px-2 py-0.5",
            isPro
              ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
              : "",
          )}
        >
          {isPro ? "Pro" : "Free"}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={cn("font-semibold", getUsageColor())}>
            {used} / {total}
          </span>
          <span className="text-gray-500 text-xs">{remaining} left</span>
        </div>

        <div className="relative">
          <Progress value={percentage} className="h-2 bg-gray-200" />
          <div
            className={cn(
              "absolute top-0 left-0 h-2 rounded-full transition-all duration-300",
              getProgressColor(),
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {percentage >= 90 && (
          <div className="text-xs text-red-600 font-medium">
            {remaining === 0 ? "Limit reached!" : "Almost out!"}
          </div>
        )}
      </div>
    </div>
  );
}
