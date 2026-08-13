"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";
import { OrderStatusTimeline } from "@/components/customer/OrderStatusTimeline";
import { Phone, MapPin, ChevronLeft, Star } from "lucide-react";
import Link from "next/link";

const LiveTrackingMap = dynamic(
  () => import("@/components/customer/LiveTrackingMap").then((m) => m.LiveTrackingMap),
  { ssr: false, loading: () => <div className="w-full h-52 rounded-3xl bg-slate-100 animate-pulse" /> }
);

interface RatingModalProps {
  onSubmit: (stars: number) => void;
}

function RatingModal({ onSubmit }: RatingModalProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-slate-900 mb-1">Delivered!</h2>
        <p className="text-slate-500 text-sm mb-6">How was your experience?</p>
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(star)}
              className="transition-transform active:scale-90"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= (hovered || selected)
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-200 fill-slate-200"
                }`}
              />
            </button>
          ))}
        </div>
        <button
          disabled={selected === 0}
          onClick={() => onSubmit(selected)}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          Submit Rating
        </button>
      </div>
    </div>
  );
}

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rated, setRated] = useState(false);

  const DELIVERY_ACTIVE_STATUSES = ['picked_up', 'out_for_delivery', 'arrived'];

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.orderId)
        .single();
      if (!error && data) {
        setOrder(data);
        setLoading(false);
        return;
      }
    } catch {}

    // Fallback to local storage
    try {
      const local = localStorage.getItem(`local_order_${params.orderId}`);
      if (local) {
        setOrder(JSON.parse(local));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();

    // Realtime subscription — update status live from Supabase
    const channel = supabase
      .channel(`order:${params.orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${params.orderId}` },
        (payload) => {
          const updated = payload.new as Order;
          setOrder(updated);
          // Keep local storage in sync
          try {
            localStorage.setItem(`local_order_${params.orderId}`, JSON.stringify(updated));
          } catch {}
          if (updated.status === "completed") {
            setTimeout(() => setShowRating(true), 1500);
          }
        }
      )
      .subscribe();

    // Poll localStorage every 3 seconds for local order status updates
    const localPoll = setInterval(() => {
      try {
        const raw = localStorage.getItem(`local_order_${params.orderId}`);
        if (raw) {
          const local = JSON.parse(raw) as Order;
          setOrder(prev => {
            if (!prev || local.status !== prev.status) return local;
            return prev;
          });
          if (local.status === 'completed' && !rated) {
            setTimeout(() => setShowRating(true), 1500);
          }
        }
      } catch {}
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(localPoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.orderId]);

  const handleRating = (stars: number) => {
    console.log(`Customer rated ${stars} stars for order ${params.orderId}`);
    setShowRating(false);
    setRated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl">🔍</p>
        <h2 className="text-xl font-black text-slate-800">Order not found</h2>
        <p className="text-slate-500 text-sm">Check your order link and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Rating Modal */}
      {showRating && !rated && <RatingModal onSubmit={handleRating} />}

      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-black text-slate-900 leading-tight">Order #{order.order_number}</h1>
          <p className="text-slate-400 text-xs">{order.total_amount.toFixed(2)} DH</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Live map — shown when courier is actively delivering */}
        {order.order_type === "delivery" && DELIVERY_ACTIVE_STATUSES.includes(order.status) && (
          <LiveTrackingMap
            deliveryAddress={order.delivery_address ?? ""}
            orderStatus={order.status}
          />
        )}

        {/* Status Timeline */}
        <OrderStatusTimeline status={order.status} createdAt={order.created_at} />

        {/* Order summary card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
          <h3 className="font-black text-slate-900">Order Details</h3>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Delivery to</p>
                <p className="text-slate-800 font-semibold text-sm">{order.delivery_address || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Customer</p>
                <p className="text-slate-800 font-semibold text-sm">{order.customer_name} • {order.customer_phone}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>{order.subtotal.toFixed(2)} DH</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Delivery fee</span><span>{order.delivery_fee.toFixed(2)} DH</span>
              </div>
            )}
            <div className="flex justify-between font-black text-slate-900">
              <span>Total</span><span className="text-emerald-600">{order.total_amount.toFixed(2)} DH</span>
            </div>
          </div>
        </div>

        {/* Rating thanks */}
        {rated && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">⭐</p>
            <p className="font-bold text-amber-800">Thank you for your rating!</p>
            <p className="text-amber-600 text-sm">Your feedback helps us improve.</p>
          </div>
        )}
      </div>
    </div>
  );
}
