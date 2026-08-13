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
import type { DispatchStore } from "./types";

interface DispatchLocationPickerProps {
  lat: number | null;
  lng: number | null;
  stores: DispatchStore[];
  selectedStoreId: string | null;
  onChange: (lat: number, lng: number) => void;
  onSelectStore: (store: DispatchStore) => void;
}

const ULAANBAATAR_CENTER: LatLngExpression = [47.9188, 106.9176];

function MapInteraction({
  lat,
  lng,
  onChange,
}: Pick<DispatchLocationPickerProps, "lat" | "lng" | "onChange">) {
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

function StoreViewport({
  stores,
  hasDestination,
}: {
  stores: DispatchStore[];
  hasDestination: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (hasDestination || stores.length === 0) return;
    map.fitBounds(
      stores.map((store) => [store.lat, store.lng] as [number, number]),
      { padding: [32, 32], maxZoom: 12 },
    );
  }, [hasDestination, map, stores]);

  return null;
}

export function DispatchLocationPicker({
  lat,
  lng,
  stores,
  selectedStoreId,
  onChange,
  onSelectStore,
}: DispatchLocationPickerProps) {
  const center: LatLngExpression =
    lat !== null && lng !== null ? [lat, lng] : ULAANBAATAR_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={lat !== null ? 15 : 12}
      scrollWheelZoom
      className="h-full min-h-64 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteraction lat={lat} lng={lng} onChange={onChange} />
      <StoreViewport
        stores={stores}
        hasDestination={lat !== null && lng !== null}
      />
      {stores.map((store) => {
        const selected = store.id === selectedStoreId;
        return (
          <CircleMarker
            key={store.id}
            center={[store.lat, store.lng]}
            radius={selected ? 10 : 8}
            bubblingMouseEvents={false}
            pathOptions={{
              color: "#ffffff",
              fillColor: selected ? "#2563eb" : "#f97316",
              fillOpacity: 1,
              weight: 3,
            }}
            eventHandlers={{ click: () => onSelectStore(store) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="max-w-52">
                <strong>{store.name}</strong>
                <br />
                <span>{store.organization.name}</span>
                {store.address && (
                  <>
                    <br />
                    <span>{store.address}</span>
                  </>
                )}
                <br />
                <span className="font-semibold text-blue-600">
                  Сонгож бараа илгээх
                </span>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
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
