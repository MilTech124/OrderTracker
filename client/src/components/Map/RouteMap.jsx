import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { makeStatusIcon } from './OrdersMap.jsx';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/statusColors.js';

const POLAND_CENTER = [52.0693, 19.4803];

function makeNumberIcon(index, total) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const bg = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#2563eb';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};color:white;
      width:28px;height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);font-size:11px;font-weight:700;">${index + 1}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function MapController({ points }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  });

  useEffect(() => {
    if (points.length === 0) {
      map.setView(POLAND_CENTER, 6);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    }
  }, [JSON.stringify(points)]);

  return null;
}

export default function RouteMap({ stops = [], backgroundOrders = [] }) {
  const validStops = useMemo(() => stops.filter((s) => s.lat && s.lng), [stops]);
  const stopPoints = useMemo(() => validStops.map((s) => [s.lat, s.lng]), [validStops]);

  const bgOrders = useMemo(
    () => backgroundOrders.filter(
      (o) => o.lat && o.lng && !stops.find((s) => s.id === o.id)
    ),
    [backgroundOrders, stops]
  );

  const allPoints = useMemo(
    () => [...stopPoints, ...bgOrders.map((o) => [o.lat, o.lng])],
    [stopPoints, bgOrders]
  );

  return (
    <MapContainer
      center={POLAND_CENTER}
      zoom={6}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', minHeight: '300px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* tłowe zamówienia */}
      {bgOrders.map((o) => (
        <Marker
          key={o.id}
          position={[o.lat, o.lng]}
          icon={makeStatusIcon(STATUS_COLOR[o.status] || '#94a3b8')}
          opacity={0.4}
        >
          <Popup>
            <div style={{ fontSize: '13px' }}>
              <strong>{o.title}</strong><br />
              <span style={{ color: '#64748b' }}>{o.address}, {o.city}</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* linia trasy */}
      {stopPoints.length > 1 && (
        <Polyline
          positions={stopPoints}
          pathOptions={{ color: '#2563eb', weight: 3, dashArray: '8 6', opacity: 0.85 }}
        />
      )}

      {/* numerowane piny trasy */}
      {validStops.map((stop, idx) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={makeNumberIcon(idx, validStops.length)}
        >
          <Popup>
            <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
              <strong>#{idx + 1} — {stop.title}</strong><br />
              {stop.firstName} {stop.lastName}<br />
              <span style={{ color: '#64748b' }}>{stop.address}, {stop.postalCode} {stop.city}</span><br />
              Status: <strong>{STATUS_LABEL[stop.status]}</strong>
              {stop.deliveryDate && (
                <><br />Dostawa: {new Date(stop.deliveryDate).toLocaleDateString('pl-PL')}</>
              )}
              {stop.phone && (
                <><br /><a href={`tel:${stop.phone.replace(/\s/g,'')}`} style={{color:'#2563eb'}}>📞 {stop.phone}</a></>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <MapController points={allPoints.length ? allPoints : [POLAND_CENTER]} />
    </MapContainer>
  );
}
