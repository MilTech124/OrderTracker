import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/statusColors.js';

export function makeStatusIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:18px;height:18px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}

/** Automatyczne dopasowanie widoku + invalidateSize po mount */
function MapController({ points }) {
  const map = useMap();

  useEffect(() => {
    // Wymuszamy przeliczenie rozmiaru kontenera po każdym renderze
    setTimeout(() => map.invalidateSize(), 0);
  });

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [JSON.stringify(points)]);

  return null;
}

const POLAND_CENTER = [52.0693, 19.4803];

export default function OrdersMap({ orders, onMarkerClick }) {
  const mapped = useMemo(() => orders.filter((o) => o.lat && o.lng), [orders]);
  const points = useMemo(() => mapped.map((o) => [o.lat, o.lng]), [mapped]);

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
      <MarkerClusterGroup chunkedLoading>
        {mapped.map((o) => (
          <Marker
            key={o.id}
            position={[o.lat, o.lng]}
            icon={makeStatusIcon(STATUS_COLOR[o.status] || '#3b82f6')}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(o) } : undefined}
          >
            <Popup>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong>{o.title}</strong><br />
                {o.firstName} {o.lastName}<br />
                <span style={{ color: '#64748b' }}>{o.address}, {o.postalCode} {o.city}</span><br />
                Status: <strong>{STATUS_LABEL[o.status]}</strong>
                {o.deliveryDate && (
                  <><br />Dostawa: {new Date(o.deliveryDate).toLocaleDateString('pl-PL')}</>
                )}
                {o.phone && (
                  <><br /><a href={`tel:${o.phone.replace(/\s/g,'')}`} style={{color:'#2563eb'}}>📞 {o.phone}</a></>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      <MapController points={points} />
    </MapContainer>
  );
}
