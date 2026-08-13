'use client';

import { useEffect, useState } from "react";
import { Order, OrderStatus } from "@/types";
import { Clock, Phone, MapPin, CheckCircle2, Package, Check, Printer, PhoneCall } from "lucide-react";

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

function useElapsedTime(createdAt: string) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffSec = Math.floor((diffMs % 60000) / 1000);
      if (diffMin < 1) setElapsed(`${diffSec}s ago`);
      else if (diffMin < 60) setElapsed(`${diffMin}m ago`);
      else setElapsed(`${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`);
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [createdAt]);

  return elapsed;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; pill: string }> = {
  pending:          { label: 'Pending',           pill: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed:        { label: 'Confirmed',          pill: 'bg-blue-100 text-blue-800 border-blue-300' },
  preparing:        { label: 'Preparing',          pill: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  ready:            { label: 'Ready',              pill: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  picked_up:        { label: 'Picked Up 📦',       pill: 'bg-orange-100 text-orange-800 border-orange-300' },
  out_for_delivery: { label: 'Out for Delivery 🛵', pill: 'bg-sky-100 text-sky-800 border-sky-300' },
  arrived:          { label: 'Arrived 📍',          pill: 'bg-purple-100 text-purple-800 border-purple-300' },
  completed:        { label: 'Completed',           pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled:        { label: 'Cancelled',           pill: 'bg-red-100 text-red-700 border-red-200' },
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: '🛵 Delivery',
  pickup: '🛍️ Pickup',
  dine_in: '🍽️ Dine-In',
};

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const isDelivery = order.order_type === 'delivery';
  const elapsed = useElapsedTime(order.created_at);
  const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent = ageMinutes >= 15 && !['completed', 'cancelled'].includes(order.status);

  const config = STATUS_CONFIG[order.status];

  const getNextStatus = (s: OrderStatus): OrderStatus | null => {
    const map: Partial<Record<OrderStatus, OrderStatus>> = {
      pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed',
    };
    return map[s] ?? null;
  };

  const nextStatus = getNextStatus(order.status);
  const nextLabel = nextStatus === 'confirmed' ? 'Accept Order'
                  : nextStatus === 'preparing' ? 'Start Preparing'
                  : nextStatus === 'ready'     ? 'Mark Ready'
                  : nextStatus === 'completed' ? 'Complete Order' : '';

  const nextBtnColor = nextStatus === 'confirmed' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                     : nextStatus === 'preparing' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                     : nextStatus === 'ready'     ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                     : 'bg-slate-800 hover:bg-slate-900 shadow-slate-600/20';

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${isUrgent ? 'border-red-300 animate-urgent' : 'border-slate-200'}`}>

      {/* ── Header ──────────────────────────────────── */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 text-base">#{order.order_number}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${config.pill}`}>
              {config.label}
            </span>
            {isUrgent && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                ⚡ Urgent
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{elapsed}</span>
            <span className="text-slate-200">·</span>
            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-lg text-slate-900">{Number(order.total_amount).toFixed(2)} DH</p>
          <p className="text-slate-400 text-xs">{ORDER_TYPE_LABEL[order.order_type] ?? order.order_type}</p>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────── */}
      <div className="px-4 py-3.5 flex-1 space-y-2">
        <p className="font-bold text-slate-900 text-sm">{order.customer_name}</p>

        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <a href={`tel:${order.customer_phone}`} className="hover:text-indigo-600 transition font-medium">
            {order.customer_phone}
          </a>
        </div>

        {isDelivery && order.delivery_address && (
          <div className="flex items-start gap-2 text-slate-500 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{order.delivery_address}</span>
          </div>
        )}

        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">📝 Note:</span> {order.notes}
          </div>
        )}
      </div>

      {/* ── Quick Actions ────────────────────────────── */}
      <div className="px-4 pb-1 flex gap-2">
        <button
          title="Print receipt"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition"
          onClick={() => window.print()}
        >
          <Printer className="w-3.5 h-3.5" /> Receipt
        </button>
        <a
          href={`tel:${order.customer_phone}`}
          title="Call customer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition"
        >
          <PhoneCall className="w-3.5 h-3.5" /> Call
        </a>
      </div>

      {/* ── Actions ─────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        {nextStatus && (
          <button
            id={`action-${order.id}`}
            onClick={() => onUpdateStatus(order.id, nextStatus)}
            className={`w-full flex items-center justify-center gap-2 ${nextBtnColor} text-white font-bold py-3 rounded-xl transition-all active:scale-[0.97] shadow-md text-sm`}
          >
            {nextStatus === 'confirmed'  && <Check className="w-4 h-4" />}
            {nextStatus === 'preparing'  && <Package className="w-4 h-4" />}
            {nextStatus === 'ready'      && <CheckCircle2 className="w-4 h-4" />}
            {nextLabel}
          </button>
        )}
        {order.status === 'pending' && (
          <button
            id={`cancel-${order.id}`}
            onClick={() => onUpdateStatus(order.id, 'cancelled')}
            className="w-full text-red-500 hover:bg-red-50 border border-red-200 font-semibold py-2 rounded-xl text-xs transition"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
