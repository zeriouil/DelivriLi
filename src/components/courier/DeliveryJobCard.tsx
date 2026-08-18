'use client';

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Order, OrderStatus } from "@/types";
import { Phone, MapPin, Navigation, CheckCircle2, PackageCheck, MapPinCheck, Store, Lock } from "lucide-react";

const AnimatedMap = dynamic(
  () => import("./AnimatedMap").then((mod) => mod.AnimatedMap),
  { ssr: false, loading: () => <div className="w-full h-48 bg-red-100 rounded-2xl animate-pulse" /> }
);

const DELIVERY_GEOFENCE_METRES = 250;

interface DeliveryJobCardProps {
  order: Order;
  courierPosition?: [number, number] | null;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

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

  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!order.delivery_address) return;
    setDistanceLoading(true);
    geocodeAddress(order.delivery_address).then((coords) => {
      setDestCoords(coords);
      setDistanceLoading(false);
    });
  }, [order.delivery_address]);

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
  const canDeliver = isNearCustomer || distanceM === null;

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'ready':           return { label: 'Ready for Pickup',    color: 'bg-green-100 text-green-800 border-green-300' };
      case 'picked_up':
      case 'out_for_delivery': return { label: 'On the Way 🛵',      color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'arrived':         return { label: 'Arrived 📍',           color: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:                return { label: 'Active',               color: 'bg-red-100 text-red-800 border-red-300' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden mb-5 font-body">
      <div className="p-3 pb-0">
        <AnimatedMap address={order.delivery_address || ''} />
      </div>

      <div className="bg-red-50/50 p-5 border-b border-red-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-black text-xl text-red-950 font-heading">#{order.order_number}</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-red-900/60 font-bold">Customer: <span className="text-red-900">{order.customer_name}</span></p>
        </div>
        <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-red-50">
          <span className="text-[10px] font-black text-red-900/40 uppercase tracking-widest block mb-0.5">Total</span>
          <p className="font-black text-lg text-red-600 font-heading">{Number(order.total_amount).toFixed(2)} DH</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-widest text-red-900/40 mb-1">Contact Customer</h3>
            <p className="text-red-950 font-bold text-base">{order.customer_name}</p>
          </div>
          <a
            href={`tel:${order.customer_phone}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-red-950 rounded-xl font-bold text-sm transition-all shadow-md shadow-yellow-400/20 active:scale-95"
          >
            <Phone className="w-4 h-4" />
            {order.customer_phone}
          </a>
        </div>

        <div>
          <h3 className="font-black text-[10px] uppercase tracking-widest text-red-900/40 mb-2 px-1">Delivery Address</h3>
          <div className="flex items-start gap-3 text-red-900 bg-red-50 p-4 rounded-2xl border border-red-100 shadow-inner">
            <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-sm font-bold leading-relaxed">{order.delivery_address || 'No address provided'}</span>
          </div>
          {order.notes && (
            <div className="mt-2 bg-yellow-50 text-yellow-900 p-4 rounded-2xl text-sm border border-yellow-200 leading-relaxed flex gap-3">
              <span className="font-black text-yellow-600 shrink-0">Note:</span>
              <span className="font-medium">{order.notes}</span>
            </div>
          )}
        </div>

        {currentStatus === 'arrived' && (
          <div className={`flex items-center justify-between rounded-2xl px-5 py-4 border shadow-sm ${
            distanceLoading
              ? 'bg-red-50/50 border-red-100'
              : isNearCustomer
              ? 'bg-green-50 border-green-200'
              : distanceM === null
              ? 'bg-red-50/50 border-red-100'
              : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-900/40 mb-1">Distance to customer</p>
              <p className={`font-black text-xl font-heading leading-none ${
                distanceLoading ? 'text-red-900/40 animate-pulse' :
                isNearCustomer ? 'text-green-700' :
                distanceM === null ? 'text-red-900/40' : 'text-red-600'
              }`}>
                {distanceLoading
                  ? 'Calculating...'
                  : distanceM === null
                  ? 'Location unavailable'
                  : formatDistance(distanceM)}
              </p>
              {distanceM !== null && !distanceLoading && (
                <p className={`text-xs font-bold mt-1.5 ${isNearCustomer ? 'text-green-600' : 'text-red-500'}`}>
                  {isNearCustomer ? '✓ Within 250m — you can deliver!' : 'Must be within 250m to deliver'}
                </p>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
              isNearCustomer ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isNearCustomer
                ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                : <Lock className="w-6 h-6 text-red-500" />
              }
            </div>
          </div>
        )}

        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-red-950 hover:bg-red-900 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-950/20 active:scale-[0.98]"
        >
          <Navigation className="w-4 h-4" />
          Open Google Maps Navigation
        </a>

        <div className="pt-4 border-t border-red-100 space-y-3">
          {currentStatus === 'ready' && (
            <button
              id={`pickup-${order.id}`}
              onClick={() => onUpdateStatus(order.id, 'picked_up')}
              className="w-full flex items-center justify-center gap-3 bg-yellow-400 hover:bg-yellow-500 active:scale-[0.98] text-red-950 py-4.5 px-4 rounded-2xl font-black text-base shadow-lg shadow-yellow-400/30 transition-all border border-yellow-300"
            >
              <Store className="w-5 h-5" />
              Step 1 — Pick Up from Restaurant
            </button>
          )}

          {(currentStatus === 'picked_up' || currentStatus === 'out_for_delivery') && (
            <button
              id={`arrive-${order.id}`}
              onClick={() => onUpdateStatus(order.id, 'arrived')}
              className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white py-4.5 px-4 rounded-2xl font-black text-base shadow-lg shadow-red-600/30 transition-all"
            >
              <MapPinCheck className="w-5 h-5" />
              Step 2 — Arrived at Customer
            </button>
          )}

          {currentStatus === 'arrived' && (
            <>
              <button
                id={`deliver-${order.id}`}
                disabled={!canDeliver || distanceLoading}
                onClick={() => onUpdateStatus(order.id, 'completed')}
                className={`w-full flex items-center justify-center gap-3 py-4.5 px-4 rounded-2xl font-black text-base transition-all ${
                  canDeliver && !distanceLoading
                    ? 'bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white shadow-lg shadow-green-600/30 border border-green-500'
                    : 'bg-red-50 text-red-900/40 cursor-not-allowed border-2 border-dashed border-red-200'
                }`}
              >
                {canDeliver && !distanceLoading
                  ? <PackageCheck className="w-6 h-6" />
                  : <Lock className="w-5 h-5" />
                }
                {distanceLoading
                  ? 'Checking location...'
                  : canDeliver
                  ? 'Step 3 — Mark Delivered'
                  : `Too Far (${distanceM !== null ? formatDistance(distanceM) : '?'})`
                }
              </button>

              {!canDeliver && !distanceLoading && distanceM !== null && (
                <p className="text-xs text-center text-red-600 font-bold px-4">
                  You are {formatDistance(distanceM)} away. Move within 250m to unlock delivery.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
