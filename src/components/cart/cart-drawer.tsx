'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import { Restaurant, CustomerDetails, OrderType } from '@/types';
import { generateWhatsAppOrderUrl } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';
import {
  X, Trash2, Plus, Minus, Bike, ShoppingBag, Store,
  Loader2, Tag, ChevronRight, User, Phone, MapPin, FileText
} from 'lucide-react';

interface CartDrawerProps {
  restaurant: Restaurant;
  isOpen: boolean;
  onClose: () => void;
}

const PROMO_CODES: Record<string, number> = {
  WELCOME10: 10,
  SAVE20: 20,
  FREESHIP: 0,
};

export function CartDrawer({ restaurant, isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    orderType: 'delivery',
    tableNumber: '',
    deliveryAddress: '',
    notes: '',
  });

  if (!isOpen) return null;

  const deliveryFee = customer.orderType === 'delivery' ? restaurant.delivery_fee : 0;
  const promoDiscount = appliedPromo ? appliedPromo.discount : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - promoDiscount);

  // Progress towards free delivery
  const FREE_DELIVERY_THRESHOLD = 100;
  const progressPct = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  const handleApplyPromo = () => {
    const code = promoCode.toUpperCase().trim();
    if (PROMO_CODES[code] !== undefined) {
      setAppliedPromo({ code, discount: PROMO_CODES[code] });
      setPromoError('');
    } else {
      setPromoError('Invalid promo code. Try WELCOME10');
      setAppliedPromo(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name || !customer.phone) {
      return;
    }
    setSubmitting(true);
    try {
      let orderId = `ord-${Date.now()}`;
      let orderNumber = Math.floor(1000 + Math.random() * 9000);

      // Attempt Supabase insert
      try {
        const { data, error } = await supabase.from('orders').insert({
          restaurant_id: restaurant.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          order_type: customer.orderType,
          delivery_address: customer.deliveryAddress || null,
          notes: customer.notes || null,
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: grandTotal,
          status: 'pending',
        }).select().single();

        if (!error && data?.id) {
          orderId = data.id;
          orderNumber = data.order_number || orderNumber;
        }
      } catch (dbErr) {
        console.warn('Supabase DB insert warning (using local fallback):', dbErr);
      }

      // Always save order to local storage for tracking page fallback
      const localOrder = {
        id: orderId,
        restaurant_id: restaurant.id,
        order_number: orderNumber,
        customer_name: customer.name,
        customer_phone: customer.phone,
        order_type: customer.orderType,
        delivery_address: customer.deliveryAddress || null,
        notes: customer.notes || null,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: grandTotal,
        status: 'pending',
        whatsapp_sent: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(`local_order_${orderId}`, JSON.stringify(localOrder));
        // Also add to local order history array
        const existing = JSON.parse(localStorage.getItem('local_orders_list') || '[]');
        localStorage.setItem('local_orders_list', JSON.stringify([localOrder, ...existing]));
      } catch {}

      // Send WhatsApp message
      const waUrl = generateWhatsAppOrderUrl(restaurant, items, customer, subtotal, deliveryFee, grandTotal);
      window.open(waUrl, '_blank');

      clearCart();
      onClose();
      router.push(`/track/${orderId}`);
    } catch (err) {
      console.error('Failed to place order:', err);
      alert('Could not process order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const orderTypes: { id: OrderType; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { id: 'delivery', label: 'Delivery',  icon: Bike,        desc: `~${restaurant.delivery_fee} DH fee` },
    { id: 'pickup',   label: 'Takeaway',  icon: ShoppingBag, desc: 'Free pickup' },
    { id: 'dine_in',  label: 'Dine-In',   icon: Store,       desc: 'Table service' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-right" style={{background:'#fdfaf5'}}>

        {/* ── Header ────────────────────────────────── */}
        <div className="p-4 border-b border-[#e4d5c1] flex items-center justify-between flex-shrink-0" style={{background:'linear-gradient(135deg,#5c2006,#c1440e)'}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#e8a93a] rounded-xl flex items-center justify-center shadow-md">
              <ShoppingBag className="w-5 h-5 text-[#2b2320]" />
            </div>
            <div>
              <h2 className="font-black text-base text-white" style={{fontFamily:'var(--font-heading,Lalezar),sans-serif'}}>طلبك — Your Order</h2>
              <p className="text-orange-200 text-xs">{items.length} item{items.length !== 1 ? 's' : ''} · {restaurant.name}</p>
            </div>
          </div>
          <button id="close-cart" onClick={onClose} className="p-2 text-orange-200 hover:text-white rounded-xl hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable content ────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl animate-float" style={{background:'#f5ede0'}}>
                🛒
              </div>
              <div>
                <h3 className="font-bold text-[#2b2320] text-lg">سلتك فارغة</h3>
                <p className="text-[#a89070] text-sm mt-1">Add some delicious Moroccan dishes to get started</p>
              </div>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 btn-primary text-sm">
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-4">

              {/* Free delivery progress */}
              {customer.orderType === 'delivery' && subtotal < FREE_DELIVERY_THRESHOLD && (
                <div className="border border-[#e4d5c1] rounded-2xl p-3.5" style={{background:'#fdf2ee'}}>
                  <p className="text-xs font-semibold text-[#842f09] mb-2">
                    Add <strong>{remaining.toFixed(0)} DH</strong> more for free delivery 🚀
                  </p>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{background:'#f5bda5'}}>
                    <div
                      className="h-full rounded-full progress-bar transition-all duration-500"
                      style={{ width: `${progressPct}%`, background:'#e8a93a', '--prog-width': `${progressPct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              )}
              {customer.orderType === 'delivery' && subtotal >= FREE_DELIVERY_THRESHOLD && (
                <div className="border border-[#cfe2cd] rounded-2xl p-3.5 flex items-center gap-2 text-xs font-bold" style={{background:'#edf3ec',color:'#3b5334'}}>
                  <span className="text-base">🎉</span> You qualify for free delivery!
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.cartItemId} className="p-3.5 rounded-2xl border border-[#e4d5c1] animate-slide-up" style={{background:'#f5ede0'}}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#2b2320] text-sm truncate">{item.menuItem.name}</h4>
                        {item.selectedModifiers.length > 0 && (
                          <p className="text-xs text-[#a89070] mt-0.5 line-clamp-1">
                            {item.selectedModifiers.map(m => m.modifierName).join(', ')}
                          </p>
                        )}
                        {item.instructions && (
                          <p className="text-xs text-[#c1440e] mt-0.5 italic">&ldquo;{item.instructions}&rdquo;</p>
                        )}
                      </div>
                      <span className="font-extrabold text-sm text-[#e8a93a] flex-shrink-0">
                        {item.totalPrice.toFixed(2)} {restaurant.currency_symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5">
                      <button onClick={() => removeItem(item.cartItemId)} className="flex items-center gap-1 text-xs text-[#a89070] hover:text-rose-500 transition font-medium">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                      <div className="flex items-center rounded-xl p-0.5 gap-1 border border-[#e4d5c1]" style={{background:'#fdfaf5'}}>
                        <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-7 h-7 flex items-center justify-center text-[#2b2320] hover:bg-[#f5ede0] rounded-lg transition">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-[#2b2320]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-7 h-7 flex items-center justify-center text-[#2b2320] hover:bg-[#f5ede0] rounded-lg transition">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="border border-[#e4d5c1] rounded-2xl p-3.5">
                <p className="text-xs font-bold text-[#2b2320] mb-2 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-[#1e5b8c]" /> Promo Code</p>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-xl px-3 py-2 border border-[#cfe2cd]" style={{background:'#edf3ec'}}>
                    <span className="text-xs font-bold text-[#3b5334]">✓ {appliedPromo.code} applied — {appliedPromo.discount} DH off</span>
                    <button onClick={() => setAppliedPromo(null)} className="text-[#a89070] hover:text-[#2b2320]"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="promo-input"
                      type="text"
                      placeholder="Enter code (try WELCOME10)"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                      className="flex-1 px-3 py-2 text-xs border border-[#e4d5c1] rounded-xl focus:ring-2 focus:border-[#e8a93a] focus:outline-none" style={{background:'#fdfaf5'}}
                    />
                    <button
                      id="apply-promo"
                      onClick={handleApplyPromo}
                      className="px-3 py-2 btn-cobalt text-xs"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {promoError && <p className="text-xs text-rose-500 mt-1.5 font-medium">{promoError}</p>}
              </div>

              {/* Checkout Form */}
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4 pt-2 border-t border-[#e4d5c1]">
                <h3 className="font-black text-[#2b2320] text-sm">تفاصيل الطلب — Order Details</h3>

                {/* Order Type */}
                <div className="grid grid-cols-3 gap-2">
                  {orderTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      id={`type-${type.id}`}
                      onClick={() => setCustomer({ ...customer, orderType: type.id })}
                      className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border-2 transition-all ${
                        customer.orderType === type.id
                          ? 'border-[#c1440e] text-[#c1440e]'
                          : 'border-[#e4d5c1] text-[#a89070] hover:border-[#c1440e]/40'
                      }`}
                      style={customer.orderType === type.id ? {background:'#fdf2ee'} : {background:'#fdfaf5'}}
                    >
                      <type.icon className="w-5 h-5" />
                      <span>{type.label}</span>
                      <span className={`text-[9px] ${customer.orderType === type.id ? 'text-[#c1440e]' : 'text-[#a89070]'}`}>{type.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Input fields */}
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89070]" />
                    <input
                      id="customer-name"
                      type="text"
                      placeholder="Full Name *"
                      required
                      value={customer.name}
                      onChange={e => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 text-sm border-2 border-[#e4d5c1] rounded-xl focus:ring-0 focus:border-[#c1440e] outline-none transition"
                      style={{background:'#fdfaf5'}}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89070]" />
                    <input
                      id="customer-phone"
                      type="tel"
                      placeholder="Phone (WhatsApp) *"
                      required
                      value={customer.phone}
                      onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 text-sm border-2 border-[#e4d5c1] rounded-xl focus:ring-0 focus:border-[#c1440e] outline-none transition"
                      style={{background:'#fdfaf5'}}
                    />
                  </div>

                  {customer.orderType === 'delivery' && (
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[#a89070]" />
                      <textarea
                        id="delivery-address"
                        rows={2}
                        placeholder="Delivery Address (Street, Building, Flat) *"
                        required
                        value={customer.deliveryAddress}
                        onChange={e => setCustomer({ ...customer, deliveryAddress: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 text-sm border-2 border-[#e4d5c1] rounded-xl focus:ring-0 focus:border-[#c1440e] outline-none transition resize-none"
                        style={{background:'#fdfaf5'}}
                      />
                    </div>
                  )}

                  {customer.orderType === 'dine_in' && (
                    <div className="relative">
                      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89070]" />
                      <input
                        id="table-number"
                        type="text"
                        placeholder="Table Number *"
                        required
                        value={customer.tableNumber}
                        onChange={e => setCustomer({ ...customer, tableNumber: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 text-sm border-2 border-[#e4d5c1] rounded-xl focus:ring-0 focus:border-[#c1440e] outline-none transition"
                        style={{background:'#fdfaf5'}}
                      />
                    </div>
                  )}

                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-[#a89070]" />
                    <textarea
                      id="order-notes"
                      rows={2}
                      placeholder="Order notes (optional)"
                      value={customer.notes}
                      onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 text-sm border-2 border-[#e4d5c1] rounded-xl focus:ring-0 focus:border-[#c1440e] outline-none transition resize-none"
                      style={{background:'#fdfaf5'}}
                    />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────── */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[#e4d5c1] space-y-3 flex-shrink-0" style={{background:'#fdfaf5'}}>
            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#a89070]">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} {restaurant.currency_symbol}</span>
              </div>
              {customer.orderType === 'delivery' && (
                <div className="flex justify-between text-[#a89070]">
                  <span>Delivery Fee</span>
                  <span>{subtotal >= FREE_DELIVERY_THRESHOLD ? <span className="text-[#4a6741] font-bold">FREE</span> : `${deliveryFee.toFixed(2)} ${restaurant.currency_symbol}`}</span>
                </div>
              )}
              {appliedPromo && appliedPromo.discount > 0 && (
                <div className="flex justify-between font-semibold" style={{color:'#4a6741'}}>
                  <span>Promo ({appliedPromo.code})</span>
                  <span>-{appliedPromo.discount.toFixed(2)} {restaurant.currency_symbol}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base text-[#2b2320] pt-2 border-t border-[#e4d5c1]">
                <span>Total</span>
                <span style={{color:'#c1440e'}}>{grandTotal.toFixed(2)} {restaurant.currency_symbol}</span>
              </div>
            </div>

            {/* Place Order */}
            <button
              id="place-order-btn"
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full btn-primary active:scale-[0.98] py-4 px-5 rounded-2xl text-sm flex items-center justify-between transition disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span className="mx-auto">Placing Order…</span></>
              ) : (
                <>
                  <span>🇲🇦 Place Order via WhatsApp</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400">By placing an order you agree to our terms of service</p>
          </div>
        )}
      </div>
    </div>
  );
}
