'use client';

/**
 * OrderCard — DelivriLi Restaurant Staff POS Card
 * =====================================================
 * Redesigned with the Appetizing Red / Warm Gold / Playfair / Karla theme.
 * No emojis used. Block-based layouts.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Order, OrderStatus } from '@/types';
import {
  Clock, Phone, MapPin, CheckCircle2, Package, Check,
  Printer, PhoneCall, ChevronRight, X, Timer,
  Plus, Minus, AlertTriangle, Flame, Bike,
  Zap, Utensils, ChefHat, Soup
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (
    orderId: string,
    newStatus: OrderStatus,
    extra?: { estimated_prep_minutes?: number; ready_at?: string }
  ) => void;
}

const PREP_PRESETS = [
  { label: '10', minutes: 10, icon: <Zap size={20} />, hint: 'Express' },
  { label: '15', minutes: 15, icon: <Flame size={20} />, hint: 'Fast' },
  { label: '20', minutes: 20, icon: <Utensils size={20} />, hint: 'Normal' },
  { label: '25', minutes: 25, icon: <ChefHat size={20} />, hint: 'Careful' },
  { label: '30', minutes: 30, icon: <Soup size={20} />, hint: 'Simmered' },
  { label: '45', minutes: 45, icon: <Timer size={20} />, hint: 'Slow' },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pending',       bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626', icon: null },
  confirmed:        { label: 'Confirmed',     bg: '#fef3c7', text: '#b45309', dot: '#d97706', icon: null },
  preparing:        { label: 'Preparing',     bg: '#ffedd5', text: '#c2410c', dot: '#ea580c', icon: <Utensils size={12}/> },
  ready:            { label: 'Ready',         bg: '#dcfce7', text: '#15803d', dot: '#16a34a', icon: <CheckCircle2 size={12}/> },
  picked_up:        { label: 'Picked Up',     bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626', icon: <Package size={12}/> },
  out_for_delivery: { label: 'Delivering',    bg: '#e0f2fe', text: '#0369a1', dot: '#0284c7', icon: <Bike size={12}/> },
  arrived:          { label: 'Arrived',       bg: '#dcfce7', text: '#15803d', dot: '#16a34a', icon: <MapPin size={12}/> },
  completed:        { label: 'Completed',     bg: '#f3f4f6', text: '#4b5563', dot: '#6b7280', icon: null },
  cancelled:        { label: 'Cancelled',     bg: '#fecaca', text: '#b91c1c', dot: '#ef4444', icon: null },
};

const ORDER_TYPE_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  delivery: { label: 'Delivery', icon: <Bike size={14}/> },
  pickup:   { label: 'Pickup',   icon: <Package size={14}/> },
  dine_in:  { label: 'Dine-in',  icon: <Utensils size={14}/> },
};

function useElapsedTime(createdAt: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const ms  = Date.now() - new Date(createdAt).getTime();
      const min = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      if (min < 1) setElapsed(`${sec}s`);
      else if (min < 60) setElapsed(`${min}min`);
      else setElapsed(`${Math.floor(min / 60)}h${min % 60}m`);
    };
    update();
    const t = setInterval(update, 10_000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

function useCountdown(readyAt: string | null | undefined) {
  const [state, setState] = useState<{ min: number; sec: number; overdue: boolean; pct: number } | null>(null);
  useEffect(() => {
    if (!readyAt) { setState(null); return; }
    const target = new Date(readyAt).getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setState({ min: 0, sec: 0, overdue: true, pct: 0 }); return; }
      setState({
        min: Math.floor(diff / 60000),
        sec: Math.floor((diff % 60000) / 1000),
        overdue: false,
        pct: 0,
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [readyAt]);
  return state;
}

function PrepTimePopup({
  order,
  onConfirm,
  onClose,
}: {
  order: Order;
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected]   = useState<number | null>(null);
  const [custom, setCustom]       = useState(20);
  const [useCustom, setUseCustom] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const minutes = useCustom ? custom : selected;
  const canConfirm = minutes !== null && minutes > 0;

  const readyTime = minutes
    ? new Date(Date.now() + minutes * 60_000)
        .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleOverlay = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const arcPct = minutes ? Math.min(100, (minutes / 60) * 100) : 0;
  const r = 44; const circ = 2 * Math.PI * r;
  const dash = circ * (arcPct / 100);

  return (
    <div ref={overlayRef} className="ptp-overlay" onClick={handleOverlay} role="dialog" aria-modal>
      <div className="ptp-sheet">
        <div className="ptp-header">
          <div className="ptp-header-left">
            <div className="ptp-timer-badge">
              <Timer size={20} className="ptp-timer-icon" />
            </div>
            <div>
              <h2 className="ptp-title">Prep Time</h2>
              <p className="ptp-subtitle">Order <strong>#{order.order_number}</strong> — {order.customer_name}</p>
            </div>
          </div>
          <button className="ptp-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ptp-arc-wrap">
          <svg viewBox="0 0 100 100" className="ptp-arc-svg">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#EAF6ED" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={0}
              transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r={r} fill="none"
              stroke={minutes ? '#32B260' : '#EAF6ED'} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray .4s cubic-bezier(.16,1,.3,1), stroke .3s' }}
            />
          </svg>
          <div className="ptp-arc-center">
            {minutes ? (
              <>
                <span className="ptp-arc-value">{minutes}</span>
                <span className="ptp-arc-unit">min</span>
              </>
            ) : (
              <span className="ptp-arc-placeholder">?</span>
            )}
          </div>
        </div>

        {readyTime && (
          <div className="ptp-ready-preview">
            <Clock size={14} className="ptp-ready-icon" />
            Ready at <strong>{readyTime}</strong> · in {minutes} min
          </div>
        )}

        <div className="ptp-preset-label">Quick Presets</div>
        <div className="ptp-preset-grid">
          {PREP_PRESETS.map(({ label, minutes: m, icon, hint }) => {
            const isActive = !useCustom && selected === m;
            return (
              <button
                key={m}
                className={`ptp-tile ${isActive ? 'ptp-tile--active' : ''}`}
                onClick={() => { setSelected(m); setUseCustom(false); }}
              >
                <span className="ptp-tile-icon">{icon}</span>
                <span className="ptp-tile-min">{label}</span>
                <span className="ptp-tile-hint">{hint}</span>
              </button>
            );
          })}
        </div>

        <div className="ptp-custom-wrap">
          <span className="ptp-custom-label">Custom</span>
          <div className={`ptp-stepper ${useCustom ? 'ptp-stepper--active' : ''}`}>
            <button className="ptp-step"
              onClick={() => { setCustom(v => Math.max(5, v - 5)); setUseCustom(true); }}>
              <Minus size={16} />
            </button>
            <span className="ptp-step-val" onClick={() => setUseCustom(true)}>
              {custom}<span className="ptp-step-unit">min</span>
            </span>
            <button className="ptp-step"
              onClick={() => { setCustom(v => Math.min(120, v + 5)); setUseCustom(true); }}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="ptp-footer">
          <button className="ptp-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="ptp-btn-confirm"
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(minutes!)}
          >
            <Check size={16} />
            Accept — {minutes ? `${minutes} min` : '…'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CountdownBadge({ readyAt, prepMinutes }: { readyAt: string; prepMinutes: number }) {
  const cd = useCountdown(readyAt);
  if (!cd) return null;

  if (cd.overdue) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold mt-2">
        <AlertTriangle size={16} className="text-red-500 shrink-0" />
        Overdue · expected {prepMinutes} min
      </div>
    );
  }

  const totalSec = prepMinutes * 60;
  const remainSec = cd.min * 60 + cd.sec;
  const pct = Math.max(0, Math.min(100, (remainSec / totalSec) * 100));
  const barColor = pct > 40 ? '#16a34a' : pct > 15 ? '#d97706' : '#dc2626';
  const readyHHmm = new Date(readyAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Timer size={14} className="text-gray-500 shrink-0" />
        <span className="text-sm font-black text-gray-900 font-heading">
          {cd.min}:{String(cd.sec).padStart(2, '0')}
        </span>
        <span className="text-xs text-gray-500 font-bold">
          remaining · ready at {readyHHmm}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)` }}
        />
      </div>
    </div>
  );
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const isDelivery = order.order_type === 'delivery';
  const elapsed    = useElapsedTime(order.created_at);
  const ageMin     = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent   = ageMin >= 15 && !['completed', 'cancelled', 'ready'].includes(order.status);
  const [showPrepPopup, setShowPrepPopup] = useState(false);

  const status = STATUS_CONFIG[order.status];
  const typeInfo = ORDER_TYPE_LABEL[order.order_type] ?? { label: order.order_type, icon: <Package size={14}/> };

  const getNextStatus = (s: OrderStatus): OrderStatus | null => {
    const map: Partial<Record<OrderStatus, OrderStatus>> = {
      pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed',
    };
    return map[s] ?? null;
  };
  const nextStatus = getNextStatus(order.status);

  const nextLabel =
    nextStatus === 'confirmed' ? 'Accept' :
    nextStatus === 'preparing' ? 'Start' :
    nextStatus === 'ready'     ? 'Mark Ready' :
    nextStatus === 'completed' ? 'Complete' : '';

  const nextIcon =
    nextStatus === 'confirmed'  ? <Check size={16} /> :
    nextStatus === 'preparing'  ? <Utensils size={16} /> :
    nextStatus === 'ready'      ? <CheckCircle2 size={16} /> : null;

  const handleMainAction = () => {
    if (nextStatus === 'confirmed') { setShowPrepPopup(true); return; }
    if (nextStatus) onUpdateStatus(order.id, nextStatus);
  };

  const handlePrepConfirm = (minutes: number) => {
    setShowPrepPopup(false);
    const readyAt = new Date(Date.now() + minutes * 60_000).toISOString();
    onUpdateStatus(order.id, 'confirmed', { estimated_prep_minutes: minutes, ready_at: readyAt });
  };

  const showCountdown = order.ready_at && order.estimated_prep_minutes &&
    ['confirmed', 'preparing'].includes(order.status);

  return (
    <>
      <div className={`bg-white border-[1.5px] rounded-[24px] shadow-sm flex flex-col font-body transition-all duration-300 ${
        isUrgent ? 'border-red-300 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_4px_24px_rgba(220,38,38,0.15)]' : 'border-gray-200 hover:shadow-md'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-heading text-xl font-bold text-gray-900 leading-none">
                #{order.order_number}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5"
                style={{ background: status.bg, color: status.text }}>
                {status.icon && status.icon} {status.label}
              </span>
              {isUrgent && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide flex items-center gap-1 bg-red-600 text-white shadow-sm">
                  <Flame size={12} /> Urgent
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold">
              <Clock size={12} />
              <span>{elapsed}</span>
              <span className="text-gray-300">•</span>
              <span>{new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-xl font-bold text-gray-900 m-0 leading-none">
              {Number(order.total_amount).toFixed(2)}
              <span className="text-xs text-gray-500 font-body ml-1">DH</span>
            </p>
            <p className="text-xs font-bold text-gray-500 mt-1 flex items-center justify-end gap-1">
              {typeInfo.icon} {typeInfo.label}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col gap-2">
          <p className="font-bold text-gray-900 text-[15px] m-0">{order.customer_name}</p>
          
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-gray-400 shrink-0" />
            <a href={`tel:${order.customer_phone}`} className="text-sm text-gray-600 font-bold hover:text-red-600 transition-colors">
              {order.customer_phone}
            </a>
          </div>

          {isDelivery && order.delivery_address && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 font-medium leading-snug">
                {order.delivery_address}
              </span>
            </div>
          )}

          {order.notes && (
            <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-900 font-medium leading-snug mt-1">
              <span className="font-bold">Note:</span> {order.notes}
            </div>
          )}

          {showCountdown && (
            <CountdownBadge readyAt={order.ready_at!} prepMinutes={order.estimated_prep_minutes!} />
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 px-4 pb-2">
          <button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <Printer size={14} /> Receipt
          </button>
          <a href={`tel:${order.customer_phone}`} className="flex-1 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
            <PhoneCall size={14} /> Call
          </a>
        </div>

        {/* Main Action */}
        <div className="p-4 pt-1 flex flex-col gap-2">
          {nextStatus && (
            <button
              onClick={handleMainAction}
              className={`w-full h-12 rounded-xl border-0 font-heading text-lg font-bold cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-white ${
                nextStatus === 'confirmed' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' :
                nextStatus === 'preparing' ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30 text-yellow-950' :
                nextStatus === 'ready'     ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30' :
                'bg-gray-900 hover:bg-black shadow-gray-900/30'
              }`}
            >
              {nextIcon}
              {nextLabel}
              {nextStatus === 'confirmed' && (
                <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full font-body font-bold">
                  + Prep Time
                </span>
              )}
            </button>
          )}
          {order.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              className="w-full h-10 rounded-xl border-2 border-red-100 bg-transparent text-red-600 font-bold text-sm cursor-pointer hover:bg-red-50 transition-colors"
            >
              Decline Order
            </button>
          )}
        </div>
      </div>

      {showPrepPopup && (
        <PrepTimePopup
          order={order}
          onConfirm={handlePrepConfirm}
          onClose={() => setShowPrepPopup(false)}
        />
      )}
    </>
  );
}
