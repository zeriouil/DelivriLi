"use client";

import { OrderStatus } from "@/types";
import { Check, ChefHat, Bike, PackageCheck, Clock } from "lucide-react";

const STEPS: { status: OrderStatus; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { status: "confirmed",  label: "Order Confirmed",   sublabel: "Restaurant received your order", icon: <Check className="w-4 h-4" /> },
  { status: "preparing",  label: "Preparing",         sublabel: "Your food is being prepared",    icon: <ChefHat className="w-4 h-4" /> },
  { status: "ready",      label: "On the Way",        sublabel: "Courier picked up your order",   icon: <Bike className="w-4 h-4" /> },
  { status: "completed",  label: "Delivered",         sublabel: "Enjoy your meal!",              icon: <PackageCheck className="w-4 h-4" /> },
];

const STATUS_INDEX: Record<string, number> = {
  pending: -1, confirmed: 0, preparing: 1, ready: 2, completed: 3,
};

interface OrderStatusTimelineProps {
  status: OrderStatus;
  createdAt: string;
}

export function OrderStatusTimeline({ status, createdAt }: OrderStatusTimelineProps) {
  const currentIndex = STATUS_INDEX[status] ?? -1;

  // Estimate ETA: 5 min confirm + 20 min prep + 20 min delivery
  const etaMinutes = [35, 25, 20, 0][Math.max(0, currentIndex + 1)] ?? 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Order Status</p>
            <h2 className="text-xl font-black capitalize">
              {status === "pending" ? "Waiting for confirmation…" :
               status === "confirmed" ? "Order Confirmed!" :
               status === "preparing" ? "Preparing your food" :
               status === "ready" ? "On the way!" :
               status === "completed" ? "Delivered! 🎉" :
               status === "cancelled" ? "Order Cancelled" : status}
            </h2>
          </div>
          {etaMinutes > 0 && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
              <div className="flex items-center gap-1 text-emerald-100 text-xs mb-0.5">
                <Clock className="w-3 h-3" /> ETA
              </div>
              <p className="text-white font-black text-lg leading-none">~{etaMinutes}<span className="text-sm font-semibold">m</span></p>
            </div>
          )}
        </div>
        <p className="text-emerald-200 text-xs mt-2">
          Placed at {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Timeline Steps */}
      <div className="px-6 py-6">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.status} className="flex gap-4">
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  done
                    ? active && status !== "completed"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-110"
                      : "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-300"
                }`}>
                  {active && status !== "completed" ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  ) : done ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-8 mt-1 rounded-full transition-all duration-700 ${done && i < currentIndex ? "bg-emerald-400" : "bg-slate-100"}`} />
                )}
              </div>

              {/* Label */}
              <div className="pb-8 last:pb-0">
                <p className={`font-bold text-sm leading-tight ${done ? "text-slate-900" : "text-slate-300"}`}>
                  {step.label}
                  {active && status !== "completed" && (
                    <span className="ml-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Now
                    </span>
                  )}
                </p>
                <p className={`text-xs mt-0.5 ${done ? "text-slate-400" : "text-slate-200"}`}>{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
