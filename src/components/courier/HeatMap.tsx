"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { Order } from "@/types";

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

interface HeatMapProps {
  orders: Order[];
  courierPosition: [number, number] | null;
}

export function HeatMap({ orders, courierPosition }: HeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const courierMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!courierPosition || !containerRef.current || mapRef.current) return;

    let destroyed = false;

    const buildMap = async () => {
      const L = (await import("leaflet")).default;
      if (destroyed || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true,
      }).setView(courierPosition, 14);

      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      const courierIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:60px;height:60px;border-radius:50%;background:rgba(234,179,8,0.18);animation:pulse-ring 2s ease-out infinite;"></div>
            <div style="position:absolute;width:38px;height:38px;border-radius:50%;background:rgba(234,179,8,0.30);animation:pulse-ring 2s ease-out 0.5s infinite;"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:#eab308;border:3px solid white;box-shadow:0 0 16px rgba(234,179,8,0.8);display:flex;align-items:center;justify-content:center;position:relative;z-index:2;font-size:12px;">🛵</div>
          </div>`,
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      const marker = L.marker(courierPosition, { icon: courierIcon, zIndexOffset: 1000 }).addTo(map);
      courierMarkerRef.current = marker;

      const geocodeQueue = orders
        .filter((o) => o.delivery_address)
        .map((o) => ({ address: o.delivery_address!, status: o.status, orderNumber: o.order_number }));

      for (const item of geocodeQueue) {
        if (destroyed) break;
        const coords = await geocodeAddress(item.address);
        if (!coords || destroyed || !mapRef.current) continue;

        const [lat, lng] = coords;
        const color =
          item.status === "ready"     ? "#22c55e" :
          item.status === "preparing" ? "#f97316" :
          item.status === "confirmed" ? "#eab308" : "#60a5fa";

        ([{ r: 400, o: 0.07 }, { r: 200, o: 0.14 }, { r: 80, o: 0.30 }]).forEach(({ r, o }) => {
          L.circle([lat, lng], {
            radius: r, color: "transparent",
            fillColor: color, fillOpacity: o, weight: 0,
          }).addTo(map!);
        });

        const dot = L.divIcon({
          className: "",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 8px ${color};"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([lat, lng], { icon: dot })
          .bindPopup(`<b>Order #${item.orderNumber}</b><br/>${item.address}`)
          .addTo(map!);
      }

      if (!destroyed) L.control.zoom({ position: "bottomright" }).addTo(map);
    };

    buildMap();

    return () => {
      destroyed = true;
      courierMarkerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!courierPosition || !courierMarkerRef.current) return;
    courierMarkerRef.current.setLatLng(courierPosition);
  }, [courierPosition]);

  return <div ref={containerRef} className="w-full h-full" />;
}
