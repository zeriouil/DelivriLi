"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Search,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  open: boolean;
  onConfirm: (location: DeliveryLocation) => void;
  onClose: () => void;
  defaultCenter?: [number, number];
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const MOROCCAN_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Marrakech",  lat: 31.6295, lng: -7.9811 },
  { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
  { name: "Rabat",      lat: 34.0209, lng: -6.8416 },
  { name: "Fès",        lat: 34.0181, lng: -5.0078 },
  { name: "Tanger",     lat: 35.7595, lng: -5.8340 },
  { name: "Agadir",     lat: 30.4278, lng: -9.5981 },
  { name: "Oujda",      lat: 34.6867, lng: -1.9114 },
  { name: "Meknès",     lat: 33.8935, lng: -5.5473 },
];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en,fr;q=0.9" } }
    );
    const data: NominatimResult = await res.json();
    if (data?.display_name) {
      const a = data.address;
      const parts = [
        a?.road,
        a?.suburb,
        a?.city || a?.town || a?.village,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : data.display_name.split(",")[0];
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)},Morocco&addressdetails=1&limit=5`,
      { headers: { "Accept-Language": "en,fr;q=0.9" } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(69,10,10,0.35)"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="M20 2C11.163 2 4 9.163 4 18c0 11 16 30 16 30S36 29 36 18C36 9.163 28.837 2 20 2z"
          fill="#dc2626" stroke="#fff" stroke-width="2"/>
    <circle cx="20" cy="18" r="7" fill="#fff" opacity="0.95"/>
    <circle cx="20" cy="18" r="4" fill="#dc2626"/>
  </g>
</svg>
`;

export default function DeliveryLocationPicker({
  open,
  onConfirm,
  onClose,
  defaultCenter = [31.6295, -7.9811],
}: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const markerRef   = useRef<any>(null);

  const [location, setLocation] = useState<DeliveryLocation>({
    lat: defaultCenter[0],
    lng: defaultCenter[1],
    address: "",
  });
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isReversing, setIsReversing]   = useState(false);
  const [gpsError, setGpsError]         = useState<string | null>(null);
  const [showCities, setShowCities]     = useState(false);
  const [mapReady, setMapReady]         = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;

    let destroyed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      leafletRef.current = L;

      if (destroyed || !mapRef.current || mapInstance.current) return;

      const pinIcon = L.divIcon({
        html: PIN_SVG,
        className: "",
        iconSize: [40, 52],
        iconAnchor: [20, 52],
        popupAnchor: [0, -54],
      });

      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.attribution({ position: "bottomleft", prefix: "© OSM / CartoCDN" }).addTo(map);

      const marker = L.marker(defaultCenter, {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.on("dragend", async () => {
        const { lat, lng } = marker.getLatLng();
        setIsReversing(true);
        const address = await reverseGeocode(lat, lng);
        setIsReversing(false);
        setLocation({ lat, lng, address });
      });

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setIsReversing(true);
        const address = await reverseGeocode(lat, lng);
        setIsReversing(false);
        setLocation({ lat, lng, address });
      });

      mapInstance.current = map;
      markerRef.current   = marker;

      setIsReversing(true);
      const initAddress = await reverseGeocode(defaultCenter[0], defaultCenter[1]);
      if (!destroyed) {
        setLocation({ lat: defaultCenter[0], lng: defaultCenter[1], address: initAddress });
        setIsReversing(false);
        setMapReady(true);
      }
    })();

    return () => {
      destroyed = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current   = null;
        setMapReady(false);
      }
    };
  }, [open]);

  const flyTo = useCallback(async (lat: number, lng: number, label?: string) => {
    if (!mapInstance.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapInstance.current.flyTo([lat, lng], 17, { animate: true, duration: 0.8 });

    if (!label) {
      setIsReversing(true);
      label = await reverseGeocode(lat, lng);
      setIsReversing(false);
    }
    setLocation({ lat, lng, address: label });
  }, []);

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported.");
      return;
    }
    setIsGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setIsGpsLoading(false);
        await flyTo(coords.latitude, coords.longitude);
      },
      (err) => {
        setIsGpsLoading(false);
        setGpsError(
          err.code === 1
            ? "Location access denied. Please enable it in settings."
            : "Unable to get your location."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [flyTo]);

  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    setSearchResults([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.length < 3) return;
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchAddress(q);
      setSearchResults(results);
      setIsSearching(false);
    }, 420);
  }, []);

  const handleSearchSelect = useCallback(
    async (result: NominatimResult) => {
      setSearchQuery("");
      setSearchResults([]);
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const a   = result.address;
      const label = [a?.road, a?.suburb, a?.city || a?.town || a?.village]
        .filter(Boolean)
        .join(", ") || result.display_name.split(",")[0];
      await flyTo(lat, lng, label);
    },
    [flyTo]
  );

  const handleCityJump = useCallback(
    async (city: (typeof MOROCCAN_CITIES)[0]) => {
      setShowCities(false);
      await flyTo(city.lat, city.lng);
    },
    [flyTo]
  );

  const handleConfirm = useCallback(() => {
    if (!location.address) return;
    onConfirm(location);
  }, [location, onConfirm]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="dlp-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dlp-sheet font-body">
        <div className="dlp-header">
          <div className="dlp-header-left">
            <MapPin size={24} className="dlp-header-icon" />
            <div>
              <h2 className="dlp-header-title">Delivery Address</h2>
              <p className="dlp-header-sub">Drag the pin or type an address</p>
            </div>
          </div>
          <button className="dlp-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="dlp-controls">
          <div className="dlp-search-wrap">
            <Search size={18} className="dlp-search-icon" />
            <input
              id="dlp-search-input"
              className="dlp-search-input"
              type="text"
              placeholder="Search street, neighborhood, city..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoComplete="off"
            />
            {isSearching && <Loader2 size={18} className="dlp-search-spinner" />}
          </div>

          {searchResults.length > 0 && (
            <ul className="dlp-search-dropdown" role="listbox">
              {searchResults.map((r, i) => (
                <li
                  key={i}
                  className="dlp-search-option"
                  role="option"
                  onClick={() => handleSearchSelect(r)}
                >
                  <MapPin size={16} className="dlp-search-option-icon" />
                  <span className="dlp-search-option-text">
                    {r.display_name.split(",").slice(0, 3).join(",")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="dlp-action-row">
            <button
              id="dlp-gps-btn"
              className="dlp-gps-btn"
              onClick={handleGps}
              disabled={isGpsLoading}
            >
              {isGpsLoading ? (
                <Loader2 size={16} className="dlp-spin" />
              ) : (
                <Navigation size={16} />
              )}
              {isGpsLoading ? "Locating..." : "Use My Location"}
            </button>

            <div className="dlp-city-wrap">
              <button
                id="dlp-city-btn"
                className="dlp-city-btn"
                onClick={() => setShowCities((s) => !s)}
              >
                City
                <ChevronDown
                  size={16}
                  style={{ transform: showCities ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                />
              </button>
              {showCities && (
                <ul className="dlp-city-dropdown">
                  {MOROCCAN_CITIES.map((city) => (
                    <li
                      key={city.name}
                      className="dlp-city-option"
                      onClick={() => handleCityJump(city)}
                    >
                      {city.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="dlp-gps-error">
              <AlertCircle size={16} />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        <div className="dlp-map-container">
          <div ref={mapRef} className="dlp-map" id="dlp-leaflet-map" />

          {!mapReady && (
            <div className="dlp-map-loading">
              <Loader2 size={32} className="dlp-spin" />
              <span>Loading map...</span>
            </div>
          )}

          {mapReady && (
            <div className="dlp-map-hint" aria-hidden="true">
              Drag the pin 📍 or tap on the map
            </div>
          )}
        </div>

        <div className="dlp-footer">
          <div className="dlp-address-preview">
            {isReversing ? (
              <div className="dlp-address-loading">
                <Loader2 size={16} className="dlp-spin" />
                <span>Identifying address...</span>
              </div>
            ) : location.address ? (
              <>
                <MapPin size={20} className="dlp-address-pin" />
                <div className="dlp-address-text">
                  <span className="dlp-address-label">{location.address}</span>
                  <span className="dlp-address-coords">
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </span>
                </div>
              </>
            ) : (
              <span className="dlp-address-placeholder">No address selected</span>
            )}
          </div>

          <button
            id="dlp-confirm-btn"
            className="dlp-confirm-btn"
            onClick={handleConfirm}
            disabled={!location.address || isReversing}
          >
            <CheckCircle2 size={20} />
            Confirm this address
          </button>
        </div>
      </div>

      <style>{`
        .dlp-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(69,10,10,0.6);
          backdrop-filter: blur(6px);
          display: flex; align-items: flex-end; justify-content: center;
          animation: dlp-fade-in 0.2s ease; padding: 0;
        }
        @keyframes dlp-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .dlp-sheet {
          width: 100%; max-width: 600px;
          background: #ffffff;
          border-radius: 32px 32px 0 0;
          display: flex; flex-direction: column;
          max-height: 96dvh; overflow: hidden;
          animation: dlp-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 -12px 48px rgba(69,10,10,0.25);
        }
        @keyframes dlp-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .dlp-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 24px 16px; border-bottom: 1px solid #fee2e2; gap: 12px;
        }
        .dlp-header-left { display: flex; align-items: center; gap: 14px; }
        .dlp-header-icon { color: #dc2626; flex-shrink: 0; }
        .dlp-header-title {
          font-family: var(--font-heading);
          font-size: 1.4rem; font-weight: 700; color: #450a0a; margin: 0 0 4px; line-height: 1.1;
        }
        .dlp-header-sub { font-size: 0.85rem; color: #7f1d1d; margin: 0; font-weight: 500; }
        .dlp-close-btn {
          width: 40px; height: 40px; border-radius: 12px; border: none;
          background: #fef2f2; color: #991b1b; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.15s;
        }
        .dlp-close-btn:hover { background: #fee2e2; color: #450a0a; }
        .dlp-controls {
          padding: 16px 24px 12px; display: flex; flex-direction: column; gap: 10px;
          position: relative; z-index: 10;
        }
        .dlp-search-wrap { position: relative; display: flex; align-items: center; }
        .dlp-search-icon { position: absolute; left: 14px; color: #f87171; pointer-events: none; }
        .dlp-search-input {
          width: 100%; height: 50px; padding: 0 44px 0 42px;
          border: 2px solid #fee2e2; border-radius: 14px;
          background: #fef2f2; font-family: var(--font-body);
          font-size: 0.95rem; font-weight: 700; color: #450a0a; outline: none;
          transition: all 0.2s;
        }
        .dlp-search-input:focus { border-color: #f87171; background: #ffffff; box-shadow: 0 4px 12px rgba(220,38,38,0.1); }
        .dlp-search-input::placeholder { color: #fca5a5; font-weight: 500; }
        .dlp-search-spinner { position: absolute; right: 14px; color: #dc2626; animation: dlp-spin 0.8s linear infinite; }
        .dlp-search-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: #ffffff; border: 1px solid #fee2e2; border-radius: 14px;
          box-shadow: 0 8px 24px rgba(69,10,10,0.15); list-style: none;
          margin: 0; padding: 8px; z-index: 20; max-height: 240px; overflow-y: auto;
        }
        .dlp-search-option {
          display: flex; align-items: flex-start; gap: 10px; padding: 12px;
          border-radius: 10px; cursor: pointer; transition: background 0.15s;
        }
        .dlp-search-option:hover { background: #fef2f2; }
        .dlp-search-option-icon { color: #dc2626; flex-shrink: 0; margin-top: 2px; }
        .dlp-search-option-text { font-size: 0.9rem; color: #450a0a; font-weight: 600; line-height: 1.4; }
        .dlp-action-row { display: flex; gap: 10px; align-items: center; }
        .dlp-gps-btn {
          flex: 1; height: 46px; display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 2px solid #fee2e2; background: #ffffff; color: #dc2626; border-radius: 12px;
          font-family: var(--font-body); font-size: 0.95rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(220,38,38,0.05);
        }
        .dlp-gps-btn:hover:not(:disabled) { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
        .dlp-gps-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
        .dlp-city-wrap { position: relative; }
        .dlp-city-btn {
          height: 46px; padding: 0 16px; display: flex; align-items: center; gap: 6px;
          border: 2px solid #fee2e2; background: #ffffff; color: #991b1b; border-radius: 12px;
          font-family: var(--font-body); font-size: 0.95rem; font-weight: 700;
          cursor: pointer; white-space: nowrap; transition: all 0.2s; box-shadow: 0 2px 8px rgba(220,38,38,0.05);
        }
        .dlp-city-btn:hover { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
        .dlp-city-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0; min-width: 180px;
          background: #ffffff; border: 1px solid #fee2e2; border-radius: 14px;
          box-shadow: 0 8px 24px rgba(69,10,10,0.15); list-style: none;
          margin: 0; padding: 8px; z-index: 20; animation: dlp-fade-in 0.15s ease;
        }
        .dlp-city-option {
          padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 0.9rem;
          color: #450a0a; font-weight: 600; transition: all 0.15s;
        }
        .dlp-city-option:hover { background: #fef2f2; color: #dc2626; font-weight: 700; }
        .dlp-gps-error {
          display: flex; align-items: center; gap: 8px; padding: 10px 14px;
          background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px;
          color: #b91c1c; font-size: 0.85rem; font-weight: 600;
        }
        .dlp-map-container { position: relative; flex: 1; min-height: 300px; }
        .dlp-map { width: 100%; height: 100%; min-height: 300px; }
        .dlp-map-loading {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
          background: rgba(255,255,255,0.85); z-index: 5; color: #991b1b; font-size: 0.95rem; font-weight: 700;
        }
        .dlp-map-hint {
          position: absolute; bottom: 64px; left: 50%; transform: translateX(-50%);
          background: rgba(69,10,10,0.85); color: #fff; padding: 8px 16px; border-radius: 24px;
          font-size: 0.85rem; font-weight: 600; white-space: nowrap; pointer-events: none; z-index: 5;
          animation: dlp-fade-in 0.4s ease 0.6s both; backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .dlp-footer {
          padding: 16px 24px max(24px, env(safe-area-inset-bottom));
          border-top: 1px solid #fee2e2; background: #ffffff;
          display: flex; flex-direction: column; gap: 16px;
        }
        .dlp-address-preview {
          display: flex; align-items: flex-start; gap: 12px; min-height: 52px;
          padding: 12px 16px; background: #fef2f2; border: 2px solid #fee2e2; border-radius: 14px;
        }
        .dlp-address-pin { color: #dc2626; flex-shrink: 0; margin-top: 2px; }
        .dlp-address-text { display: flex; flex-direction: column; gap: 4px; }
        .dlp-address-label { font-size: 0.95rem; font-weight: 800; color: #450a0a; line-height: 1.3; }
        .dlp-address-coords { font-size: 0.8rem; color: #7f1d1d; font-family: monospace; font-weight: 600; }
        .dlp-address-placeholder { font-size: 0.9rem; color: #f87171; font-weight: 500; font-style: italic; }
        .dlp-address-loading { display: flex; align-items: center; gap: 10px; color: #dc2626; font-size: 0.9rem; font-weight: 600; }
        .dlp-confirm-btn {
          width: 100%; height: 56px; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #fff;
          border: none; border-radius: 16px; font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700;
          letter-spacing: 0.02em; cursor: pointer; box-shadow: 0 6px 24px rgba(220,38,38,0.4);
          transition: all 0.2s;
        }
        .dlp-confirm-btn:hover:not(:disabled) { opacity: 0.95; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(220,38,38,0.5); }
        .dlp-confirm-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 4px 16px rgba(220,38,38,0.3); }
        .dlp-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; background: #fecaca; color: #991b1b; }
        .dlp-spin { animation: dlp-spin 0.8s linear infinite; }
        @keyframes dlp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 600px) {
          .dlp-overlay { align-items: center; padding: 24px; }
          .dlp-sheet { border-radius: 32px; max-height: 90dvh; }
          .dlp-map-container, .dlp-map { min-height: 400px; }
        }
      `}</style>
    </div>
  );
}
