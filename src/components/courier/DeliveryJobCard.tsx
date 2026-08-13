'use client';

import dynamic from "next/dynamic";
import { Order, OrderStatus } from "@/types";
import { Phone, MapPin, Navigation, CheckCircle2, PackageCheck, MapPinCheck, Store } from "lucide-react";

const AnimatedMap = dynamic(
  () => import("./AnimatedMap").then((mod) => mod.AnimatedMap),
  { ssr: false, loading: () => <div className="w-full h-48 bg-slate-800 rounded-2xl animate-pulse" /> }
);

interface DeliveryJobCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export function DeliveryJobCard({ order, onUpdateStatus }: DeliveryJobCardProps) {
  const currentStatus = order.status;

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'ready':
        return { label: 'Ready for Pickup', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'picked_up':
      case 'out_for_delivery':
        return { label: 'On the Way', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'arrived':
        return { label: 'Arrived at Customer', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: 'Active Delivery', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-4 animate-slide-up">
      {/* Map Header */}
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
        {/* Customer Call */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Contact Customer</h3>
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

        {/* Address & Instructions */}
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

        {/* Navigation Button */}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs transition-colors shadow"
        >
          <Navigation className="w-4 h-4" />
          Open Google Maps Navigation
        </a>

        {/* ── Step-by-Step Courier Actions ──────────────── */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {currentStatus === 'ready' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'picked_up')}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-black text-sm shadow-md shadow-amber-500/30 transition-all active:scale-[0.98]"
            >
              <Store className="w-5 h-5" />
              1. Pick Up Order from Restaurant
            </button>
          )}

          {(currentStatus === 'picked_up' || currentStatus === 'out_for_delivery') && (
            <button
              onClick={() => onUpdateStatus(order.id, 'arrived')}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <MapPinCheck className="w-5 h-5" />
              2. Arrived at Customer Location
            </button>
          )}

          {currentStatus === 'arrived' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'completed')}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-sm shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98] animate-pulse"
            >
              <PackageCheck className="w-5 h-5" />
              3. Hand Over &amp; Mark Delivered
            </button>
          )}

          {/* Fallback direct complete button */}
          {currentStatus !== 'completed' && currentStatus !== 'arrived' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'completed')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 py-1 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Skip to Mark Delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
