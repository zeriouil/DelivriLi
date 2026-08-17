"use client";

/**
 * DelivriLi — DeliveryLocationPicker
 * ====================================
 * A full-featured delivery address picker modal for customers.
 *
 * Features:
 *  1. "Use my location" — one-tap GPS auto-detect
 *  2. Address search bar — Nominatim reverse geocoding with Moroccan city suggestions
 *  3. Draggable pin — customer can drag the marker to fine-tune exact position
 *  4. Street-level address preview — human-readable label shown below map
 *  5. Emits { lat, lng, address } to parent on confirm
 *
 * Usage:
 *   <DeliveryLocationPicker
 *     open={showPicker}
 *     onConfirm={(loc) => {
 *       setDropoffLocation(loc);   // { lat, lng, address }
 *       setShowPicker(false);
 *     }}
 *     onClose={() => setShowPicker(false)}
 *   />
 */

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  open: boolean;
  onConfirm: (location: DeliveryLocation) => void;
  onClose: () => void;
  /** Initial location to center the map on — defaults to Marrakech city center */
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

// ── Moroccan city quick-access suggestions ────────────────────────────────────
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

// ── Nominatim reverse geocode ─────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "fr,ar;q=0.9,en;q=0.8" } }
    );
    const data: NominatimResult = await res.json();
    if (data?.display_name) {
      const a = data.address;
      // Build a concise label: "Road, Suburb, City"
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

// ── Nominatim forward search ──────────────────────────────────────────────────
async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)},Morocco&addressdetails=1&limit=5`,
      { headers: { "Accept-Language": "fr,ar;q=0.9,en;q=0.8" } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

// ── Pin SVG (custom branded Moroccan-red marker) ──────────────────────────────
const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(43,35,32,0.35)"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="M20 2C11.163 2 4 9.163 4 18c0 11 16 30 16 30S36 29 36 18C36 9.163 28.837 2 20 2z"
          fill="#c1440e" stroke="#fff" stroke-width="2"/>
    <circle cx="20" cy="18" r="7" fill="#fff" opacity="0.95"/>
    <circle cx="20" cy="18" r="4" fill="#c1440e"/>
  </g>
</svg>
`;

const PULSE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="rgba(193,68,14,0.15)" stroke="#c1440e" stroke-width="2"/>
  <circle cx="12" cy="12" r="4" fill="#c1440e"/>
</svg>
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeliveryLocationPicker({
  open,
  onConfirm,
  onClose,
  defaultCenter = [31.6295, -7.9811], // Marrakech
}: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<any>(null);        // L (Leaflet)
  const mapInstance = useRef<any>(null);        // L.Map
  const markerRef   = useRef<any>(null);        // L.Marker

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

  // ── Load Leaflet dynamically (SSR safe) ─────────────────────────────────

  useEffect(() => {
    if (!open) return;

    let destroyed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      leafletRef.current = L;

      if (destroyed || !mapRef.current || mapInstance.current) return;

      // Custom branded icon
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

      // Zoom control (bottom-right, away from the confirm button)
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution (minimal)
      L.control
        .attribution({ position: "bottomleft", prefix: "© OSM / CartoCDN" })
        .addTo(map);

      // Draggable pin
      const marker = L.marker(defaultCenter, {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // On drag end → reverse geocode new position
      marker.on("dragend", async () => {
        const { lat, lng } = marker.getLatLng();
        setIsReversing(true);
        const address = await reverseGeocode(lat, lng);
        setIsReversing(false);
        setLocation({ lat, lng, address });
      });

      // Tap on map to move pin
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

      // Initial reverse geocode
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
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Move map + marker to new coords ────────────────────────────────────

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

  // ── GPS: detect current position ─────────────────────────────────────

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée.");
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
            ? "Accès à la localisation refusé. Activez-le dans les paramètres."
            : "Impossible d'obtenir votre position."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [flyTo]);

  // ── Address search with debounce ──────────────────────────────────────

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

  // ── City quick-jump ───────────────────────────────────────────────────

  const handleCityJump = useCallback(
    async (city: (typeof MOROCCAN_CITIES)[0]) => {
      setShowCities(false);
      await flyTo(city.lat, city.lng);
    },
    [flyTo]
  );

  // ── Confirm ───────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!location.address) return;
    onConfirm(location);
  }, [location, onConfirm]);

  // ── Close on Escape ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="dlp-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir votre adresse de livraison"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dlp-sheet">
        {/* ── Header ── */}
        <div className="dlp-header">
          <div className="dlp-header-left">
            <MapPin size={20} className="dlp-header-icon" />
            <div>
              <h2 className="dlp-header-title">Adresse de livraison</h2>
              <p className="dlp-header-sub">Glissez le repère ou tapez une adresse</p>
            </div>
          </div>
          <button className="dlp-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* ── Search bar + GPS + City picker ── */}
        <div className="dlp-controls">
          {/* Search */}
          <div className="dlp-search-wrap">
            <Search size={16} className="dlp-search-icon" />
            <input
              id="dlp-search-input"
              className="dlp-search-input"
              type="text"
              placeholder="Chercher une rue, quartier, ville…"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoComplete="off"
            />
            {isSearching && <Loader2 size={16} className="dlp-search-spinner" />}
          </div>

          {/* Search dropdown */}
          {searchResults.length > 0 && (
            <ul className="dlp-search-dropdown" role="listbox">
              {searchResults.map((r, i) => (
                <li
                  key={i}
                  className="dlp-search-option"
                  role="option"
                  onClick={() => handleSearchSelect(r)}
                >
                  <MapPin size={14} className="dlp-search-option-icon" />
                  <span className="dlp-search-option-text">
                    {r.display_name.split(",").slice(0, 3).join(",")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* GPS + City row */}
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
              {isGpsLoading ? "Localisation…" : "Ma position"}
            </button>

            {/* City quick-jump */}
            <div className="dlp-city-wrap">
              <button
                id="dlp-city-btn"
                className="dlp-city-btn"
                onClick={() => setShowCities((s) => !s)}
              >
                Ville
                <ChevronDown
                  size={14}
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

          {/* GPS error */}
          {gpsError && (
            <div className="dlp-gps-error">
              <AlertCircle size={14} />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="dlp-map-container">
          <div ref={mapRef} className="dlp-map" id="dlp-leaflet-map" />

          {/* Crosshair hint overlay */}
          {!mapReady && (
            <div className="dlp-map-loading">
              <Loader2 size={28} className="dlp-spin" />
              <span>Chargement de la carte…</span>
            </div>
          )}

          {/* Instruction badge */}
          {mapReady && (
            <div className="dlp-map-hint" aria-hidden="true">
              Glissez le repère 📍 ou appuyez sur la carte
            </div>
          )}
        </div>

        {/* ── Address preview + Confirm ── */}
        <div className="dlp-footer">
          <div className="dlp-address-preview">
            {isReversing ? (
              <div className="dlp-address-loading">
                <Loader2 size={15} className="dlp-spin" />
                <span>Identification de l'adresse…</span>
              </div>
            ) : location.address ? (
              <>
                <MapPin size={16} className="dlp-address-pin" />
                <div className="dlp-address-text">
                  <span className="dlp-address-label">{location.address}</span>
                  <span className="dlp-address-coords">
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </span>
                </div>
              </>
            ) : (
              <span className="dlp-address-placeholder">Aucune adresse sélectionnée</span>
            )}
          </div>

          <button
            id="dlp-confirm-btn"
            className="dlp-confirm-btn"
            onClick={handleConfirm}
            disabled={!location.address || isReversing}
          >
            <CheckCircle2 size={18} />
            Confirmer cette adresse
          </button>
        </div>
      </div>

      {/* ── Scoped styles ── */}
      <style>{`
        /* ── Overlay ── */
        .dlp-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(43, 35, 32, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: dlp-fade-in 0.2s ease;
          padding: 0;
        }
        @keyframes dlp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Bottom sheet ── */
        .dlp-sheet {
          width: 100%;
          max-width: 600px;
          background: #fdfaf5;
          border-radius: 24px 24px 0 0;
          display: flex;
          flex-direction: column;
          max-height: 96dvh;
          overflow: hidden;
          animation: dlp-slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: 0 -8px 40px rgba(43,35,32,.18);
        }
        @keyframes dlp-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }

        /* ── Header ── */
        .dlp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px 14px;
          border-bottom: 1px solid #e4d5c1;
          gap: 12px;
        }
        .dlp-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .dlp-header-icon { color: #c1440e; flex-shrink: 0; }
        .dlp-header-title {
          font-family: 'Lalezar', sans-serif;
          font-size: 1.15rem;
          font-weight: 400;
          color: #2b2320;
          margin: 0 0 2px;
          line-height: 1.2;
        }
        .dlp-header-sub {
          font-size: 0.78rem;
          color: #a89070;
          margin: 0;
        }
        .dlp-close-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: none;
          background: #f0e6d8;
          color: #6b4c38;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .dlp-close-btn:hover { background: #e4d5c1; }

        /* ── Controls ── */
        .dlp-controls {
          padding: 14px 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          z-index: 10;
        }

        /* Search */
        .dlp-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .dlp-search-icon {
          position: absolute;
          left: 12px;
          color: #a89070;
          pointer-events: none;
        }
        .dlp-search-input {
          width: 100%;
          height: 44px;
          padding: 0 40px 0 38px;
          border: 1.5px solid #e4d5c1;
          border-radius: 12px;
          background: #fff;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.93rem;
          color: #2b2320;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dlp-search-input:focus {
          border-color: #c1440e;
          box-shadow: 0 0 0 3px rgba(193,68,14,.15);
        }
        .dlp-search-input::placeholder { color: #c9a882; }
        .dlp-search-spinner {
          position: absolute;
          right: 12px;
          color: #c1440e;
          animation: dlp-spin 0.8s linear infinite;
        }

        /* Search dropdown */
        .dlp-search-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: #fff;
          border: 1px solid #e4d5c1;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(43,35,32,.14);
          list-style: none;
          margin: 0;
          padding: 6px;
          z-index: 20;
          max-height: 220px;
          overflow-y: auto;
        }
        .dlp-search-option {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .dlp-search-option:hover { background: #fdf2ee; }
        .dlp-search-option-icon { color: #c1440e; flex-shrink: 0; margin-top: 2px; }
        .dlp-search-option-text {
          font-size: 0.85rem;
          color: #2b2320;
          line-height: 1.4;
        }

        /* GPS + City row */
        .dlp-action-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .dlp-gps-btn {
          flex: 1;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1.5px solid #1e5b8c;
          background: #eef4fb;
          color: #1e5b8c;
          border-radius: 10px;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
        }
        .dlp-gps-btn:hover:not(:disabled) { background: #d0e4f5; }
        .dlp-gps-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* City picker */
        .dlp-city-wrap { position: relative; }
        .dlp-city-btn {
          height: 40px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 5px;
          border: 1.5px solid #e4d5c1;
          background: #fff;
          color: #6b4c38;
          border-radius: 10px;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.15s, background 0.15s;
        }
        .dlp-city-btn:hover { border-color: #c1440e; background: #fdf2ee; }
        .dlp-city-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 160px;
          background: #fff;
          border: 1px solid #e4d5c1;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(43,35,32,.14);
          list-style: none;
          margin: 0;
          padding: 6px;
          z-index: 20;
          animation: dlp-fade-in 0.15s ease;
        }
        .dlp-city-option {
          padding: 9px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.87rem;
          color: #2b2320;
          transition: background 0.1s;
        }
        .dlp-city-option:hover { background: #fdf2ee; color: #c1440e; font-weight: 700; }

        /* GPS error */
        .dlp-gps-error {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #fdf2ee;
          border: 1px solid #f5bda5;
          border-radius: 8px;
          color: #a33a0c;
          font-size: 0.82rem;
        }

        /* ── Map ── */
        .dlp-map-container {
          position: relative;
          flex: 1;
          min-height: 280px;
        }
        .dlp-map {
          width: 100%;
          height: 100%;
          min-height: 280px;
        }
        .dlp-map-loading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(253,250,245,.85);
          z-index: 5;
          color: #6b4c38;
          font-size: 0.88rem;
        }
        .dlp-map-hint {
          position: absolute;
          bottom: 56px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(43,35,32,.78);
          color: #fff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.78rem;
          white-space: nowrap;
          pointer-events: none;
          z-index: 5;
          animation: dlp-fade-in 0.4s ease 0.6s both;
        }

        /* ── Footer ── */
        .dlp-footer {
          padding: 12px 16px max(16px, env(safe-area-inset-bottom));
          border-top: 1px solid #e4d5c1;
          background: #fdfaf5;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Address preview */
        .dlp-address-preview {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-height: 44px;
          padding: 10px 14px;
          background: #fff;
          border: 1.5px solid #e4d5c1;
          border-radius: 12px;
        }
        .dlp-address-pin { color: #c1440e; flex-shrink: 0; margin-top: 2px; }
        .dlp-address-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dlp-address-label {
          font-size: 0.93rem;
          font-weight: 700;
          color: #2b2320;
          line-height: 1.3;
        }
        .dlp-address-coords {
          font-size: 0.74rem;
          color: #a89070;
          font-family: 'Courier New', monospace;
        }
        .dlp-address-placeholder {
          font-size: 0.88rem;
          color: #c9a882;
          font-style: italic;
        }
        .dlp-address-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #a89070;
          font-size: 0.86rem;
        }

        /* Confirm button */
        .dlp-confirm-btn {
          width: 100%;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: linear-gradient(135deg, #c1440e 0%, #a33a0c 100%);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-family: 'Lalezar', sans-serif;
          font-size: 1.05rem;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(193,68,14,.35);
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .dlp-confirm-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(193,68,14,.45);
        }
        .dlp-confirm-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(193,68,14,.3);
        }
        .dlp-confirm-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ── Shared spin ── */
        .dlp-spin { animation: dlp-spin 0.8s linear infinite; }
        @keyframes dlp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Responsive ── */
        @media (min-width: 600px) {
          .dlp-overlay { align-items: center; padding: 20px; }
          .dlp-sheet {
            border-radius: 20px;
            max-height: 90dvh;
          }
          .dlp-map-container { min-height: 340px; }
          .dlp-map { min-height: 340px; }
        }
      `}</style>
    </div>
  );
}
