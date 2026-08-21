'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import { Restaurant, CustomerDetails, OrderType } from '@/types';
import { generateWhatsAppOrderUrl } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';
import type { DeliveryLocation } from '@/components/customer/DeliveryLocationPicker';
import {
  X, Trash2, Plus, Minus, Bike, ShoppingBag, Store,
  Loader2, Tag, ChevronRight, User, Phone, MapPin, FileText, Navigation, Utensils
} from 'lucide-react';

const DeliveryLocationPicker = dynamic(
  () => import('@/components/customer/DeliveryLocationPicker'),
  { ssr: false }
);

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
  const [submitting, setSubmitting]     = useState(false);
  const [promoCode, setPromoCode]       = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError]     = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [dropoffGeo, setDropoffGeo]     = useState<DeliveryLocation | null>(null);
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    orderType: 'delivery',
    tableNumber: '',
    deliveryAddress: '',
    notes: '',
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!showSuggestions || !customer.deliveryAddress || customer.deliveryAddress.length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customer.deliveryAddress)},Morocco&addressdetails=1&limit=5`);
        const data = await res.json();
        setSuggestions(data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [customer.deliveryAddress, showSuggestions]);

  if (!isOpen) return null;

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  let calculatedDeliveryFee = 0;
  let distanceKm = 0;
  if (customer.orderType === 'delivery') {
    // Advanced Pricing Model
    const BASE_FEE = restaurant.delivery_fee || 8;
    const PER_KM_RATE = restaurant.delivery_fee_per_km || 2;
    const INCLUDED_KM = 2;
    const MIN_FEE = 10;
    const MAX_FEE = 25;

    // Default to min fee if no address is set yet
    calculatedDeliveryFee = MIN_FEE;

    if (dropoffGeo && restaurant.latitude && restaurant.longitude) {
      distanceKm = getDistanceKm(restaurant.latitude, restaurant.longitude, dropoffGeo.lat, dropoffGeo.lng);
      
      let rawFee = BASE_FEE;
      if (distanceKm > INCLUDED_KM) {
        rawFee += (distanceKm - INCLUDED_KM) * PER_KM_RATE;
      }
      
      calculatedDeliveryFee = Math.max(MIN_FEE, Math.min(MAX_FEE, rawFee));
    }
  }

  const deliveryFee = calculatedDeliveryFee;
  const promoDiscount = appliedPromo ? appliedPromo.discount : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - promoDiscount);

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

      try {
        const { data, error } = await supabase.from('orders').insert({
          restaurant_id: restaurant.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          order_type: customer.orderType,
          delivery_address: dropoffGeo?.address || customer.deliveryAddress || null,
          notes: customer.notes || null,
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: grandTotal,
          status: 'pending',
          ...(dropoffGeo ? {
            dropoff_location: `SRID=4326;POINT(${dropoffGeo.lng} ${dropoffGeo.lat})`,
          } : {}),
        }).select().single();

        if (!error && data?.id) {
          orderId = data.id;
          orderNumber = data.order_number || orderNumber;
        }
      } catch (dbErr) {
        console.warn('Supabase DB insert warning (using local fallback):', dbErr);
      }

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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(`local_order_${orderId}`, JSON.stringify(localOrder));
        const existing = JSON.parse(localStorage.getItem('local_orders_list') || '[]');
        localStorage.setItem('local_orders_list', JSON.stringify([localOrder, ...existing]));
      } catch {}

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

  const orderTypes = [
    { id: 'delivery', label: 'Delivery',  icon: Bike,        desc: `~${restaurant.delivery_fee} DH fee` },
    { id: 'pickup',   label: 'Takeaway',  icon: ShoppingBag, desc: 'Free pickup' },
    { id: 'dine_in',  label: 'Dine-In',   icon: Store,       desc: 'Table service' },
  ] as const;

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in font-body">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-right bg-[#fef2f2]">

        {/* ── Header ────────────────────────────────── */}
        <div className="p-5 border-b border-red-900/10 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-red-950 via-red-800 to-red-600 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-inner">
              <ShoppingBag className="w-6 h-6 text-red-950" />
            </div>
            <div>
              <h2 className="font-black text-xl text-white font-heading tracking-wide">Your Order</h2>
              <p className="text-red-100 text-sm font-medium">{items.length} item{items.length !== 1 ? 's' : ''} · {restaurant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white hover:text-yellow-400 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ── Scrollable content ────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5">
              <div className="w-24 h-24 rounded-[24px] bg-white border border-red-100 shadow-sm flex items-center justify-center text-red-300">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-bold text-red-950 text-xl font-heading mb-1">Your cart is empty</h3>
                <p className="text-red-900/60 text-sm font-medium">Add some delicious items to get started.</p>
              </div>
              <button onClick={onClose} className="mt-4 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors">
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-5">

              {/* Free delivery progress */}
              {customer.orderType === 'delivery' && subtotal < FREE_DELIVERY_THRESHOLD && (
                <div className="border border-red-200 rounded-2xl p-4 bg-white shadow-sm">
                  <p className="text-sm font-bold text-red-900 mb-2.5">
                    Add <strong className="text-red-600">{remaining.toFixed(0)} DH</strong> more for free delivery
                  </p>
                  <div className="w-full h-2.5 rounded-full overflow-hidden bg-red-100">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-red-600"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {customer.orderType === 'delivery' && subtotal >= FREE_DELIVERY_THRESHOLD && (
                <div className="border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-sm font-bold bg-green-50 text-green-800 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700">✓</div>
                  You qualify for free delivery!
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.cartItemId} className="p-4 rounded-2xl border border-red-100 bg-white shadow-sm animate-slide-up">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-red-950 text-base truncate font-heading">{item.menuItem.name}</h4>
                        {item.selectedModifiers.length > 0 && (
                          <p className="text-xs text-red-900/60 mt-1 line-clamp-1 font-medium">
                            {item.selectedModifiers.map(m => m.modifierName).join(', ')}
                          </p>
                        )}
                        {item.instructions && (
                          <p className="text-xs text-red-500 mt-1 italic font-medium">&ldquo;{item.instructions}&rdquo;</p>
                        )}
                      </div>
                      <span className="font-black text-base text-red-600 shrink-0">
                        {item.totalPrice.toFixed(2)} {restaurant.currency_symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <button onClick={() => removeItem(item.cartItemId)} className="flex items-center gap-1 text-sm text-red-900/40 hover:text-red-500 transition-colors font-bold">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                      <div className="flex items-center rounded-xl p-1 gap-1 border border-red-100 bg-red-50">
                        <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-8 h-8 flex items-center justify-center text-red-950 hover:bg-white rounded-lg transition-colors bg-transparent border-0 shadow-none">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-black text-red-950">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-8 h-8 flex items-center justify-center text-red-950 hover:bg-white rounded-lg transition-colors bg-transparent border-0 shadow-none">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="border border-red-100 rounded-2xl p-4 bg-white shadow-sm">
                <p className="text-sm font-bold text-red-950 mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-yellow-500" /> Promo Code</p>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-green-200 bg-green-50">
                    <span className="text-sm font-bold text-green-700">✓ {appliedPromo.code} applied — {appliedPromo.discount} DH off</span>
                    <button onClick={() => setAppliedPromo(null)} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                      className="flex-1 px-4 py-3 text-sm font-bold border-2 border-red-100 rounded-xl focus:ring-0 focus:border-red-400 focus:outline-none bg-red-50 text-red-950 placeholder-red-300 transition-colors"
                    />
                    <button
                      onClick={handleApplyPromo}
                      className="px-5 py-3 bg-red-900 hover:bg-red-950 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {promoError && <p className="text-sm text-red-500 mt-2 font-bold">{promoError}</p>}
              </div>

              {/* Checkout Form */}
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5 pt-3">
                <h3 className="font-black text-red-950 text-lg font-heading">Order Details</h3>

                {/* Order Type */}
                <div className="grid grid-cols-3 gap-3">
                  {orderTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCustomer({ ...customer, orderType: type.id })}
                      className={`py-4 px-2 rounded-xl text-sm font-bold flex flex-col items-center gap-2 border-2 transition-all bg-white ${
                        customer.orderType === type.id
                          ? 'border-red-600 text-red-600 shadow-md shadow-red-600/10'
                          : 'border-red-100 text-red-900/60 hover:border-red-300'
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span>{type.label}</span>
                      <span className={`text-[10px] ${customer.orderType === type.id ? 'text-red-500' : 'text-red-900/40'}`}>{type.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Input fields */}
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-300" />
                    <input
                      type="text"
                      placeholder="Full Name *"
                      required
                      value={customer.name}
                      onChange={e => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 text-sm font-bold border-2 border-red-100 rounded-xl focus:ring-0 focus:border-red-400 outline-none bg-white text-red-950 placeholder-red-300 transition-colors shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-300" />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      required
                      value={customer.phone}
                      onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 text-sm font-bold border-2 border-red-100 rounded-xl focus:ring-0 focus:border-red-400 outline-none bg-white text-red-950 placeholder-red-300 transition-colors shadow-sm"
                    />
                  </div>

                  {customer.orderType === 'delivery' && (
                    <div className="space-y-3">
                      {/* ── Map pin picker button ── */}
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className={`w-full flex items-center gap-4 px-4 py-3 border-2 rounded-xl transition-all text-left shadow-sm ${
                          dropoffGeo ? 'border-green-500 bg-green-50' : 'border-red-100 bg-white hover:border-red-300'
                        }`}
                      >
                        <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${dropoffGeo ? 'bg-green-500 text-white' : 'bg-red-50 text-red-500'}`}>
                          {dropoffGeo ? <MapPin className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          {dropoffGeo ? (
                            <>
                              <p className="text-sm font-bold text-green-800">Address Confirmed ✓</p>
                              <p className="text-xs text-green-600 truncate">{dropoffGeo.address}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-red-950">Pin Location on Map</p>
                              <p className="text-xs text-red-400 font-medium">Use GPS or drag the pin</p>
                            </>
                          )}
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${dropoffGeo ? 'text-green-600' : 'text-red-500'}`}>
                          {dropoffGeo ? 'Edit' : 'Open →'}
                        </span>
                      </button>

                      <div className="relative">
                        <FileText className="absolute left-4 top-4 w-5 h-5 text-red-300" />
                        <textarea
                          rows={2}
                          placeholder={dropoffGeo ? 'Additional delivery instructions (optional)' : 'Or type address manually *'}
                          required={!dropoffGeo}
                          value={customer.deliveryAddress}
                          onFocus={() => setShowSuggestions(true)}
                          onChange={e => {
                            setCustomer({ ...customer, deliveryAddress: e.target.value });
                            setShowSuggestions(true);
                          }}
                          className="w-full pl-12 pr-4 py-3.5 text-sm font-bold border-2 border-red-100 rounded-xl focus:ring-0 focus:border-red-400 outline-none bg-white text-red-950 placeholder-red-300 transition-colors shadow-sm resize-none"
                        />
                        {isSearching && (
                          <Loader2 className="w-4 h-4 text-red-300 animate-spin absolute right-4 top-4" />
                        )}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                            {suggestions.map((s, idx) => {
                              const a = s.address;
                              const label = [a?.road, a?.suburb, a?.city || a?.town || a?.village].filter(Boolean).join(", ") || s.display_name.split(",")[0];
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-start gap-2"
                                  onClick={() => {
                                    setCustomer({ ...customer, deliveryAddress: label });
                                    setDropoffGeo({ lat: parseFloat(s.lat), lng: parseFloat(s.lon), address: label });
                                    setShowSuggestions(false);
                                    setShowLocationPicker(true);
                                  }}
                                >
                                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{s.display_name}</p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {customer.orderType === 'dine_in' && (
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-300" />
                      <input
                        type="text"
                        placeholder="Table Number *"
                        required
                        value={customer.tableNumber}
                        onChange={e => setCustomer({ ...customer, tableNumber: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 text-sm font-bold border-2 border-red-100 rounded-xl focus:ring-0 focus:border-red-400 outline-none bg-white text-red-950 placeholder-red-300 transition-colors shadow-sm"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Utensils className="absolute left-4 top-4 w-5 h-5 text-red-300" />
                    <textarea
                      rows={2}
                      placeholder="Special instructions (optional)"
                      value={customer.notes}
                      onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 text-sm font-bold border-2 border-red-100 rounded-xl focus:ring-0 focus:border-red-400 outline-none bg-white text-red-950 placeholder-red-300 transition-colors shadow-sm resize-none"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────── */}
        {items.length > 0 && (
          <div className="p-5 border-t border-red-900/10 bg-white flex-shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
            <div className="space-y-2 text-sm font-bold text-red-900/60 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-red-950">{subtotal.toFixed(2)} {restaurant.currency_symbol}</span>
              </div>
              {customer.orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span>
                    Delivery Fee 
                    {distanceKm > 0 && <span className="text-[10px] text-red-900/40 ml-1">({distanceKm.toFixed(1)}km)</span>}
                  </span>
                  <span>{subtotal >= FREE_DELIVERY_THRESHOLD ? <span className="text-green-600 uppercase tracking-wider">Free</span> : <span className="text-red-950">{deliveryFee.toFixed(2)} {restaurant.currency_symbol}</span>}</span>
                </div>
              )}
              {appliedPromo && appliedPromo.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Promo ({appliedPromo.code})</span>
                  <span>-{appliedPromo.discount.toFixed(2)} {restaurant.currency_symbol}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xl text-red-950 pt-3 border-t border-red-100 mt-3 font-heading">
                <span>Total</span>
                <span className="text-red-600">{grandTotal.toFixed(2)} {restaurant.currency_symbol}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white active:scale-[0.98] py-4 px-6 rounded-[20px] font-bold text-base flex items-center justify-between transition-all shadow-lg shadow-red-600/30"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span className="mx-auto">Processing…</span></>
              ) : (
                <>
                  <span className="flex items-center gap-2 tracking-wide"><ShoppingBag className="w-5 h-5"/> Place Order</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </>
              )}
            </button>
            <p className="text-center text-xs text-red-900/40 mt-4 font-bold">By placing an order you agree to our terms of service</p>
          </div>
        )}
      </div>
    </div>

    {/* ── Delivery Location Picker Modal ── */}
    <DeliveryLocationPicker
      open={showLocationPicker}
      defaultCenter={dropoffGeo ? [dropoffGeo.lat, dropoffGeo.lng] : undefined}
      onConfirm={(loc) => {
        setDropoffGeo(loc);
        setCustomer(prev => ({ ...prev, deliveryAddress: loc.address }));
        setShowLocationPicker(false);
      }}
      onClose={() => setShowLocationPicker(false)}
    />
  </>
  );
}
