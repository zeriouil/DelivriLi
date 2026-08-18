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

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
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

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    stopMelodyRef.current = startOrderMelody();
    return () => {
      stopMelodyRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!order.delivery_address) {
      setDistanceLoading(false);
      return;
    }

    const calculate = async () => {
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
  const ringColor = progress > 60 ? "#16a34a" : progress > 30 ? "#eab308" : "#dc2626";

  const distanceLabel = distanceLoading
    ? "Calculating..."
    : distanceKm !== null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m away`
      : `${distanceKm.toFixed(1)} km away`
    : "Distance unavailable";

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-red-950/60 backdrop-blur-sm transition-opacity duration-300 flex justify-center ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[100] transition-transform duration-500 ease-out flex justify-center ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white rounded-t-[40px] shadow-[0_-20px_60px_rgba(69,10,10,0.3)] overflow-hidden w-full max-w-lg font-body border-t border-red-100">
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 bg-red-100 rounded-full" />
          </div>

          <div className="px-6 pt-4 pb-6 flex items-center gap-5">
            <div className="relative flex-shrink-0 w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" stroke="#fee2e2" strokeWidth="6" />
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
                <span className="text-red-950 font-black text-3xl font-heading leading-none">{secondsLeft}</span>
                <span className="text-red-900/40 text-[10px] font-black uppercase tracking-widest mt-0.5">secs</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 bg-yellow-400 text-red-950 rounded-full px-3 py-1.5 text-xs font-black mb-2 shadow-sm">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                New Delivery Job
              </div>
              <h2 className="text-red-950 text-2xl font-black font-heading leading-tight mb-1">
                Order #{order.order_number}
              </h2>
              <p className="text-red-600 text-lg font-black font-heading">
                {order.total_amount.toFixed(2)} DH
              </p>
            </div>
          </div>

          <div className="mx-6 mb-5">
            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-inner">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-red-900/60 text-[10px] font-black uppercase tracking-widest mb-0.5">
                  Distance to customer
                </p>
                <p className={`text-red-950 font-black text-xl font-heading leading-tight ${distanceLoading ? "animate-pulse" : ""}`}>
                  {distanceLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-6 h-px bg-red-100 mb-5" />

          <div className="px-6 space-y-3 mb-8">
            <div className="flex items-start gap-4 bg-white border border-red-50 rounded-2xl p-4 shadow-sm">
              <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900/40 text-[10px] font-black uppercase tracking-widest mb-1">Deliver to</p>
                <p className="text-red-950 font-bold leading-snug">
                  {order.delivery_address || "No address provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white border border-red-50 rounded-2xl p-4 shadow-sm">
              <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-red-900/40 text-[10px] font-black uppercase tracking-widest mb-1">Customer</p>
                <p className="text-red-950 font-bold">
                  {order.customer_name} • {order.customer_phone}
                </p>
              </div>
            </div>

            {order.notes && (
              <div className="flex items-start gap-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow-sm">
                <Package className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-600 text-[10px] font-black uppercase tracking-widest mb-1">Instructions</p>
                  <p className="text-yellow-900 font-bold">{order.notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-8 flex gap-4">
            <button
              onClick={() => onDecline(order.id)}
              className="flex-none w-16 h-16 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 transition-colors active:scale-95 border border-red-100"
            >
              <X className="w-7 h-7 text-red-900/40" />
            </button>
            <button
              onClick={() => onAccept(order)}
              className="flex-1 h-16 flex items-center justify-center gap-3 rounded-2xl bg-green-600 hover:bg-green-700 transition-colors active:scale-[0.98] shadow-lg shadow-green-600/30"
            >
              <Check className="w-7 h-7 text-white" />
              <span className="text-white font-black text-xl font-heading">Accept Delivery</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
