'use client';

/**
 * OrderCard — Restaurant Staff POS Card
 * ========================================
 * Displays a single order with:
 *  • Live elapsed timer + urgency badge
 *  • Status pill + order type
 *  • Customer info + address + notes
 *  • Quick actions (receipt, call)
 *  • PrepTimePopup: triggered when staff taps "Accept Order"
 *    - Preset tiles: 10 / 15 / 20 / 25 / 30 / 45 min
 *    - Custom stepper: any value 5–120 min
 *    - Live countdown once prep time is set
 *  • Standard status progression after acceptance
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Order, OrderStatus } from '@/types';
import {
  Clock, Phone, MapPin, CheckCircle2, Package, Check,
  Printer, PhoneCall, ChevronRight, X, Timer, Flame,
  Plus, Minus, AlertTriangle,
} from 'lucide-react';

// ── Props ─────────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (
    orderId: string,
    newStatus: OrderStatus,
    extra?: { estimated_prep_minutes?: number; ready_at?: string }
  ) => void;
}

// ── Preset time slots ─────────────────────────────────────────────────────────

const PREP_PRESETS = [
  { label: '10', minutes: 10, emoji: '⚡' },
  { label: '15', minutes: 15, emoji: '🔥' },
  { label: '20', minutes: 20, emoji: '🍳' },
  { label: '25', minutes: 25, emoji: '👨‍🍳' },
  { label: '30', minutes: 30, emoji: '🫕' },
  { label: '45', minutes: 45, emoji: '🐢' },
];

// ── Elapsed hook ──────────────────────────────────────────────────────────────

function useElapsedTime(createdAt: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diffMs  = Date.now() - new Date(createdAt).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffSec = Math.floor((diffMs % 60000) / 1000);
      if (diffMin < 1)  setElapsed(`${diffSec}s ago`);
      else if (diffMin < 60) setElapsed(`${diffMin}m ago`);
      else setElapsed(`${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`);
    };
    update();
    const t = setInterval(update, 10_000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(readyAt: string | null | undefined) {
  const [remaining, setRemaining] = useState<{ min: number; sec: number; overdue: boolean } | null>(null);

  useEffect(() => {
    if (!readyAt) { setRemaining(null); return; }
    const update = () => {
      const diffMs = new Date(readyAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setRemaining({ min: 0, sec: 0, overdue: true });
      } else {
        setRemaining({
          min: Math.floor(diffMs / 60000),
          sec: Math.floor((diffMs % 60000) / 1000),
          overdue: false,
        });
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [readyAt]);

  return remaining;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; pill: string }> = {
  pending:          { label: 'Pending',              pill: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed:        { label: 'Confirmed',             pill: 'bg-blue-100 text-blue-800 border-blue-300' },
  preparing:        { label: 'En préparation 🍳',     pill: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  ready:            { label: 'Prêt ✅',               pill: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  picked_up:        { label: 'Récupéré 📦',           pill: 'bg-orange-100 text-orange-800 border-orange-300' },
  out_for_delivery: { label: 'En livraison 🛵',        pill: 'bg-sky-100 text-sky-800 border-sky-300' },
  arrived:          { label: 'Arrivé 📍',             pill: 'bg-purple-100 text-purple-800 border-purple-300' },
  completed:        { label: 'Terminé',               pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled:        { label: 'Annulé',                pill: 'bg-red-100 text-red-700 border-red-200' },
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: '🛵 Livraison',
  pickup:   '🛍️ À emporter',
  dine_in:  '🍽️ Sur place',
};

// ── PrepTimePopup ─────────────────────────────────────────────────────────────

interface PrepTimePopupProps {
  orderNumber: number;
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}

function PrepTimePopup({ orderNumber, onConfirm, onClose }: PrepTimePopupProps) {
  const [selected, setSelected]   = useState<number | null>(null);
  const [custom, setCustom]       = useState(20);
  const [useCustom, setUseCustom] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const effectiveMinutes = useCustom ? custom : selected;
  const canConfirm = effectiveMinutes !== null && effectiveMinutes > 0;

  // Close on backdrop click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const readyTime = effectiveMinutes
    ? new Date(Date.now() + effectiveMinutes * 60_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      ref={overlayRef}
      className="ptp-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Définir le temps de préparation"
    >
      <div className="ptp-sheet">

        {/* ── Header ── */}
        <div className="ptp-header">
          <div className="ptp-header-icon-wrap">
            <Timer size={20} className="ptp-header-icon" />
          </div>
          <div className="ptp-header-text">
            <h2 className="ptp-title">Temps de préparation</h2>
            <p className="ptp-subtitle">Commande <strong>#{orderNumber}</strong> — quand sera-t-elle prête ?</p>
          </div>
          <button className="ptp-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* ── Preset grid ── */}
        <div className="ptp-section-label">Sélectionner un délai rapide</div>
        <div className="ptp-preset-grid">
          {PREP_PRESETS.map(({ label, minutes, emoji }) => (
            <button
              key={minutes}
              className={`ptp-preset-tile ${!useCustom && selected === minutes ? 'ptp-preset-tile--active' : ''}`}
              onClick={() => { setSelected(minutes); setUseCustom(false); }}
              aria-pressed={!useCustom && selected === minutes}
            >
              <span className="ptp-preset-emoji">{emoji}</span>
              <span className="ptp-preset-min">{label}</span>
              <span className="ptp-preset-unit">min</span>
            </button>
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="ptp-divider">
          <span>ou personnaliser</span>
        </div>

        {/* ── Custom stepper ── */}
        <div className={`ptp-custom-row ${useCustom ? 'ptp-custom-row--active' : ''}`}>
          <button
            className="ptp-step-btn"
            onClick={() => { setCustom(v => Math.max(5, v - 5)); setUseCustom(true); }}
            aria-label="Diminuer de 5 minutes"
          >
            <Minus size={16} />
          </button>
          <div className="ptp-custom-display" onClick={() => setUseCustom(true)}>
            <span className="ptp-custom-value">{custom}</span>
            <span className="ptp-custom-unit">min</span>
          </div>
          <button
            className="ptp-step-btn"
            onClick={() => { setCustom(v => Math.min(120, v + 5)); setUseCustom(true); }}
            aria-label="Augmenter de 5 minutes"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* ── Ready-time preview ── */}
        {readyTime && (
          <div className="ptp-preview">
            <Clock size={15} className="ptp-preview-icon" />
            <span>
              Prête à <strong>{readyTime}</strong>
              {' '}·{' '}
              dans {effectiveMinutes} min
            </span>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="ptp-actions">
          <button className="ptp-btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button
            className="ptp-btn-confirm"
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(effectiveMinutes!)}
          >
            <Check size={16} />
            Accepter la commande
            {canConfirm && <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      <style>{`
        /* ── Overlay ── */
        .ptp-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: ptp-fade 0.18s ease;
        }
        @keyframes ptp-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Sheet ── */
        .ptp-sheet {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(15,23,42,.28), 0 8px 24px rgba(15,23,42,.12);
          animation: ptp-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }
        @keyframes ptp-pop {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }

        /* ── Header ── */
        .ptp-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 20px 16px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-bottom: 1px solid rgba(255,255,255,.07);
        }
        .ptp-header-icon-wrap {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,.12);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ptp-header-icon { color: #e8a93a; }
        .ptp-header-text { flex: 1; }
        .ptp-title {
          font-size: 1rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 3px;
          line-height: 1.2;
        }
        .ptp-subtitle {
          font-size: 0.78rem;
          color: rgba(255,255,255,.55);
          margin: 0;
        }
        .ptp-subtitle strong { color: rgba(255,255,255,.85); }
        .ptp-close {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,.1);
          color: rgba(255,255,255,.7);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background .15s;
        }
        .ptp-close:hover { background: rgba(255,255,255,.18); color: #fff; }

        /* ── Section label ── */
        .ptp-section-label {
          padding: 16px 20px 10px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        /* ── Preset grid ── */
        .ptp-preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 0 20px;
        }
        .ptp-preset-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 12px 6px;
          border-radius: 14px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
          transition: all .14s;
        }
        .ptp-preset-tile:hover {
          border-color: #6366f1;
          background: #eef2ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99,102,241,.18);
        }
        .ptp-preset-tile--active {
          border-color: #4f46e5;
          background: #eef2ff;
          box-shadow: 0 0 0 3px rgba(99,102,241,.2);
          transform: translateY(-2px);
        }
        .ptp-preset-emoji { font-size: 1.3rem; line-height: 1; }
        .ptp-preset-min {
          font-size: 1.25rem;
          font-weight: 900;
          color: #1e293b;
          line-height: 1;
        }
        .ptp-preset-tile--active .ptp-preset-min { color: #4f46e5; }
        .ptp-preset-unit {
          font-size: 0.68rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        /* ── Divider ── */
        .ptp-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px 10px;
          color: #cbd5e1;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .ptp-divider::before,
        .ptp-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .ptp-divider span { color: #94a3b8; white-space: nowrap; }

        /* ── Custom stepper ── */
        .ptp-custom-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 6px 20px 14px;
        }
        .ptp-step-btn {
          width: 42px; height: 42px;
          border-radius: 50%;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .13s;
          flex-shrink: 0;
        }
        .ptp-step-btn:hover {
          border-color: #6366f1;
          background: #eef2ff;
          color: #4f46e5;
        }
        .ptp-custom-display {
          display: flex;
          align-items: baseline;
          gap: 4px;
          cursor: pointer;
          min-width: 90px;
          justify-content: center;
        }
        .ptp-custom-value {
          font-size: 2.4rem;
          font-weight: 900;
          color: #1e293b;
          line-height: 1;
          transition: color .13s;
        }
        .ptp-custom-row--active .ptp-custom-value { color: #4f46e5; }
        .ptp-custom-unit {
          font-size: 0.9rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        /* ── Ready time preview ── */
        .ptp-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 20px 14px;
          padding: 10px 14px;
          background: #f0fdf4;
          border: 1.5px solid #86efac;
          border-radius: 12px;
          color: #166534;
          font-size: 0.85rem;
          animation: ptp-fade .2s ease;
        }
        .ptp-preview-icon { color: #22c55e; flex-shrink: 0; }
        .ptp-preview strong { color: #15803d; }

        /* ── Actions ── */
        .ptp-actions {
          display: flex;
          gap: 10px;
          padding: 0 20px 20px;
        }
        .ptp-btn-cancel {
          flex: 0 0 auto;
          padding: 0 18px;
          height: 48px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-weight: 700;
          font-size: 0.87rem;
          cursor: pointer;
          transition: all .13s;
        }
        .ptp-btn-cancel:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .ptp-btn-confirm {
          flex: 1;
          height: 48px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #fff;
          font-weight: 800;
          font-size: 0.88rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 4px 16px rgba(99,102,241,.4);
          transition: all .13s;
        }
        .ptp-btn-confirm:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          box-shadow: 0 6px 20px rgba(99,102,241,.5);
          transform: translateY(-1px);
        }
        .ptp-btn-confirm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
      `}</style>
    </div>
  );
}

// ── PrepTimeBadge (inline card badge showing countdown) ───────────────────────

function PrepTimeBadge({ readyAt, prepMinutes }: { readyAt: string; prepMinutes: number }) {
  const cd = useCountdown(readyAt);

  if (!cd) return null;

  if (cd.overdue) {
    return (
      <div className="ptb-badge ptb-badge--overdue">
        <AlertTriangle size={12} />
        <span>En retard · {prepMinutes} min prévu</span>
      </div>
    );
  }

  const total  = prepMinutes * 60;
  const remain = cd.min * 60 + cd.sec;
  const pct    = Math.max(0, Math.min(100, (remain / total) * 100));

  return (
    <div className="ptb-badge">
      <div className="ptb-row">
        <Timer size={12} className="ptb-icon" />
        <span className="ptb-time">
          {cd.min}:{String(cd.sec).padStart(2, '0')} restant
        </span>
        <span className="ptb-ready-at">
          · prête à {new Date(readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="ptb-bar-track">
        <div className="ptb-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <style>{`
        .ptb-badge {
          margin: 4px 0 2px;
          padding: 7px 10px;
          border-radius: 10px;
          background: #f0fdf4;
          border: 1.5px solid #86efac;
        }
        .ptb-badge--overdue {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #dc2626;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.76rem;
          font-weight: 700;
        }
        .ptb-row {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
        }
        .ptb-icon { color: #22c55e; flex-shrink: 0; }
        .ptb-time {
          font-size: 0.8rem;
          font-weight: 800;
          color: #15803d;
        }
        .ptb-ready-at {
          font-size: 0.73rem;
          color: #4ade80;
          font-weight: 600;
        }
        .ptb-bar-track {
          width: 100%;
          height: 4px;
          border-radius: 99px;
          background: #bbf7d0;
          overflow: hidden;
        }
        .ptb-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #22c55e, #4ade80);
          transition: width 1s linear;
        }
      `}</style>
    </div>
  );
}

// ── OrderCard ─────────────────────────────────────────────────────────────────

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const isDelivery = order.order_type === 'delivery';
  const elapsed    = useElapsedTime(order.created_at);
  const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent   = ageMinutes >= 15 && !['completed', 'cancelled', 'ready'].includes(order.status);

  const [showPrepPopup, setShowPrepPopup] = useState(false);

  const config = STATUS_CONFIG[order.status];

  // Status flow
  const getNextStatus = (s: OrderStatus): OrderStatus | null => {
    const map: Partial<Record<OrderStatus, OrderStatus>> = {
      pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed',
    };
    return map[s] ?? null;
  };

  const nextStatus = getNextStatus(order.status);

  const nextLabel =
    nextStatus === 'confirmed' ? 'Accepter la commande'
    : nextStatus === 'preparing' ? 'Démarrer la préparation'
    : nextStatus === 'ready'     ? 'Marquer Prête'
    : nextStatus === 'completed' ? 'Terminer'
    : '';

  const nextBtnColor =
    nextStatus === 'confirmed' ? 'ocard-btn--indigo'
    : nextStatus === 'preparing' ? 'ocard-btn--violet'
    : nextStatus === 'ready'     ? 'ocard-btn--emerald'
    : 'ocard-btn--slate';

  // When staff clicks "Accept Order" → open PrepTimePopup first
  const handleMainAction = () => {
    if (nextStatus === 'confirmed') {
      setShowPrepPopup(true);
    } else {
      onUpdateStatus(order.id, nextStatus!);
    }
  };

  // Popup confirmed → advance to confirmed + store prep metadata
  const handlePrepConfirm = (minutes: number) => {
    setShowPrepPopup(false);
    const readyAt = new Date(Date.now() + minutes * 60_000).toISOString();
    onUpdateStatus(order.id, 'confirmed', {
      estimated_prep_minutes: minutes,
      ready_at: readyAt,
    });
  };

  const showCountdown =
    order.ready_at &&
    order.estimated_prep_minutes &&
    ['confirmed', 'preparing'].includes(order.status);

  return (
    <>
      <div className={`ocard ${isUrgent ? 'ocard--urgent' : ''}`}>

        {/* ── Header ── */}
        <div className="ocard-header">
          <div>
            <div className="ocard-header-top">
              <span className="ocard-order-num">#{order.order_number}</span>
              <span className={`ocard-pill ${config.pill}`}>{config.label}</span>
              {isUrgent && (
                <span className="ocard-urgent-pill">
                  <Flame size={10} /> Urgent
                </span>
              )}
            </div>
            <div className="ocard-meta">
              <Clock size={12} />
              <span>{elapsed}</span>
              <span className="ocard-meta-dot">·</span>
              <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="ocard-amount-wrap">
            <p className="ocard-amount">{Number(order.total_amount).toFixed(2)} DH</p>
            <p className="ocard-type">{ORDER_TYPE_LABEL[order.order_type] ?? order.order_type}</p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ocard-body">
          <p className="ocard-customer">{order.customer_name}</p>

          <div className="ocard-info-row">
            <Phone size={13} className="ocard-info-icon" />
            <a href={`tel:${order.customer_phone}`} className="ocard-phone">
              {order.customer_phone}
            </a>
          </div>

          {isDelivery && order.delivery_address && (
            <div className="ocard-info-row">
              <MapPin size={13} className="ocard-info-icon" />
              <span className="ocard-address">{order.delivery_address}</span>
            </div>
          )}

          {order.notes && (
            <div className="ocard-notes">
              <span className="ocard-notes-label">📝 Note:</span> {order.notes}
            </div>
          )}

          {/* ── Countdown badge ── */}
          {showCountdown && (
            <PrepTimeBadge
              readyAt={order.ready_at!}
              prepMinutes={order.estimated_prep_minutes!}
            />
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="ocard-quick-actions">
          <button className="ocard-quick-btn" onClick={() => window.print()}>
            <Printer size={13} /> Ticket
          </button>
          <a href={`tel:${order.customer_phone}`} className="ocard-quick-btn ocard-quick-btn--blue">
            <PhoneCall size={13} /> Appeler
          </a>
        </div>

        {/* ── Main action ── */}
        <div className="ocard-actions">
          {nextStatus && (
            <button
              id={`action-${order.id}`}
              onClick={handleMainAction}
              className={`ocard-btn ${nextBtnColor}`}
            >
              {nextStatus === 'confirmed'  && <Check      size={15} />}
              {nextStatus === 'preparing'  && <Package    size={15} />}
              {nextStatus === 'ready'      && <CheckCircle2 size={15} />}
              {nextLabel}
              <ChevronRight size={14} />
            </button>
          )}
          {order.status === 'pending' && (
            <button
              id={`cancel-${order.id}`}
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              className="ocard-btn-cancel"
            >
              Refuser
            </button>
          )}
        </div>
      </div>

      {/* ── Prep Time Popup ── */}
      {showPrepPopup && (
        <PrepTimePopup
          orderNumber={order.order_number}
          onConfirm={handlePrepConfirm}
          onClose={() => setShowPrepPopup(false)}
        />
      )}

      <style>{`
        /* ── Card ── */
        .ocard {
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 1px 4px rgba(15,23,42,.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow .18s, border-color .18s;
        }
        .ocard:hover { box-shadow: 0 6px 20px rgba(15,23,42,.1); }
        .ocard--urgent {
          border-color: #fca5a5;
          animation: ocard-pulse-border 2s ease-in-out infinite;
        }
        @keyframes ocard-pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50%       { box-shadow: 0 0 0 4px rgba(239,68,68,.15); }
        }

        /* ── Header ── */
        .ocard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ocard-header-top {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .ocard-order-num {
          font-size: 1rem;
          font-weight: 900;
          color: #0f172a;
        }
        .ocard-pill {
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: .04em;
          text-transform: uppercase;
          border: 1px solid transparent;
        }
        .ocard-urgent-pill {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 2px 7px;
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
          background: #dc2626;
          color: #fff;
          animation: ocard-blink 1.2s ease-in-out infinite;
        }
        @keyframes ocard-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: .65; }
        }
        .ocard-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.74rem;
          color: #94a3b8;
        }
        .ocard-meta-dot { color: #cbd5e1; }
        .ocard-amount-wrap { text-align: right; flex-shrink: 0; }
        .ocard-amount {
          font-size: 1.1rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }
        .ocard-type {
          font-size: 0.72rem;
          color: #94a3b8;
          margin: 0;
        }

        /* ── Body ── */
        .ocard-body {
          padding: 12px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ocard-customer {
          font-size: 0.9rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .ocard-info-row {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          font-size: 0.78rem;
          color: #64748b;
        }
        .ocard-info-icon { color: #94a3b8; flex-shrink: 0; margin-top: 1px; }
        .ocard-phone {
          color: #64748b;
          text-decoration: none;
          font-weight: 600;
          transition: color .12s;
        }
        .ocard-phone:hover { color: #4f46e5; }
        .ocard-address { line-height: 1.4; }
        .ocard-notes {
          padding: 8px 10px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          font-size: 0.76rem;
          color: #92400e;
          line-height: 1.5;
        }
        .ocard-notes-label { font-weight: 800; }

        /* ── Quick actions ── */
        .ocard-quick-actions {
          display: flex;
          gap: 8px;
          padding: 6px 16px 4px;
        }
        .ocard-quick-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all .12s;
        }
        .ocard-quick-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .ocard-quick-btn--blue {
          color: #2563eb;
          border-color: #bfdbfe;
          background: #eff6ff;
        }
        .ocard-quick-btn--blue:hover { background: #dbeafe; }

        /* ── Main action ── */
        .ocard-actions {
          padding: 8px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .ocard-btn {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 12px;
          border: none;
          font-weight: 800;
          font-size: 0.87rem;
          cursor: pointer;
          transition: all .13s;
          color: #fff;
        }
        .ocard-btn:active { transform: scale(.97); }
        .ocard-btn--indigo {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          box-shadow: 0 4px 14px rgba(99,102,241,.35);
        }
        .ocard-btn--indigo:hover { box-shadow: 0 6px 20px rgba(99,102,241,.45); transform: translateY(-1px); }
        .ocard-btn--violet {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          box-shadow: 0 4px 14px rgba(124,58,237,.35);
        }
        .ocard-btn--violet:hover { box-shadow: 0 6px 20px rgba(124,58,237,.45); transform: translateY(-1px); }
        .ocard-btn--emerald {
          background: linear-gradient(135deg, #059669, #10b981);
          box-shadow: 0 4px 14px rgba(5,150,105,.35);
        }
        .ocard-btn--emerald:hover { box-shadow: 0 6px 20px rgba(5,150,105,.45); transform: translateY(-1px); }
        .ocard-btn--slate {
          background: linear-gradient(135deg, #334155, #475569);
          box-shadow: 0 4px 12px rgba(51,65,85,.25);
        }
        .ocard-btn-cancel {
          width: 100%;
          height: 38px;
          border-radius: 10px;
          border: 1.5px solid #fca5a5;
          background: transparent;
          color: #dc2626;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all .12s;
        }
        .ocard-btn-cancel:hover { background: #fef2f2; }
      `}</style>
    </>
  );
}
