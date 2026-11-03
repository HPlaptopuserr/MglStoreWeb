"use client";
import { useEffect, useRef, useState } from "react";
import type { Map, Marker, Circle, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lng: number;
}
interface Props extends MapPoint {
  radius: number;
  onChange: (point: MapPoint) => void;
}

export default function LocationMap({ lat, lng, radius, onChange }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef<{
    map: Map;
    marker: Marker;
    circle: Circle;
    tiles: TileLayer;
  } | null>(null);
  const latest = useRef({ lat, lng, radius, onChange });
  latest.current = { lat, lng, radius, onChange };
  const [status, setStatus] = useState("Газрын зураг ачаалж байна…");
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        const value = latest.current;
        const map = L.map(container.current).setView(
          [value.lat, value.lng],
          15,
        );
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        );
        tiles.on("load", () => setStatus(""));
        tiles.on("tileerror", () =>
          setStatus(
            "Зураг ачаалахад алдаа гарлаа. Сүлжээгээ шалгаад дахин оролдоно уу.",
          ),
        );
        tiles.addTo(map);
        const marker = L.marker([value.lat, value.lng], {
          draggable: true,
          title: "Байршлын pin — чирж зөөнө үү",
          icon: L.divIcon({
            className: "wf-location-pin",
            html: "<span></span>",
            iconSize: [28, 36],
            iconAnchor: [14, 36],
          }),
        }).addTo(map);
        const circle = L.circle([value.lat, value.lng], {
          radius: value.radius,
          color: "#777dff",
          fillOpacity: 0.18,
        }).addTo(map);
        map.on("click", (event: L.LeafletMouseEvent) =>
          latest.current.onChange({
            lat: Number(event.latlng.lat.toFixed(6)),
            lng: Number(event.latlng.wrap().lng.toFixed(6)),
          }),
        );
        marker.on("dragend", () => {
          const point = marker.getLatLng().wrap();
          latest.current.onChange({
            lat: Number(point.lat.toFixed(6)),
            lng: Number(point.lng.toFixed(6)),
          });
        });
        layers.current = { map, marker, circle, tiles };
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (!disposed)
          setStatus(
            "Газрын зураг ачаалагдсангүй. Координатаа гараар оруулж болно.",
          );
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      layers.current?.map.remove();
      layers.current = null;
    };
  }, []);
  useEffect(() => {
    const current = layers.current;
    if (!current) return;
    current.marker.setLatLng([lat, lng]);
    current.circle.setLatLng([lat, lng]).setRadius(radius);
    if (!current.map.getBounds().contains([lat, lng]))
      current.map.panTo([lat, lng]);
  }, [lat, lng, radius]);
  return (
    <section className="wf-location-map-picker">
      <p className="wf-muted">
        Зураг дээр дарж pin тавих эсвэл pin-ээ чирж зөөнө үү. Тойрог нь цаг
        бүртгэх бүс.
      </p>
      <div
        ref={container}
        className="wf-location-map"
        aria-label="Байршил сонгох газрын зураг"
      />
      {status && (
        <p role="status" className="wf-muted">
          {status}{" "}
          <button type="button" onClick={() => layers.current?.tiles.redraw()}>
            Дахин ачаалах
          </button>
        </p>
      )}
    </section>
  );
}
