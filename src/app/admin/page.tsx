"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order, OrderStatus } from "@/types";
import { OrderCard } from "@/components/admin/OrderCard";
import { ShoppingBag, DollarSign, Clock, TrendingUp, Plus, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const RESTAURANT_ID = "00000000-0000-0000-0000-000000000001";

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    let dbOrders: Order[] = [];
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) dbOrders = data;
    } catch (error) {
      console.warn('Error fetching DB orders:', error);
    }

    // Merge with local orders fallback
    let localOrders: Order[] = [];
    try {
      localOrders = JSON.parse(localStorage.getItem('local_orders_list') || '[]');
    } catch {}

    const map = new Map<string, Order>();
    [...dbOrders, ...localOrders].forEach(o => {
      if (!map.has(o.id)) map.set(o.id, o);
    });

    setOrders(Array.from(map.values()));
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic update
    setOrders(current =>
      current.map(order => order.id === orderId ? { ...order, status: newStatus } : order)
    );

    // Update local storage
    try {
      const local = JSON.parse(localStorage.getItem('local_orders_list') || '[]');
      const updated = local.map((o: Order) => o.id === orderId ? { ...o, status: newStatus } : o);
      localStorage.setItem('local_orders_list', JSON.stringify(updated));

      const single = localStorage.getItem(`local_order_${orderId}`);
      if (single) {
        const parsed = JSON.parse(single);
        parsed.status = newStatus;
        localStorage.setItem(`local_order_${orderId}`, JSON.stringify(parsed));
      }
    } catch {}

    // Update Supabase
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    } catch (error) {
      console.warn('DB update failed, updated locally:', error);
    }
  };

  const createTestOrder = async () => {
    const newId = `ord-${Date.now()}`;
    const newOrder: Order = {
      id: newId,
      restaurant_id: RESTAURANT_ID,
      order_number: Math.floor(1000 + Math.random() * 9000),
      customer_name: "Test Customer",
      customer_phone: "212600000000",
      order_type: "delivery",
      delivery_address: "123 Boulevard Anfa, Casablanca",
      notes: "Please ring the doorbell.",
      subtotal: 150.00,
      delivery_fee: 15.00,
      total_amount: 165.00,
      status: "pending",
      whatsapp_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic state addition
    setOrders(prev => [newOrder, ...prev]);

    // Save to local storage
    try {
      const existing = JSON.parse(localStorage.getItem('local_orders_list') || '[]');
      localStorage.setItem('local_orders_list', JSON.stringify([newOrder, ...existing]));
      localStorage.setItem(`local_order_${newId}`, JSON.stringify(newOrder));
    } catch {}

    // DB insert attempt
    try {
      await supabase.from('orders').insert({
        id: newOrder.id,
        restaurant_id: RESTAURANT_ID,
        customer_name: newOrder.customer_name,
        customer_phone: newOrder.customer_phone,
        order_type: newOrder.order_type,
        delivery_address: newOrder.delivery_address,
        notes: newOrder.notes,
        subtotal: newOrder.subtotal,
        delivery_fee: newOrder.delivery_fee,
        total_amount: newOrder.total_amount,
        status: newOrder.status
      });
    } catch (error) {
      console.warn('DB insert failed, created test order locally:', error);
    }
  };

  const getOrdersByStatus = (statusGroup: OrderStatus[]) =>
    orders.filter(order => statusGroup.includes(order.status));

  // Stats
  const todayOrders = orders.length;
  const todayRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const avgOrder = todayOrders > 0 ? todayRevenue / todayOrders : 0;
  const activeOrders = getOrdersByStatus(['pending', 'confirmed', 'preparing', 'ready']).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading orders…</p>
        </div>
      </div>
    );
  }

  const COLUMNS: { label: string; statuses: OrderStatus[]; color: string; dot: string; bg: string }[] = [
    { label: 'New Orders',  statuses: ['pending'],               color: 'text-amber-700',   dot: 'bg-amber-500',   bg: 'from-amber-50 to-orange-50 border-amber-200' },
    { label: 'Preparing',   statuses: ['confirmed', 'preparing'], color: 'text-indigo-700',  dot: 'bg-indigo-500',  bg: 'from-indigo-50 to-blue-50 border-indigo-200' },
    { label: 'Ready',       statuses: ['ready'],                 color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'from-emerald-50 to-teal-50 border-emerald-200' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Stats Bar ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Orders', value: todayOrders,
            icon: ShoppingBag, color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-600',
          },
          {
            label: 'Revenue', value: `${todayRevenue.toFixed(0)} DH`,
            icon: DollarSign, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Avg. Order', value: `${avgOrder.toFixed(0)} DH`,
            icon: TrendingUp, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Active Now', value: activeOrders,
            icon: Clock, color: 'bg-rose-500', light: 'bg-rose-50 text-rose-600',
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Actions ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {COLUMNS.map(col => (
            <div key={col.label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              {col.label}: <span className="font-black">{getOrdersByStatus(col.statuses).length}</span>
              <span className="mx-1 text-slate-300">·</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            id="refresh-orders"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            id="create-test-order"
            onClick={createTestOrder}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Test Order
          </button>
        </div>
      </div>

      {/* ── Kanban ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map(col => {
          const colOrders = getOrdersByStatus(col.statuses);
          return (
            <div key={col.label} className="flex flex-col gap-3">
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border bg-gradient-to-r ${col.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot} ${col.statuses.includes('pending') ? 'animate-pulse' : ''}`} />
                  <h2 className={`font-black text-sm ${col.color}`}>{col.label}</h2>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-white/60 ${col.color}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              {colOrders.map((order, idx) => (
                <div key={order.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.06}s` }}>
                  <OrderCard order={order} onUpdateStatus={updateOrderStatus} />
                </div>
              ))}

              {colOrders.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <p className="text-slate-400 text-sm">No orders here</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Picked Up / Out for Delivery Section ───── */}
      {getOrdersByStatus(['out_for_delivery', 'completed']).length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Picked Up & Out for Delivery ({getOrdersByStatus(['out_for_delivery', 'completed']).length})
            </h3>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">
              ✓ Cleared from active kitchen board
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
