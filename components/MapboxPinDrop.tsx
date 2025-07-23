"use client";
import React, { useRef, useEffect, useCallback, forwardRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-map-gl for client-side only
const Map = dynamic(() => import("react-map-gl").then(mod => mod.Map), { ssr: false });
const Marker = dynamic(() => import("react-map-gl").then(mod => mod.Marker), { ssr: false });

interface MapboxPinDropProps {
  lat: number | null;
  lng: number | null;
  onPinDrop: (lat: number, lng: number) => void;
  center?: [number, number] | null; // [lng, lat]
  mapboxToken: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  /**
   * Optional callback: called after reverse geocoding when pin is dropped.
   * Receives (address, pincode) from Mapbox API.
   */
  onReverseGeocode?: (address: string, pincode: string) => void;
  /**
   * Optional bounding box: [minLng, minLat, maxLng, maxLat].
   * If set, restricts pin-drop to this area.
   */
  bounds?: [number, number, number, number];
}

/**
 * MapboxPinDrop - Shared Mapbox map with pin-drop logic and optional reverse geocoding
 *
 * Props:
 * - lat, lng: current pin position (null for no pin)
 * - onPinDrop: callback when user drops a pin (clicks map)
 * - center: initial map center ([lng, lat]), defaults to India if not set or invalid
 * - mapboxToken: Mapbox access token
 * - disabled: if true, disables pin drop
 * - style, className: for container styling
 * - onReverseGeocode: optional callback for reverse geocoding results
 * - bounds: optional bounding box for pin drop
 */
const MapboxPinDrop = forwardRef<any, MapboxPinDropProps>(function MapboxPinDrop(
  {
  lat,
  lng,
  onPinDrop,
  center,
  mapboxToken,
  disabled,
  style,
  className,
  onReverseGeocode,
  bounds
  },
  ref
) {
  const mapRef = useRef<any>(null);
  // Fallback to India center if center is missing or invalid
  const safeCenter =
    Array.isArray(center) && center.length === 2 &&
    typeof center[0] === 'number' && typeof center[1] === 'number'
      ? center
      : [78.9629, 20.5937];
  const initialViewState = {
    longitude: safeCenter[0],
    latitude: safeCenter[1],
    zoom: lat && lng ? 14 : 12,
  };

  // Expose the map ref to parent
  useEffect(() => {
    if (typeof ref === "function") {
      ref(mapRef.current);
    } else if (ref) {
      (ref as React.MutableRefObject<any>).current = mapRef.current;
    }
  }, [ref]);

  // Handle pin drop with bounds check
  const handleMapClick = useCallback(async (e: any) => {
    if (disabled) return;
    const { lngLat } = e;
    if (lngLat && typeof lngLat.lng === "number" && typeof lngLat.lat === "number") {
      // If bounds are set, restrict pin drop
      if (bounds) {
        const [minLng, minLat, maxLng, maxLat] = bounds;
        if (
          lngLat.lat < minLat || lngLat.lat > maxLat ||
          lngLat.lng < minLng || lngLat.lng > maxLng
        ) {
          // Optionally show a toast or error here
          return;
        }
      }
      onPinDrop(lngLat.lat, lngLat.lng);
      // Reverse geocode using Mapbox API
      if (onReverseGeocode && mapboxToken) {
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxToken}`;
          const res = await fetch(url);
          const data = await res.json();
          let address = "";
          let pincode = "";
          if (data.features && data.features.length > 0) {
            address = data.features[0].place_name || "";
            for (const ctx of data.features[0].context || []) {
              if (ctx.id && ctx.id.startsWith("postcode")) {
                pincode = ctx.text;
                break;
              }
            }
          }
          onReverseGeocode(address, pincode);
        } catch {
          onReverseGeocode("", "");
        }
      }
    }
  }, [onPinDrop, onReverseGeocode, mapboxToken, disabled, bounds]);

  // Always recenter the map when center prop changes
  useEffect(() => {
    if (mapRef.current && safeCenter && typeof window !== 'undefined') {
      try {
        mapRef.current?.flyTo({ center: safeCenter, zoom: 12 });
      } catch {}
    }
  }, [safeCenter]);

  return (
    <div className={className} style={{ width: '100%', height: 300, borderRadius: 8, ...style }}>
      {mapboxToken && typeof window !== 'undefined' && (
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          style={{ width: '100%', height: 300, borderRadius: 8 }}
          onClick={handleMapClick}
        >
          {lat !== null && lng !== null && (
            <Marker longitude={lng} latitude={lat} anchor="bottom">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#2563eb" fillOpacity="0.7" />
                <rect x="14" y="8" width="4" height="12" rx="2" fill="#fff" />
                <circle cx="16" cy="24" r="2" fill="#fff" />
              </svg>
            </Marker>
          )}
        </Map>
      )}
    </div>
  );
});

export default MapboxPinDrop; 