"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { LeafletMouseEvent } from "leaflet";

interface MapDropPinProps {
  lat: number | null;
  lng: number | null;
  onPinDrop: (lat: number, lng: number) => void;
  mapId?: string;
}

const PinDropper = ({ lat, lng, onPinDrop }: { lat: number | null; lng: number | null; onPinDrop: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPinDrop(e.latlng.lat, e.latlng.lng);
    },
  });
  // icon prop is supported in react-leaflet v4+
  return lat && lng ? (
    <Marker
      position={[lat, lng]}
      icon={L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })}
    />
  ) : null;
};

export default function MapDropPin({ lat, lng, onPinDrop, mapId = "map-drop-pin" }: MapDropPinProps) {
  // Fix for leaflet icon not showing in some setups
  useEffect(() => {
    (async () => {
      // @ts-ignore
      if (typeof window !== "undefined" && L && L.Icon && L.Icon.Default) {
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
        });
      }
    })();
  }, []);

  // Clean up map container to prevent 'already initialized' error
  useEffect(() => {
    if (typeof window !== "undefined" && L && L.DomUtil) {
      const container = L.DomUtil.get(mapId);
      if (container && (container as any)._leaflet_id) {
        try {
          delete (container as any)._leaflet_id;
        } catch {}
      }
    }
    return () => {
      if (typeof window !== "undefined" && L && L.DomUtil) {
        const container = L.DomUtil.get(mapId);
        if (container && container.parentNode) {
          try {
            container.parentNode.removeChild(container);
          } catch {}
        }
      }
    };
  }, [mapId]);

  // center prop is supported in react-leaflet v4+
  return (
    <MapContainer
      id={mapId}
      center={[lat ?? 20.5937, lng ?? 78.9629]}
      zoom={lat && lng ? 14 : 5}
      style={{ height: 300, width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <PinDropper lat={lat} lng={lng} onPinDrop={onPinDrop} />
    </MapContainer>
  );
} 