import dynamic from "next/dynamic";
import { Order } from "@/types";
import { Phone, MapPin, Navigation, CheckCircle2 } from "lucide-react";

const AnimatedMap = dynamic(
  () => import("./AnimatedMap").then((mod) => mod.AnimatedMap),
  { ssr: false, loading: () => <div className="w-full h-48 bg-slate-800 rounded-2xl animate-pulse" /> }
);

interface DeliveryJobCardProps {
  order: Order;
  onMarkDelivered: (orderId: string) => void;
}

export function DeliveryJobCard({ order, onMarkDelivered }: DeliveryJobCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
      {/* Animated Map Section */}
      <div className="p-3 pb-0">
        <AnimatedMap address={order.delivery_address || ''} />
      </div>
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</span>
          <p className="font-bold text-lg text-slate-900">#{order.order_number}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
          <p className="font-bold text-lg text-emerald-600">{order.total_amount.toFixed(2)} DH</p>
        </div>
      </div>
      
      <div className="p-5">
        <div className="mb-4">
          <h3 className="font-bold text-slate-900 mb-2">Customer Details</h3>
          <p className="text-slate-700 font-medium">{order.customer_name}</p>
          <a 
            href={`tel:${order.customer_phone}`} 
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium active:bg-indigo-100 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call {order.customer_phone}
          </a>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-slate-900 mb-2">Delivery Address</h3>
          <div className="flex items-start gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl">
            <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{order.delivery_address || 'No address provided'}</span>
          </div>
          {order.notes && (
            <div className="mt-3 bg-amber-50 text-amber-800 p-3 rounded-xl text-sm border border-amber-100">
              <span className="font-bold">Instructions:</span> {order.notes}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-medium transition-colors active:scale-[0.98]"
          >
            <Navigation className="w-5 h-5" />
            Navigate
          </a>
          <button
            onClick={() => onMarkDelivered(order.id)}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-medium transition-colors active:scale-[0.98]"
          >
            <CheckCircle2 className="w-5 h-5" />
            Delivered
          </button>
        </div>
      </div>
    </div>
  );
}
