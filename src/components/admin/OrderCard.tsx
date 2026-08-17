'use client';

/**
 * OrderCard — DelivriLi Restaurant Staff POS Card
 * =====================================================
 * Fully branded with the DelivriLi Moroccan design system:
 *  • Lalezar display font headings
 *  • Terracotta (#c1440e) primary / Cobalt (#1e5b8c) secondary / Saffron (#e8a93a) accent
 *  • Zellige geometric background on urgent cards
 *  • Glassmorphism overlays
 *  • PrepTimePopup: animated bottom sheet with time presets
 *  • Live countdown ring on accepted orders
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Order, OrderStatus } from '@/types';
import {
  Clock, Phone, MapPin, CheckCircle2, Package, Check,
  Printer, PhoneCall, ChevronRight, X, Timer,
  Plus, Minus, AlertTriangle, Flame, Bike,
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (
    orderId: string,
    newStatus: OrderStatus,
    extra?: { estimated_prep_minutes?: number; ready_at?: string }
  ) => void;
}

// ── Preset time options ───────────────────────────────────────────────────────

const PREP_PRESETS = [
  { label: '10', minutes: 10, icon: '⚡', hint: 'Express' },
  { label: '15', minutes: 15, icon: '🔥', hint: 'Rapide' },
  { label: '20', minutes: 20, icon: '🍳', hint: 'Normal' },
  { label: '25', minutes: 25, icon: '👨‍🍳', hint: 'Soigné' },
  { label: '30', minutes: 30, icon: '🫕', hint: 'Mijoté' },
  { label: '45', minutes: 45, icon: '🐢', hint: 'Slow' },
];

// ── Status config — uses DelivriLi palette ────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:          { label: 'En attente',       bg: '#fdf2ee', text: '#a33a0c', dot: '#c1440e' },
  confirmed:        { label: 'Confirmée',         bg: '#eef4fb', text: '#184d77', dot: '#1e5b8c' },
  preparing:        { label: 'En préparation 🍳', bg: '#fdf8ee', text: '#b57a0a', dot: '#e8a93a' },
  ready:            { label: 'Prête ✅',           bg: '#edf3ec', text: '#3b5334', dot: '#4a6741' },
  picked_up:        { label: 'Récupérée 📦',       bg: '#fdf2ee', text: '#842f09', dot: '#c1440e' },
  out_for_delivery: { label: 'En livraison 🛵',    bg: '#eef4fb', text: '#123f62', dot: '#1e5b8c' },
  arrived:          { label: 'Arrivée 📍',         bg: '#edf3ec', text: '#3b5334', dot: '#4a6741' },
  completed:        { label: 'Terminée',           bg: '#f5ede0', text: '#a89070', dot: '#c9a882' },
  cancelled:        { label: 'Annulée',            bg: '#fbe0d3', text: '#842f09', dot: '#c1440e' },
};

const ORDER_TYPE_LABEL: Record<string, { label: string; icon: string }> = {
  delivery: { label: 'Livraison', icon: '🛵' },
  pickup:   { label: 'À emporter', icon: '🛍️' },
  dine_in:  { label: 'Sur place', icon: '🍽️' },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

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
        pct: 0, // not needed for ring calc here
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [readyAt]);
  return state;
}

// ── PrepTimePopup ─────────────────────────────────────────────────────────────

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
        .toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleOverlay = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Circular arc progress for the selected time
  const arcPct = minutes ? Math.min(100, (minutes / 60) * 100) : 0;
  const r = 44; const circ = 2 * Math.PI * r;
  const dash = circ * (arcPct / 100);

  return (
    <div ref={overlayRef} className="ptp-overlay" onClick={handleOverlay} role="dialog" aria-modal>
      <div className="ptp-sheet">

        {/* Moroccan ornament strip */}
        <div className="ptp-ornament" aria-hidden />

        {/* Header */}
        <div className="ptp-header">
          <div className="ptp-header-left">
            <div className="ptp-timer-badge">
              <Timer size={18} className="ptp-timer-icon" />
            </div>
            <div>
              <h2 className="ptp-title">وقت التحضير</h2>
              <p className="ptp-subtitle">Commande <strong>#{order.order_number}</strong> — {order.customer_name}</p>
            </div>
          </div>
          <button className="ptp-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Arc visualiser */}
        <div className="ptp-arc-wrap">
          <svg viewBox="0 0 100 100" className="ptp-arc-svg">
            {/* Track */}
            <circle cx="50" cy="50" r={r} fill="none" stroke="#e4d5c1" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={0}
              transform="rotate(-90 50 50)" />
            {/* Fill */}
            <circle cx="50" cy="50" r={r} fill="none"
              stroke={minutes ? '#c1440e' : '#e4d5c1'} strokeWidth="7" strokeLinecap="round"
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

        {/* Ready time preview */}
        {readyTime && (
          <div className="ptp-ready-preview">
            <Clock size={13} className="ptp-ready-icon" />
            Prête à <strong>{readyTime}</strong> · dans {minutes} min
          </div>
        )}

        {/* Preset grid */}
        <div className="ptp-preset-label">Délai rapide</div>
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

        {/* Custom stepper */}
        <div className="ptp-custom-wrap">
          <span className="ptp-custom-label">Personnaliser</span>
          <div className={`ptp-stepper ${useCustom ? 'ptp-stepper--active' : ''}`}>
            <button className="ptp-step"
              onClick={() => { setCustom(v => Math.max(5, v - 5)); setUseCustom(true); }}>
              <Minus size={14} />
            </button>
            <span className="ptp-step-val" onClick={() => setUseCustom(true)}>
              {custom}<span className="ptp-step-unit">min</span>
            </span>
            <button className="ptp-step"
              onClick={() => { setCustom(v => Math.min(120, v + 5)); setUseCustom(true); }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="ptp-footer">
          <button className="ptp-btn-cancel" onClick={onClose}>Annuler</button>
          <button
            className="ptp-btn-confirm"
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(minutes!)}
          >
            <Check size={15} />
            Accepter — {minutes ? `${minutes} min` : '…'}
          </button>
        </div>
      </div>

      <style>{`
        /* ── Overlay ── */
        .ptp-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(43,35,32,.72);
          backdrop-filter: blur(8px);
          display: flex; align-items: flex-end; justify-content: center;
          padding: 0;
          animation: ptp-overlay-in .2s ease;
        }
        @keyframes ptp-overlay-in { from{opacity:0} to{opacity:1} }

        /* ── Sheet (bottom sheet) ── */
        .ptp-sheet {
          width: 100%; max-width: 480px;
          background: #fdfaf5;
          border-radius: 28px 28px 0 0;
          box-shadow: 0 -16px 60px rgba(43,35,32,.22);
          overflow: hidden;
          animation: ptp-sheet-in .3s cubic-bezier(.16,1,.3,1);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @keyframes ptp-sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        /* ── Moroccan ornament strip ── */
        .ptp-ornament {
          height: 6px;
          background: repeating-linear-gradient(
            90deg,
            #c1440e  0px, #c1440e  8px,
            #e8a93a  8px, #e8a93a 16px,
            #1e5b8c 16px, #1e5b8c 24px,
            #e8a93a 24px, #e8a93a 32px
          );
        }

        /* ── Header ── */
        .ptp-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 18px 20px 10px; gap: 12px;
        }
        .ptp-header-left { display: flex; align-items: flex-start; gap: 12px; }
        .ptp-timer-badge {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, #c1440e, #a33a0c);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(193,68,14,.35);
        }
        .ptp-timer-icon { color: #e8a93a; }
        .ptp-title {
          font-family: 'Lalezar', 'Tajawal', sans-serif;
          font-size: 1.3rem; font-weight: 400;
          color: #2b2320; margin: 0 0 2px; line-height: 1.1;
        }
        .ptp-subtitle { font-size: .8rem; color: #a89070; margin: 0; }
        .ptp-subtitle strong { color: #6b4c38; }
        .ptp-close {
          width: 32px; height: 32px; border-radius: 8px; border: none; flex-shrink: 0;
          background: #f5ede0; color: #a89070; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .14s;
        }
        .ptp-close:hover { background: #e4d5c1; color: #2b2320; }

        /* ── Arc visualiser ── */
        .ptp-arc-wrap {
          position: relative; width: 120px; height: 120px;
          margin: 4px auto 8px;
        }
        .ptp-arc-svg { width: 100%; height: 100%; }
        .ptp-arc-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .ptp-arc-value {
          font-family: 'Lalezar', sans-serif;
          font-size: 2.2rem; font-weight: 400; color: #c1440e; line-height: 1;
        }
        .ptp-arc-unit {
          font-size: .72rem; font-weight: 700; color: #a89070;
          text-transform: uppercase; letter-spacing: .06em;
        }
        .ptp-arc-placeholder {
          font-family: 'Lalezar', sans-serif;
          font-size: 2.5rem; color: #e4d5c1;
        }

        /* ── Ready preview ── */
        .ptp-ready-preview {
          display: flex; align-items: center; gap: 7px;
          margin: 0 20px 14px;
          padding: 9px 14px;
          background: #edf3ec; border: 1.5px solid #cfe2cd;
          border-radius: 12px;
          font-size: .83rem; color: #3b5334;
          animation: ptp-overlay-in .25s ease;
        }
        .ptp-ready-icon { color: #4a6741; flex-shrink: 0; }
        .ptp-ready-preview strong { color: #2b2320; }

        /* ── Preset grid ── */
        .ptp-preset-label {
          padding: 0 20px 8px;
          font-size: .72rem; font-weight: 900;
          color: #a89070; text-transform: uppercase; letter-spacing: .08em;
        }
        .ptp-preset-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; padding: 0 20px;
        }
        .ptp-tile {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 2px;
          padding: 11px 6px;
          border-radius: 16px;
          border: 2px solid #e4d5c1;
          background: #fdfaf5;
          cursor: pointer;
          transition: all .15s cubic-bezier(.16,1,.3,1);
        }
        .ptp-tile:hover {
          border-color: #c1440e; background: #fdf2ee;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(193,68,14,.18);
        }
        .ptp-tile--active {
          border-color: #c1440e; background: #fdf2ee;
          box-shadow: 0 0 0 3px rgba(193,68,14,.2), 0 6px 18px rgba(193,68,14,.15);
          transform: translateY(-2px);
        }
        .ptp-tile-icon { font-size: 1.35rem; line-height: 1; }
        .ptp-tile-min {
          font-family: 'Lalezar', sans-serif;
          font-size: 1.4rem; color: #2b2320; line-height: 1;
        }
        .ptp-tile--active .ptp-tile-min { color: #c1440e; }
        .ptp-tile-hint { font-size: .65rem; color: #a89070; font-weight: 700; letter-spacing: .05em; }
        .ptp-tile--active .ptp-tile-hint { color: #d96b3f; }

        /* ── Custom stepper ── */
        .ptp-custom-wrap {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px 6px;
        }
        .ptp-custom-label {
          font-size: .72rem; font-weight: 900;
          color: #a89070; text-transform: uppercase; letter-spacing: .08em;
        }
        .ptp-stepper {
          display: flex; align-items: center; gap: 0;
          border: 2px solid #e4d5c1; border-radius: 14px;
          background: #fdfaf5; overflow: hidden;
          transition: border-color .15s;
        }
        .ptp-stepper--active { border-color: #c1440e; }
        .ptp-step {
          width: 38px; height: 38px;
          border: none; background: transparent;
          color: #6b4c38; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .12s;
        }
        .ptp-step:hover { background: #f5ede0; }
        .ptp-step-val {
          min-width: 64px; text-align: center;
          font-family: 'Lalezar', sans-serif;
          font-size: 1.3rem; color: #2b2320; line-height: 1;
          cursor: pointer; padding: 0 4px;
        }
        .ptp-stepper--active .ptp-step-val { color: #c1440e; }
        .ptp-step-unit {
          font-family: 'Tajawal', sans-serif;
          font-size: .7rem; color: #a89070;
          font-weight: 700; margin-left: 2px;
        }

        /* ── Footer ── */
        .ptp-footer {
          display: flex; gap: 10px;
          padding: 16px 20px 20px;
        }
        .ptp-btn-cancel {
          flex: 0 0 auto; padding: 0 20px; height: 50px;
          border-radius: 14px;
          border: 2px solid #e4d5c1; background: #fdfaf5;
          color: #a89070; font-family: 'Tajawal', sans-serif;
          font-weight: 700; font-size: .9rem; cursor: pointer;
          transition: all .13s;
        }
        .ptp-btn-cancel:hover { border-color: #c9a882; color: #6b4c38; }
        .ptp-btn-confirm {
          flex: 1; height: 50px;
          border-radius: 14px; border: none;
          background: linear-gradient(135deg, #c1440e 0%, #a33a0c 100%);
          color: #fff;
          font-family: 'Lalezar', sans-serif; font-size: 1.05rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 6px 20px rgba(193,68,14,.38);
          transition: all .14s;
        }
        .ptp-btn-confirm:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(193,68,14,.5);
          transform: translateY(-1px);
        }
        .ptp-btn-confirm:active:not(:disabled) { transform: translateY(0); }
        .ptp-btn-confirm:disabled {
          opacity: .45; cursor: not-allowed;
          background: #e4d5c1; box-shadow: none; color: #a89070;
        }

        @media (min-width: 480px) {
          .ptp-overlay { align-items: center; padding: 20px; }
          .ptp-sheet { border-radius: 24px; }
        }
      `}</style>
    </div>
  );
}

// ── CountdownBadge ────────────────────────────────────────────────────────────

function CountdownBadge({ readyAt, prepMinutes }: { readyAt: string; prepMinutes: number }) {
  const cd = useCountdown(readyAt);
  if (!cd) return null;

  if (cd.overdue) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderRadius: 12,
        background: '#fdf2ee', border: '1.5px solid #f5bda5',
        fontSize: '.78rem', fontWeight: 700, color: '#a33a0c',
        marginTop: 6,
      }}>
        <AlertTriangle size={13} style={{ color: '#c1440e', flexShrink: 0 }} />
        En retard · prévu {prepMinutes} min
      </div>
    );
  }

  const totalSec = prepMinutes * 60;
  const remainSec = cd.min * 60 + cd.sec;
  const pct = Math.max(0, Math.min(100, (remainSec / totalSec) * 100));
  const barColor = pct > 40 ? '#4a6741' : pct > 15 ? '#e8a93a' : '#c1440e';
  const readyHHmm = new Date(readyAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      marginTop: 8, padding: '8px 12px 10px',
      borderRadius: 12, background: '#edf3ec',
      border: '1.5px solid #cfe2cd',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Timer size={12} style={{ color: '#4a6741', flexShrink: 0 }} />
        <span style={{ fontSize: '.82rem', fontWeight: 800, color: '#2b2320', fontFamily: "'Lalezar', sans-serif" }}>
          {cd.min}:{String(cd.sec).padStart(2, '0')}
        </span>
        <span style={{ fontSize: '.73rem', color: '#6a9466', fontWeight: 600 }}>
          restant · prête à {readyHHmm}
        </span>
      </div>
      <div style={{ width: '100%', height: 5, borderRadius: 99, background: '#cfe2cd', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
          transition: 'width 1s linear, background .3s',
        }} />
      </div>
    </div>
  );
}

// ── OrderCard ─────────────────────────────────────────────────────────────────

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const isDelivery = order.order_type === 'delivery';
  const elapsed    = useElapsedTime(order.created_at);
  const ageMin     = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent   = ageMin >= 15 && !['completed', 'cancelled', 'ready'].includes(order.status);
  const [showPrepPopup, setShowPrepPopup] = useState(false);

  const status = STATUS_CONFIG[order.status];
  const typeInfo = ORDER_TYPE_LABEL[order.order_type] ?? { label: order.order_type, icon: '📦' };

  const getNextStatus = (s: OrderStatus): OrderStatus | null => {
    const map: Partial<Record<OrderStatus, OrderStatus>> = {
      pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed',
    };
    return map[s] ?? null;
  };
  const nextStatus = getNextStatus(order.status);

  const nextLabel =
    nextStatus === 'confirmed' ? 'Accepter' :
    nextStatus === 'preparing' ? 'Commencer' :
    nextStatus === 'ready'     ? 'Marquer Prête' :
    nextStatus === 'completed' ? 'Terminer' : '';

  const nextIcon =
    nextStatus === 'confirmed'  ? <Check size={15} /> :
    nextStatus === 'preparing'  ? <Package size={15} /> :
    nextStatus === 'ready'      ? <CheckCircle2 size={15} /> : null;

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
      {/* ── Card ── */}
      <div style={{
        background: '#fdfaf5',
        border: `1.5px solid ${isUrgent ? '#f5bda5' : '#e4d5c1'}`,
        borderRadius: 20,
        boxShadow: isUrgent
          ? '0 0 0 0 rgba(193,68,14,0), 0 4px 16px rgba(43,35,32,.10)'
          : '0 2px 8px rgba(43,35,32,.08)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Tajawal', system-ui, sans-serif",
        animation: isUrgent ? 'oc-urgent-pulse 2s ease-in-out infinite' : undefined,
        transition: 'box-shadow .2s',
      }}>

        {/* Moroccan ornament top bar */}
        <div style={{
          height: 4,
          background: 'repeating-linear-gradient(90deg, #c1440e 0px, #c1440e 6px, #e8a93a 6px, #e8a93a 12px, #1e5b8c 12px, #1e5b8c 18px, #e8a93a 18px, #e8a93a 24px)',
          opacity: isUrgent ? 1 : 0.6,
        }} />

        {/* ── Header ── */}
        <div style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid #f0e6d8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
        }}>
          <div style={{ flex: 1 }}>
            {/* Order number row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontFamily: "'Lalezar', sans-serif",
                fontSize: '1.2rem', color: '#2b2320', lineHeight: 1,
              }}>#{order.order_number}</span>

              {/* Status pill */}
              <span style={{
                padding: '3px 9px', borderRadius: 99,
                fontSize: '.68rem', fontWeight: 800,
                letterSpacing: '.04em', textTransform: 'uppercase',
                background: status.bg, color: status.text,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: status.dot, flexShrink: 0,
                }} />
                {status.label}
              </span>

              {/* Urgent badge */}
              {isUrgent && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 8px', borderRadius: 99,
                  fontSize: '.68rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, #c1440e, #a33a0c)',
                  color: '#fff',
                }}>
                  <Flame size={10} /> Urgent
                </span>
              )}
            </div>

            {/* Time row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a89070', fontSize: '.73rem' }}>
              <Clock size={11} />
              <span>{elapsed}</span>
              <span style={{ color: '#e4d5c1' }}>·</span>
              <span>{new Date(order.created_at).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Amount + type */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{
              fontFamily: "'Lalezar', sans-serif",
              fontSize: '1.25rem', color: '#2b2320', margin: 0, lineHeight: 1,
            }}>
              {Number(order.total_amount).toFixed(2)}
              <span style={{ fontSize: '.7rem', color: '#a89070', fontFamily: "'Tajawal', sans-serif" }}> DH</span>
            </p>
            <p style={{ fontSize: '.72rem', color: '#a89070', margin: '3px 0 0' }}>
              {typeInfo.icon} {typeInfo.label}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Customer name */}
          <p style={{ fontWeight: 800, color: '#2b2320', fontSize: '.9rem', margin: 0 }}>
            {order.customer_name}
          </p>

          {/* Phone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={12} style={{ color: '#a89070', flexShrink: 0 }} />
            <a href={`tel:${order.customer_phone}`} style={{
              fontSize: '.78rem', color: '#6b4c38', fontWeight: 600,
              textDecoration: 'none', transition: 'color .12s',
            }}>
              {order.customer_phone}
            </a>
          </div>

          {/* Address */}
          {isDelivery && order.delivery_address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <MapPin size={12} style={{ color: '#a89070', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: '.76rem', color: '#6b4c38', lineHeight: 1.4 }}>
                {order.delivery_address}
              </span>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div style={{
              padding: '7px 10px', borderRadius: 10,
              background: '#fdf8ee', border: '1px solid #f5d06a',
              fontSize: '.75rem', color: '#6b4c38', lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 800 }}>📝</span> {order.notes}
            </div>
          )}

          {/* Countdown badge */}
          {showCountdown && (
            <CountdownBadge
              readyAt={order.ready_at!}
              prepMinutes={order.estimated_prep_minutes!}
            />
          )}
        </div>

        {/* ── Quick actions ── */}
        <div style={{ display: 'flex', gap: 8, padding: '4px 14px 6px' }}>
          <button
            onClick={() => window.print()}
            style={{
              flex: 1, height: 36, borderRadius: 10, cursor: 'pointer',
              border: '1.5px solid #e4d5c1', background: '#fdfaf5',
              color: '#a89070', fontSize: '.74rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontFamily: "'Tajawal', sans-serif", transition: 'all .12s',
            }}
          >
            <Printer size={12} /> Ticket
          </button>
          <a
            href={`tel:${order.customer_phone}`}
            style={{
              flex: 1, height: 36, borderRadius: 10, cursor: 'pointer',
              border: '1.5px solid #d0e4f5', background: '#eef4fb',
              color: '#1e5b8c', fontSize: '.74rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontFamily: "'Tajawal', sans-serif", textDecoration: 'none', transition: 'all .12s',
            }}
          >
            <PhoneCall size={12} /> Appeler
          </a>
          {isDelivery && (
            <div style={{
              flex: 1, height: 36, borderRadius: 10,
              border: '1.5px solid #cfe2cd', background: '#edf3ec',
              color: '#3b5334', fontSize: '.74rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Bike size={12} /> Livraison
            </div>
          )}
        </div>

        {/* ── Main action ── */}
        <div style={{ padding: '6px 14px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {nextStatus && (
            <button
              id={`action-${order.id}`}
              onClick={handleMainAction}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none',
                background: nextStatus === 'confirmed'
                  ? 'linear-gradient(135deg, #c1440e, #a33a0c)'
                  : nextStatus === 'preparing'
                  ? 'linear-gradient(135deg, #1e5b8c, #123f62)'
                  : nextStatus === 'ready'
                  ? 'linear-gradient(135deg, #4a6741, #3b5334)'
                  : 'linear-gradient(135deg, #2b2320, #1a1512)',
                color: nextStatus === 'confirmed' ? '#fdf2ee' : '#fff',
                fontFamily: "'Lalezar', sans-serif",
                fontSize: '1.05rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: nextStatus === 'confirmed'
                  ? '0 6px 20px rgba(193,68,14,.40)'
                  : nextStatus === 'preparing'
                  ? '0 6px 20px rgba(30,91,140,.35)'
                  : '0 6px 20px rgba(74,103,65,.30)',
                transition: 'all .14s',
              }}
            >
              {nextIcon}
              {nextLabel}
              {nextStatus === 'confirmed' && (
                <span style={{
                  marginLeft: 4, fontSize: '.72rem',
                  background: 'rgba(232,169,58,.25)',
                  padding: '2px 8px', borderRadius: 99,
                  color: '#e8a93a', fontFamily: "'Tajawal', sans-serif",
                  fontWeight: 800,
                }}>
                  + Délai
                </span>
              )}
            </button>
          )}
          {order.status === 'pending' && (
            <button
              id={`cancel-${order.id}`}
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              style={{
                width: '100%', height: 38, borderRadius: 12, cursor: 'pointer',
                border: '1.5px solid #f5bda5', background: 'transparent',
                color: '#a33a0c', fontFamily: "'Tajawal', sans-serif",
                fontWeight: 700, fontSize: '.82rem', transition: 'all .12s',
              }}
            >
              Refuser la commande
            </button>
          )}
        </div>
      </div>

      {/* Urgent pulse animation */}
      <style>{`
        @keyframes oc-urgent-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(193,68,14,.0), 0 4px 16px rgba(43,35,32,.10); }
          50%       { box-shadow: 0 0 0 5px rgba(193,68,14,.15), 0 4px 16px rgba(43,35,32,.10); }
        }
      `}</style>

      {/* ── Prep time popup ── */}
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
