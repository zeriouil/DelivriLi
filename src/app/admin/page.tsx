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
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(current =>
        current.map(order => order.id === orderId ? { ...order, status: newStatus } : order)
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const createTestOrder = async () => {
    try {
      const { error } = await supabase.from('orders').insert({
        restaurant_id: RESTAURANT_ID,
        customer_name: "Test Customer",
        customer_phone: "212600000000",
        order_type: "delivery",
        delivery_address: "123 Test Street, Casa",
        notes: "Please ring the bell.",
        subtotal: 150.00,
        delivery_fee: 15.00,
        total_amount: 165.00,
        status: "pending"
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error creating test order:', error);
      alert('Failed to create test order');
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
    </div>
  );
}
