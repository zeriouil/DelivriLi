"use client";

import { useEffect, useRef, useState } from "react";
import { Order } from "@/types";
import { MapPin, Phone, Package, X, Check, Navigation } from "lucide-react";
import { startOrderMelody } from "@/lib/orderMelody";

interface NewJobAlertProps {
  order: Order;
  onAccept: (order: Order) => void;
  onDecline: (orderId: string) => void;
  timeoutSeconds?: number;
  courierPosition?: [number, number] | null;
}

// Haversine formula — returns distance in km between two lat/lng points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode an address string → lat/lng via free Nominatim API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // silently fail
  }
  return null;
}

export function NewJobAlert({
  order,
  onAccept,
  onDecline,
  timeoutSeconds = 30,
  courierPosition,
}: NewJobAlertProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);
  const [visible, setVisible] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopMelodyRef = useRef<(() => void) | null>(null);

  // Slide-in animation + start continuous melody on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Start looping melody; store stop fn for cleanup
    stopMelodyRef.current = startOrderMelody();
    return () => {
      stopMelodyRef.current?.();
    };
  }, []);

  // Calculate distance using the already-known courier position prop
  useEffect(() => {
    if (!order.delivery_address) {
      setDistanceLoading(false);
      return;
    }

    const calculate = async () => {
      // Geocode the delivery address
      const destCoords = await geocodeAddress(order.delivery_address!);

      if (courierPosition && destCoords) {
        const km = haversineKm(
          courierPosition[0],
          courierPosition[1],
          destCoords.lat,
          destCoords.lng
        );
        setDistanceKm(km);
      }
      setDistanceLoading(false);
    };

    calculate();
  }, [order.delivery_address, courierPosition]);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          onDecline(order.id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [order.id, onDecline]);

  const progress = (secondsLeft / timeoutSeconds) * 100;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference * (1 - progress / 100);
  const ringColor = progress > 60 ? "#22c55e" : progress > 30 ? "#f59e0b" : "#ef4444";

  // Format distance label
  const distanceLabel = distanceLoading
    ? "Calculating..."
    : distanceKm !== null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m away`
      : `${distanceKm.toFixed(1)} km away`
    : "Distance unavailable";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Alert Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Pill handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header row: countdown ring + order info */}
          <div className="px-6 pt-4 pb-6 flex items-center gap-4">
            {/* SVG countdown ring */}
            <div className="relative flex-shrink-0 w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-black text-2xl leading-none">{secondsLeft}</span>
                <span className="text-white/50 text-[10px] font-medium uppercase tracking-wider">secs</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 rounded-full px-3 py-1 text-xs font-bold mb-2">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                New Delivery Job
              </div>
              <h2 className="text-white text-xl font-black leading-tight">
                Order #{order.order_number}
              </h2>
              <p className="text-slate-400 text-sm font-semibold mt-0.5">
                {order.total_amount.toFixed(2)} DH
              </p>
            </div>
          </div>

          {/* Distance pill — prominent highlight below header */}
          <div className="mx-6 mb-5">
            <div className="bg-indigo-600/30 border border-indigo-500/40 rounded-2xl px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  Distance to customer
                </p>
                <p className={`text-white font-black text-lg leading-tight ${distanceLoading ? "animate-pulse" : ""}`}>
                  {distanceLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 h-px bg-white/10 mb-5" />

          {/* Order Details */}
          <div className="px-6 space-y-3 mb-6">
            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
              <MapPin className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Deliver to</p>
                <p className="text-white font-semibold leading-snug">
                  {order.delivery_address || "No address provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4">
              <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Customer</p>
                <p className="text-white font-semibold">
                  {order.customer_name} • {order.customer_phone}
                </p>
              </div>
            </div>

            {order.notes && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                <Package className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Instructions</p>
                  <p className="text-white/80 font-medium">{order.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-10 flex gap-4">
            <button
              onClick={() => onDecline(order.id)}
              className="flex-none w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
            >
              <X className="w-7 h-7 text-white/70" />
            </button>
            <button
              onClick={() => onAccept(order)}
              className="flex-1 h-16 flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 transition-colors active:scale-[0.98] shadow-lg shadow-emerald-500/30"
            >
              <Check className="w-6 h-6 text-white" />
              <span className="text-white font-black text-lg">Accept Delivery</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
