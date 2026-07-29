"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

interface DispatchLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const ULAANBAATAR_CENTER: LatLngExpression = [47.9188, 106.9176];

function MapInteraction({ lat, lng, onChange }: DispatchLocationPickerProps) {
  const map = useMap();

  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });

  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [lat, lng, map]);

  return null;
}

export function DispatchLocationPicker({
  lat,
  lng,
  onChange,
}: DispatchLocationPickerProps) {
  const center: LatLngExpression =
    lat !== null && lng !== null ? [lat, lng] : ULAANBAATAR_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={lat !== null ? 15 : 12}
      scrollWheelZoom
      className="h-full min-h-72 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteraction lat={lat} lng={lng} onChange={onChange} />
      {lat !== null && lng !== null && (
        <CircleMarker
          center={[lat, lng]}
          radius={11}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#2563eb",
            fillOpacity: 1,
            weight: 4,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]}>
            Хүргэх цэг
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
