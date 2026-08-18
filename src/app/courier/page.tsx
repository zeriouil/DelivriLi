"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order, OrderStatus } from "@/types";
import { NewJobAlert } from "@/components/courier/NewJobAlert";
import { DeliveryJobCard } from "@/components/courier/DeliveryJobCard";
import { Bike, ChevronUp, X, Wifi, WifiOff, MapPin, ShieldCheck, AlertTriangle } from "lucide-react";

const HeatMap = dynamic(
  () => import("@/components/courier/HeatMap").then((m) => m.HeatMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-red-950" /> }
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

  const trackingChannelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('live_tracking');
    channel.subscribe();
    trackingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  const broadcastPosition = (pos: [number, number]) => {
    try {
      const payload = { lat: pos[0], lng: pos[1], ts: Date.now() };
      localStorage.setItem('courier_position', JSON.stringify(payload));
      if (trackingChannelRef.current) {
        trackingChannelRef.current.send({
          type: 'broadcast',
          event: 'courier_moved',
          payload
        });
      }
    } catch {}
  };

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

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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
    localOrders.forEach(o => map.set(o.id, o));
    dbOrders.forEach(o => map.set(o.id, o));

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );

    setReadyDeliveries(combined);

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

  useEffect(() => {
    fetchAllOrders();
    fetchReadyDeliveries();

    const channel = supabase
      .channel("courier:orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchAllOrders();
        fetchReadyDeliveries();
      })
      .subscribe();

    const handleStorage = () => {
      fetchAllOrders();
      fetchReadyDeliveries();
    };
    window.addEventListener('storage', handleStorage);

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

  const handleAccept = (order?: Order) => {
    setIncomingJob(null);
    setJobListOpen(true);
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

    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    } catch {}
  };

  if (locationState === "idle" || locationState === "requesting" || locationState === "denied") {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-red-950 via-red-900 to-red-800 flex flex-col items-center justify-between px-6 pt-20 pb-14 overflow-hidden font-body">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 zellige-bg" />

        <div className="flex flex-col items-center gap-2 z-10 mt-10">
          <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/40 mb-4 border border-yellow-300">
            <Bike className="w-10 h-10 text-red-950" />
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight font-heading">Courier App</h1>
          <p className="text-red-200 text-sm font-medium">Powered by DelivriLi</p>
        </div>

        <div className="flex flex-col items-center gap-8 z-10 text-center max-w-sm mx-auto">
          {locationState === "denied" ? (
            <>
              <div className="w-24 h-24 bg-red-500/20 border border-red-500/40 rounded-3xl flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
              <div>
                <h2 className="text-white text-2xl font-black mb-3 font-heading">Location Access Denied</h2>
                <p className="text-red-100/70 text-base leading-relaxed">
                  We need your location to show you on the map and calculate distances to customers.
                  Please enable location in your browser settings, then try again.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className={`absolute w-32 h-32 rounded-full bg-red-500/20 ${locationState === "requesting" ? "animate-ping" : ""}`} />
                <div className={`absolute w-20 h-20 rounded-full bg-red-500/40 ${locationState === "requesting" ? "animate-pulse" : ""}`} />
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-600/50 z-10 border border-red-500">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-white text-2xl font-black mb-3 font-heading">
                  {locationState === "requesting" ? "Requesting Access..." : "Enable Your Location"}
                </h2>
                <p className="text-red-100/70 text-base leading-relaxed font-medium">
                  {locationState === "requesting"
                    ? "Please allow location access when your browser asks."
                    : "To go online and receive delivery orders, we need access to your GPS location."}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="w-full z-10 flex flex-col gap-4 max-w-md mx-auto">
          {locationState === "denied" ? (
            <button
              onClick={startLocationTracking}
              className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-xl shadow-red-600/30"
            >
              <MapPin className="w-5 h-5" />
              Try Again
            </button>
          ) : locationState === "requesting" ? (
            <div className="w-full py-4 rounded-2xl bg-red-900/50 border border-red-500/30 text-red-200 font-bold text-lg flex items-center justify-center gap-3 backdrop-blur-sm">
              <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              Waiting for permission...
            </div>
          ) : (
            <button
              onClick={startLocationTracking}
              className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-red-950 font-bold text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-xl shadow-yellow-400/30"
            >
              <ShieldCheck className="w-5 h-5" />
              Enable Location & Go Online
            </button>
          )}
          <p className="text-red-200/50 text-xs text-center font-bold">
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-red-950 font-body">

      <div className="absolute inset-0 z-0">
        <HeatMap orders={allOrders} courierPosition={courierPos} />
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 pt-12 px-6 pb-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto max-w-5xl mx-auto">
          <div className="flex items-center gap-3 bg-red-950/80 backdrop-blur-md border border-red-900/50 px-5 py-3 rounded-2xl shadow-lg">
            <Bike className="w-6 h-6 text-yellow-400" />
            <span className="text-white font-bold tracking-wide font-heading text-lg">DelivriLi Courier</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerTestJobAlert}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95"
            >
              ⚡ Test Job
            </button>
            <button
              onClick={() => setIsOnline((v) => !v)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                isOnline
                  ? "bg-green-600 text-white shadow-green-600/30"
                  : "bg-red-950/80 border border-red-900/50 text-red-200/50 backdrop-blur-md"
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? "Online" : "Offline"}
            </button>
          </div>
        </div>
      </div>

      <div className="absolute top-32 left-6 z-20 bg-red-950/80 backdrop-blur-md border border-red-900/50 rounded-2xl px-5 py-4 shadow-xl">
        <p className="text-yellow-400/80 text-[10px] font-black uppercase tracking-widest mb-3">Map Legend</p>
        {[
          { color: "bg-green-500", label: "Ready" },
          { color: "bg-orange-500", label: "Preparing" },
          { color: "bg-yellow-400", label: "Confirmed" },
          { color: "bg-blue-400", label: "New" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-3 mb-2 last:mb-0">
            <span className={`w-3 h-3 rounded-full ${color} shadow-sm`} />
            <span className="text-red-50 text-sm font-bold">{label}</span>
          </div>
        ))}
      </div>

      {readyDeliveries.length > 0 && (
        <div
          className={`absolute left-0 right-0 z-20 transition-all duration-500 ease-out flex justify-center ${
            jobListOpen ? "bottom-0" : "-bottom-[calc(100vh-160px)]"
          }`}
          style={{ top: jobListOpen ? "15%" : undefined }}
        >
          <div className="w-full max-w-5xl mx-auto flex flex-col">
            <button
              onClick={() => setJobListOpen((v) => !v)}
              className="w-full flex items-center justify-between bg-white backdrop-blur-xl border-t border-red-100 px-8 py-5 rounded-t-[32px] shadow-[0_-8px_30px_rgba(69,10,10,0.15)]"
            >
              <div className="flex items-center gap-4">
                <span className="text-red-950 font-black text-xl font-heading">Active Jobs</span>
                <span className="bg-red-600 text-white text-sm font-black px-3 py-1 rounded-full animate-pulse shadow-md shadow-red-600/30">
                  {readyDeliveries.length}
                </span>
              </div>
              {jobListOpen ? <X className="w-6 h-6 text-red-900/40" /> : <ChevronUp className="w-6 h-6 text-red-900/40" />}
            </button>
            <div className="bg-white/95 backdrop-blur-xl overflow-y-auto px-6 pb-12 pt-2 space-y-5 flex-1" style={{ maxHeight: "85vh" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {readyDeliveries.map((order) => (
                  <DeliveryJobCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} courierPosition={courierPos} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {readyDeliveries.length === 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 pt-6 bg-gradient-to-t from-red-950 to-transparent pointer-events-none flex justify-center">
          <div className="flex items-center justify-center gap-4 bg-white/95 backdrop-blur-xl border border-red-100 rounded-2xl px-6 py-4 pointer-events-auto shadow-2xl max-w-lg w-full">
            {isOnline ? (
              <>
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-red-950 text-base font-bold">Waiting for orders...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-900/30 shrink-0" />
                <span className="text-red-900/50 text-base font-bold">You are offline</span>
              </>
            )}
            <button
              onClick={() => setIsOnline((v) => !v)}
              className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                isOnline
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'bg-red-900/10 border-red-900/10 text-red-900/60 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      )}

      {!jobListOpen && readyDeliveries.length > 0 && (
        <button
          onClick={() => setJobListOpen(true)}
          className="absolute bottom-10 right-6 z-30 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl px-6 py-4 shadow-xl shadow-red-600/40 flex items-center gap-2 active:scale-95 transition-all text-lg"
        >
          <ChevronUp className="w-6 h-6" />
          {readyDeliveries.length} Job{readyDeliveries.length > 1 ? "s" : ""}
        </button>
      )}

      {incomingJob && isOnline && (
        <NewJobAlert order={incomingJob} onAccept={handleAccept} onDecline={handleDecline} timeoutSeconds={30} courierPosition={courierPos} />
      )}
    </div>
  );
}
