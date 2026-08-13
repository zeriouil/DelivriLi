"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";
import { NewJobAlert } from "@/components/courier/NewJobAlert";
import { DeliveryJobCard } from "@/components/courier/DeliveryJobCard";
import { Bike, ChevronUp, X, Wifi, WifiOff, MapPin, ShieldCheck, AlertTriangle } from "lucide-react";

const HeatMap = dynamic(
  () => import("@/components/courier/HeatMap").then((m) => m.HeatMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-900" /> }
);

type LocationState = "idle" | "requesting" | "granted" | "denied";

export default function CourierDashboard() {
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [readyDeliveries, setReadyDeliveries] = useState<Order[]>([]);
  const [incomingJob, setIncomingJob] = useState<Order | null>(null);
  const [courierPos, setCourierPos] = useState<[number, number] | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [jobListOpen, setJobListOpen] = useState(false);
  const alertedIds = useRef<Set<string>>(new Set());
  const watchIdRef = useRef<number | null>(null);

  // Broadcast courier GPS to localStorage whenever position changes
  // Customer tracking pages poll this to show real courier location on map
  const broadcastPosition = (pos: [number, number]) => {
    try {
      const payload = JSON.stringify({ lat: pos[0], lng: pos[1], ts: Date.now() });
      localStorage.setItem('courier_position', payload);
    } catch {}
  };

  // Start watching GPS — called only after user taps "Enable Location"
  const startLocationTracking = () => {
    setLocationState("requesting");

    if (!navigator.geolocation) {
      setLocationState("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCourierPos(latlng);
        broadcastPosition(latlng);
        setLocationState("granted");

        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const updated: [number, number] = [p.coords.latitude, p.coords.longitude];
            setCourierPos(updated);
            broadcastPosition(updated);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );
      },
      () => {
        setLocationState("denied");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fetch ALL delivery orders (for heatmap)
  const fetchAllOrders = useCallback(async () => {
    let dbOrders: Order[] = [];
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("order_type", "delivery")
        .in("status", ["pending", "confirmed", "preparing", "ready"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) dbOrders = data;
    } catch {}

    let localOrders: Order[] = [];
    try {
      localOrders = (JSON.parse(localStorage.getItem('local_orders_list') || '[]') as Order[])
        .filter(o => o.order_type === 'delivery' && ["pending", "confirmed", "preparing", "ready"].includes(o.status));
    } catch {}

    const map = new Map<string, Order>();
    [...dbOrders, ...localOrders].forEach(o => map.set(o.id, o));
    setAllOrders(Array.from(map.values()));
  }, []);

  // Fetch active courier deliveries (ready, picked_up, out_for_delivery, arrived)
  const ACTIVE_COURIER_STATUSES = ["ready", "picked_up", "out_for_delivery", "arrived"];

  const fetchReadyDeliveries = useCallback(async () => {
    let dbOrders: Order[] = [];
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("order_type", "delivery")
        .in("status", ACTIVE_COURIER_STATUSES)
        .order("updated_at", { ascending: false });
      if (data) dbOrders = data;
    } catch {}

    let localOrders: Order[] = [];
    try {
      localOrders = (JSON.parse(localStorage.getItem('local_orders_list') || '[]') as Order[])
        .filter(o => o.order_type === 'delivery' && ACTIVE_COURIER_STATUSES.includes(o.status));
    } catch {}

    const map = new Map<string, Order>();
    // DB orders take priority (most recent source of truth)
    localOrders.forEach(o => map.set(o.id, o));
    dbOrders.forEach(o => map.set(o.id, o));

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );

    setReadyDeliveries(combined);

    // Only alert for truly new READY orders
    const readyOnly = combined.filter(o => o.status === 'ready');
    if (isOnline && readyOnly.length > 0) {
      const newest = readyOnly[0];
      if (!alertedIds.current.has(newest.id)) {
        alertedIds.current.add(newest.id);
        setIncomingJob(newest);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Start fetching, polling & realtime when online / location active
  useEffect(() => {
    fetchAllOrders();
    fetchReadyDeliveries();

    // 1. Supabase channel
    const channel = supabase
      .channel("courier:orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchAllOrders();
        fetchReadyDeliveries();
      })
      .subscribe();

    // 2. Storage event listener (multi-tab sync)
    const handleStorage = () => {
      fetchAllOrders();
      fetchReadyDeliveries();
    };
    window.addEventListener('storage', handleStorage);

    // 3. Fast polling every 2 seconds for local changes
    const pollInterval = setInterval(() => {
      fetchReadyDeliveries();
      fetchAllOrders();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, [locationState, fetchAllOrders, fetchReadyDeliveries]);

  // Accept just opens the job list — status stays 'ready' until courier taps Pick Up
  const handleAccept = (order?: Order) => {
    setIncomingJob(null);
    setJobListOpen(true);
    // Ensure the accepted order appears in the jobs list immediately
    const target = order || incomingJob;
    if (target) {
      setReadyDeliveries(prev => {
        const exists = prev.some(o => o.id === target.id);
        return exists ? prev : [target, ...prev];
      });
    }
  };

  const handleDecline = (orderId: string) => {
    setIncomingJob(null);
    setReadyDeliveries((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'completed') {
      setReadyDeliveries((cur) => cur.filter((o) => o.id !== orderId));
      setAllOrders((cur) => cur.filter((o) => o.id !== orderId));
    } else {
      setReadyDeliveries((cur) => cur.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      setAllOrders((cur) => cur.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }

    // Local Storage update
    try {
      const localList = JSON.parse(localStorage.getItem('local_orders_list') || '[]');
      const updatedList = localList.map((o: Order) => o.id === orderId ? { ...o, status: newStatus } : o);
      localStorage.setItem('local_orders_list', JSON.stringify(updatedList));

      const single = localStorage.getItem(`local_order_${orderId}`);
      if (single) {
        const parsed = JSON.parse(single);
        parsed.status = newStatus;
        localStorage.setItem(`local_order_${orderId}`, JSON.stringify(parsed));
      }
    } catch {}

    // Supabase update
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    } catch {}
  };

  // ── LOCATION GATE SCREENS ─────────────────────────────────────────────────
  if (locationState === "idle" || locationState === "requesting" || locationState === "denied") {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-between px-6 pt-20 pb-14 overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl" />
        </div>

        {/* Top: branding */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/40 mb-2">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight">Courier App</h1>
          <p className="text-white/40 text-sm font-medium">Powered by Digital Menu PWA</p>
        </div>

        {/* Center: illustration + explanation */}
        <div className="flex flex-col items-center gap-6 z-10 text-center max-w-xs">
          {locationState === "denied" ? (
            <>
              <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
              <div>
                <h2 className="text-white text-xl font-black mb-2">Location Access Denied</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  We need your location to show you on the map and calculate distances to customers.
                  Please enable location in your browser settings, then try again.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Animated location pulse illustration */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className={`absolute w-32 h-32 rounded-full bg-indigo-500/10 ${locationState === "requesting" ? "animate-ping" : ""}`} />
                <div className={`absolute w-20 h-20 rounded-full bg-indigo-500/20 ${locationState === "requesting" ? "animate-pulse" : ""}`} />
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/50 z-10">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-white text-xl font-black mb-2">
                  {locationState === "requesting" ? "Requesting Access…" : "Enable Your Location"}
                </h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  {locationState === "requesting"
                    ? "Please allow location access when your browser asks."
                    : "To go online and receive delivery orders, we need access to your GPS location."}
                </p>
              </div>

              {/* Feature bullets */}
              {locationState === "idle" && (
                <div className="w-full space-y-3 mt-2">
                  {[
                    { icon: "🗺️", text: "See your position on the live demand map" },
                    { icon: "📍", text: "Calculate distance to each delivery" },
                    { icon: "🛵", text: "Get matched with nearby orders" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                      <span className="text-xl">{icon}</span>
                      <span className="text-white/70 text-sm font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom: CTA button */}
        <div className="w-full z-10 flex flex-col gap-3">
          {locationState === "denied" ? (
            <button
              onClick={startLocationTracking}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-xl shadow-indigo-600/30"
            >
              <MapPin className="w-5 h-5" />
              Try Again
            </button>
          ) : locationState === "requesting" ? (
            <div className="w-full py-4 rounded-2xl bg-slate-800 border border-white/10 text-white/40 font-bold text-lg flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Waiting for permission…
            </div>
          ) : (
            <button
              onClick={startLocationTracking}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-xl shadow-emerald-500/30"
            >
              <ShieldCheck className="w-5 h-5" />
              Enable Location &amp; Go Online
            </button>
          )}
          <p className="text-white/25 text-xs text-center">
            Your location is only used while you are actively using this app.
          </p>
        </div>
      </div>
    );
  }

  const triggerTestJobAlert = () => {
    const testId = `ord-${Date.now()}`;
    const testOrder: Order = {
      id: testId,
      restaurant_id: "00000000-0000-0000-0000-000000000001",
      order_number: Math.floor(1000 + Math.random() * 9000),
      customer_name: "Karim Benali",
      customer_phone: "+212 6 12 34 56 78",
      order_type: "delivery",
      delivery_address: "Boulevard Mohamed V, Casablanca",
      notes: "Ring bell #4, 2nd floor.",
      subtotal: 140.00,
      delivery_fee: 15.00,
      total_amount: 155.00,
      status: "ready",
      whatsapp_sent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    alertedIds.current.add(testId);
    setReadyDeliveries(prev => [testOrder, ...prev]);
    setIncomingJob(testOrder);
  };

  // ── MAIN COURIER DASHBOARD (location granted) ─────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 font-[Outfit]">

      {/* Fullscreen heatmap */}
      <div className="absolute inset-0 z-0">
        <HeatMap orders={allOrders} courierPosition={courierPos} />
      </div>

      {/* Floating top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-12 px-4 pb-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl">
            <Bike className="w-5 h-5 text-indigo-400" />
            <span className="text-white font-bold tracking-tight">Courier</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="test-job-alert"
              onClick={triggerTestJobAlert}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold text-xs bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/30 backdrop-blur-md shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              ⚡ Test Job Popup
            </button>
            <button
              onClick={() => setIsOnline((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all backdrop-blur-md border ${
                isOnline
                  ? "bg-emerald-500/90 border-emerald-400/30 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-slate-800/80 border-white/10 text-white/50"
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? "Online" : "Offline"}
            </button>
          </div>
        </div>
      </div>

      {/* Map legend */}
      <div className="absolute top-32 left-4 z-20 bg-slate-900/75 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Demand</p>
        {[
          { color: "bg-red-400", label: "Ready" },
          { color: "bg-orange-400", label: "Preparing" },
          { color: "bg-yellow-400", label: "Confirmed" },
          { color: "bg-cyan-400", label: "New" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-white/70 text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom jobs panel — only shown when there are active deliveries */}
      {readyDeliveries.length > 0 && (
        <div
          className={`absolute left-0 right-0 z-20 transition-all duration-500 ease-out ${
            jobListOpen ? "bottom-0" : "-bottom-[calc(100vh-160px)]"
          }`}
          style={{ top: jobListOpen ? "30%" : undefined }}
        >
          <button
            onClick={() => setJobListOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-6 py-4 rounded-t-3xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-white font-black text-base">Active Jobs</span>
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                {readyDeliveries.length}
              </span>
            </div>
            {jobListOpen ? <X className="w-5 h-5 text-white/60" /> : <ChevronUp className="w-5 h-5 text-white/60" />}
          </button>
          <div className="bg-slate-900/95 backdrop-blur-xl overflow-y-auto px-4 pb-10 space-y-4" style={{ maxHeight: "70vh" }}>
            {readyDeliveries.map((order) => (
              <DeliveryJobCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} courierPosition={courierPos} />
            ))}
          </div>
        </div>
      )}

      {/* Waiting indicator — shown at bottom when online but no active jobs */}
      {readyDeliveries.length === 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8 pt-4 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none">
          <div className="flex items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3.5 pointer-events-auto">
            {isOnline ? (
              <>
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-white/80 text-sm font-semibold">Waiting for orders…</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-white/30 flex-shrink-0" />
                <span className="text-white/30 text-sm font-semibold">You are offline</span>
              </>
            )}
            <button
              onClick={() => setIsOnline((v) => !v)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isOnline
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300'
                  : 'bg-slate-700/60 border-white/10 text-white/40 hover:bg-emerald-500/20 hover:border-emerald-400/40 hover:text-emerald-300'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      )}

      {/* Collapsed jobs FAB — shown when jobs exist but panel is closed */}
      {!jobListOpen && readyDeliveries.length > 0 && (
        <button
          onClick={() => setJobListOpen(true)}
          className="absolute bottom-8 right-4 z-30 bg-red-500 hover:bg-red-400 text-white font-black rounded-2xl px-5 py-3.5 shadow-xl shadow-red-500/40 flex items-center gap-2 active:scale-95 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
          {readyDeliveries.length} Job{readyDeliveries.length > 1 ? "s" : ""}
        </button>
      )}

      {/* Incoming job alert */}
      {incomingJob && isOnline && (
        <NewJobAlert order={incomingJob} onAccept={handleAccept} onDecline={handleDecline} timeoutSeconds={30} courierPosition={courierPos} />
      )}
    </div>
  );
}
