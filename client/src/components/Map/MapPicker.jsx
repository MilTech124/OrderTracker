import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pickerIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#2563eb;width:20px;height:20px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapPicker({ value, onChange }) {
  const center = value ? [value.lat, value.lng] : [52.0693, 19.4803];
  const zoom = value ? 13 : 6;

  return (
    <div className="rounded-md overflow-hidden border border-slate-300" style={{ height: 260 }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
        {value && <Marker position={[value.lat, value.lng]} icon={pickerIcon} />}
      </MapContainer>
    </div>
  );
}
