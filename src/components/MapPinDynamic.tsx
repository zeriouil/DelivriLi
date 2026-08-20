"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPinProps {
  initialLat?: number;
  initialLng?: number;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

function LocationMarker({ position, setPosition, onChange, readOnly }: { 
  position: L.LatLng | null; 
  setPosition: (p: L.LatLng) => void;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (readOnly) return;
      setPosition(e.latlng);
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={customIcon} />
  );
}

export default function MapPinDynamic({ initialLat, initialLng, onChange, readOnly }: MapPinProps) {
  // Default to Casablanca if no initial coordinates are provided
  const defaultCenter = new L.LatLng(
    initialLat || 33.5731, 
    initialLng || -7.5898
  );
  const [position, setPosition] = useState<L.LatLng | null>(
    (initialLat && initialLng) ? new L.LatLng(initialLat, initialLng) : null
  );

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-200 z-10">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker 
          position={position} 
          setPosition={setPosition} 
          onChange={onChange}
          readOnly={readOnly}
        />
      </MapContainer>
    </div>
  );
}
