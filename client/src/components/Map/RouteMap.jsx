import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { makeStatusIcon } from './OrdersMap.jsx';
import MapLegend from './MapLegend.jsx';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/statusColors.js';
import { getUrgencyColor } from '../../lib/urgency.js';
import { useSettings } from '../../context/SettingsContext.jsx';

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

function formatClientName(order) {
  return [order.firstName, order.lastName].filter(Boolean).join(' ');
}

function formatAmount(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '';
  return Number(amount).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
}

function ClientInfoDetails({ order }) {
  const clientName = formatClientName(order);
  const amount = formatAmount(order.amount);

  return (
    <details style={{ marginTop: '8px' }}>
      <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>
        Rozwiń info klienta
      </summary>
      <div style={{
        marginTop: '6px',
        paddingTop: '6px',
        borderTop: '1px solid #e2e8f0',
        color: '#334155',
      }}>
        {clientName && <><strong>Klient:</strong> {clientName}<br /></>}
        {order.phone && (
          <>
            <strong>Telefon:</strong>{' '}
            <a href={`tel:${order.phone.replace(/\s/g, '')}`} style={{ color: '#2563eb' }}>{order.phone}</a><br />
          </>
        )}
        <strong>Adres:</strong> {[order.address, order.postalCode, order.city].filter(Boolean).join(', ') || 'brak'}<br />
        <strong>Status:</strong> {STATUS_LABEL[order.status] || order.status || 'brak'}<br />
        {order.deliveryDate && <><strong>Dostawa:</strong> {new Date(order.deliveryDate).toLocaleDateString('pl-PL')}<br /></>}
        {amount && <><strong>Kwota:</strong> {amount}<br /></>}
        {order.details && <><strong>Szczegóły:</strong> {order.details}</>}
      </div>
    </details>
  );
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

export default function RouteMap({ stops = [], backgroundOrders = [], onAddStop, onRemoveStop }) {
  const { settings } = useSettings();
  const [colorMode, setColorMode] = useState(settings.colorMode);

  useEffect(() => { setColorMode(settings.colorMode); }, [settings.colorMode]);

  const bgColorFor = (o) =>
    colorMode === 'urgency'
      ? getUrgencyColor(o.deliveryDate, settings.urgency)
      : STATUS_COLOR[o.status] || '#94a3b8';

  const validStops = useMemo(() => stops.filter((s) => s.lat != null && s.lng != null), [stops]);
  const stopPoints = useMemo(() => validStops.map((s) => [s.lat, s.lng]), [validStops]);

  const bgOrders = useMemo(
    () => backgroundOrders.filter(
      (o) => o.lat != null && o.lng != null && !stops.find((s) => s.id === o.id)
    ),
    [backgroundOrders, stops]
  );

  const allPoints = useMemo(
    () => [...stopPoints, ...bgOrders.map((o) => [o.lat, o.lng])],
    [stopPoints, bgOrders]
  );

  return (
    <div className="relative w-full h-full">

      {/* ── Przełącznik trybu koloru — centrum góry, zawsze widoczny ── */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] flex rounded-lg overflow-hidden shadow-md border border-slate-200 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setColorMode('urgency')}
          className={`px-3 py-1.5 transition-colors ${colorMode === 'urgency' ? 'bg-brand-600 text-white' : 'bg-white/95 text-slate-600 hover:bg-slate-50'}`}
        >
          Pilność
        </button>
        <button
          type="button"
          onClick={() => setColorMode('status')}
          className={`px-3 py-1.5 transition-colors ${colorMode === 'status' ? 'bg-brand-600 text-white' : 'bg-white/95 text-slate-600 hover:bg-slate-50'}`}
        >
          Status
        </button>
      </div>

      {/* ── Legenda — prawy dolny róg (nad mobilnym paskiem) ── */}
      <div className="absolute bottom-[72px] md:bottom-2 right-2 z-[500]">
        <MapLegend mode={colorMode} urgency={settings.urgency} />
      </div>

    <MapContainer
      center={POLAND_CENTER}
      zoom={6}
      scrollWheelZoom
      className="route-page-map"
      style={{ height: '100%', width: '100%', minHeight: '300px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* tłowe zamówienia — klikalne, jeśli przekazano onAddStop */}
      {bgOrders.map((o) => (
        <Marker
          key={o.id}
          position={[o.lat, o.lng]}
          icon={makeStatusIcon(bgColorFor(o))}
          opacity={onAddStop ? 0.65 : 0.4}
        >
          <Popup>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              <strong>{o.title}</strong><br />
              {o.firstName || o.lastName ? <>{o.firstName} {o.lastName}<br /></> : null}
              <span style={{ color: '#64748b' }}>{o.address}, {o.postalCode} {o.city}</span>
              {o.deliveryDate && (
                <><br />Dostawa: {new Date(o.deliveryDate).toLocaleDateString('pl-PL')}</>
              )}
              {o.phone && (
                <><br /><a href={`tel:${o.phone.replace(/\s/g,'')}`} style={{color:'#2563eb'}}>📞 {o.phone}</a></>
              )}
              <ClientInfoDetails order={o} />
              {onAddStop && (
                <div style={{ marginTop: '6px' }}>
                  <button
                    onClick={() => onAddStop(o)}
                    style={{
                      background: '#2563eb', color: 'white', border: 'none',
                      borderRadius: '5px', padding: '4px 10px', fontSize: '12px',
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    + Dodaj do trasy
                  </button>
                </div>
              )}
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
              <ClientInfoDetails order={stop} />
              {onRemoveStop && (
                <div style={{ marginTop: '6px' }}>
                  <button
                    onClick={() => onRemoveStop(stop.id)}
                    style={{
                      background: '#dc2626', color: 'white', border: 'none',
                      borderRadius: '5px', padding: '4px 10px', fontSize: '12px',
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    Usuń z trasy
                  </button>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <MapController points={allPoints.length ? allPoints : [POLAND_CENTER]} />
    </MapContainer>
    </div>
  );
}
