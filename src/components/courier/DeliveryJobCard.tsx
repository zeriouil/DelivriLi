'use client';

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Order, OrderStatus } from "@/types";
import { Phone, MapPin, Navigation, CheckCircle2, PackageCheck, MapPinCheck, Store, Lock } from "lucide-react";

const AnimatedMap = dynamic(
  () => import("./AnimatedMap").then((mod) => mod.AnimatedMap),
  { ssr: false, loading: () => <div className="w-full h-48 bg-slate-800 rounded-2xl animate-pulse" /> }
);

const DELIVERY_GEOFENCE_METRES = 250;

interface DeliveryJobCardProps {
  order: Order;
  courierPosition?: [number, number] | null;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

// Haversine formula — returns distance in metres
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode address string → lat/lng via Nominatim
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function DeliveryJobCard({ order, courierPosition, onUpdateStatus }: DeliveryJobCardProps) {
  const currentStatus = order.status;

  // ── Geofence state ────────────────────────────────────
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Geocode delivery address once
  useEffect(() => {
    if (!order.delivery_address) return;
    setDistanceLoading(true);
    geocodeAddress(order.delivery_address).then((coords) => {
      setDestCoords(coords);
      setDistanceLoading(false);
    });
  }, [order.delivery_address]);

  // Recalculate distance whenever courier moves or address geocodes
  useEffect(() => {
    if (!courierPosition || !destCoords) {
      setDistanceM(null);
      return;
    }
    const m = haversineMetres(
      courierPosition[0], courierPosition[1],
      destCoords.lat, destCoords.lng
    );
    setDistanceM(m);
  }, [courierPosition, destCoords]);

  const isNearCustomer = distanceM !== null && distanceM <= DELIVERY_GEOFENCE_METRES;
  const canDeliver = isNearCustomer || distanceM === null; // allow if we can't calculate (graceful fallback)

  // ── Status badge ──────────────────────────────────────
  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'ready':           return { label: 'Ready for Pickup',    color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'picked_up':
      case 'out_for_delivery': return { label: 'On the Way 🛵',      color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'arrived':         return { label: 'Arrived 📍',           color: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:                return { label: 'Active',               color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-4">
      {/* Map */}
      <div className="p-3 pb-0">
        <AnimatedMap address={order.delivery_address || ''} />
      </div>

      {/* Order Info Bar */}
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-black text-lg text-slate-900">#{order.order_number}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Customer: {order.customer_name}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <p className="font-black text-lg text-emerald-600">{Number(order.total_amount).toFixed(2)} DH</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Contact */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Contact Customer</h3>
            <p className="text-slate-800 font-semibold text-sm mt-0.5">{order.customer_name}</p>
          </div>
          <a
            href={`tel:${order.customer_phone}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            {order.customer_phone}
          </a>
        </div>

        {/* Address */}
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1.5">Delivery Address</h3>
          <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold leading-relaxed">{order.delivery_address || 'No address provided'}</span>
          </div>
          {order.notes && (
            <div className="mt-2 bg-amber-50 text-amber-800 p-2.5 rounded-xl text-xs border border-amber-100 leading-relaxed">
              <span className="font-bold">Instructions:</span> {order.notes}
            </div>
          )}
        </div>

        {/* Distance indicator (shown once arrived) */}
        {currentStatus === 'arrived' && (
          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${
            distanceLoading
              ? 'bg-slate-50 border-slate-200'
              : isNearCustomer
              ? 'bg-emerald-50 border-emerald-200'
              : distanceM === null
              ? 'bg-slate-50 border-slate-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Distance to customer</p>
              <p className={`font-black text-base leading-tight ${
                distanceLoading ? 'text-slate-400 animate-pulse' :
                isNearCustomer ? 'text-emerald-700' :
                distanceM === null ? 'text-slate-400' : 'text-red-600'
              }`}>
                {distanceLoading
                  ? 'Calculating…'
                  : distanceM === null
                  ? 'Location unavailable'
                  : formatDistance(distanceM)}
              </p>
              {distanceM !== null && !distanceLoading && (
                <p className="text-[10px] font-semibold mt-0.5 text-slate-400">
                  {isNearCustomer ? '✓ Within 250m — you can deliver!' : `Must be within 250m to deliver`}
                </p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isNearCustomer ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {isNearCustomer
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <Lock className="w-5 h-5 text-red-500" />
              }
            </div>
          </div>
        )}

        {/* Navigation */}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs transition-colors shadow"
        >
          <Navigation className="w-4 h-4" />
          Open Google Maps Navigation
        </a>

        {/* ── Step-by-Step Actions ─────────────────────────── */}
        <div className="pt-2 border-t border-slate-100 space-y-2">

          {/* STEP 1: Pick Up */}
          {currentStatus === 'ready' && (
            <button
              id={`pickup-${order.id}`}
              onClick={() => onUpdateStatus(order.id, 'picked_up')}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white py-4 rounded-xl font-black text-sm shadow-md shadow-amber-500/30 transition-all"
            >
              <Store className="w-5 h-5" />
              📦 Step 1 — Pick Up from Restaurant
            </button>
          )}

          {/* STEP 2: Arrive */}
          {(currentStatus === 'picked_up' || currentStatus === 'out_for_delivery') && (
            <button
              id={`arrive-${order.id}`}
              onClick={() => onUpdateStatus(order.id, 'arrived')}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white py-4 rounded-xl font-black text-sm shadow-md shadow-indigo-600/30 transition-all"
            >
              <MapPinCheck className="w-5 h-5" />
              📍 Step 2 — Arrived at Customer
            </button>
          )}

          {/* STEP 3: Deliver — locked unless within 250m */}
          {currentStatus === 'arrived' && (
            <>
              <button
                id={`deliver-${order.id}`}
                disabled={!canDeliver || distanceLoading}
                onClick={() => onUpdateStatus(order.id, 'completed')}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm transition-all ${
                  canDeliver && !distanceLoading
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-dashed border-slate-300'
                }`}
              >
                {canDeliver && !distanceLoading
                  ? <PackageCheck className="w-5 h-5" />
                  : <Lock className="w-5 h-5" />
                }
                {distanceLoading
                  ? 'Checking your location…'
                  : canDeliver
                  ? '✅ Step 3 — Hand Over & Mark Delivered'
                  : `🔒 Too Far Away (${distanceM !== null ? formatDistance(distanceM) : '?'})`
                }
              </button>

              {/* Help text when locked */}
              {!canDeliver && !distanceLoading && distanceM !== null && (
                <p className="text-xs text-center text-red-500 font-semibold pt-1">
                  You are {formatDistance(distanceM)} away. Move within 250m of the customer to unlock delivery.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
