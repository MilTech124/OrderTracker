import { useMemo, useState } from 'react';
import {
  X, Navigation, Share2, MessageCircle, ClipboardCheck, Check,
  Truck, UserRound, Calendar, Banknote, AlertTriangle,
} from 'lucide-react';
import RouteMap from '../Map/RouteMap.jsx';
import { buildRouteStages, formatAddress } from '../../lib/googleMapsLink.js';
import { buildShareText } from '../../lib/routeShare.js';
import { ROUTE_STATUS_LABEL } from '../../lib/routeStatus.js';

export default function RouteDetailsModal({ route, onClose }) {
  const [completedStages, setCompletedStages] = useState([]);
  const [shareStatus, setShareStatus] = useState('idle');

  // RouteMap i listy wymagają pola `id` — snapshoty mają tylko `orderId`
  const stops = useMemo(
    () => (route?.stops || []).map((s, i) => ({ ...s, id: s.orderId || `stop-${i}` })),
    [route],
  );
  const stages = useMemo(() => buildRouteStages(stops), [stops]);
  const isMultiStage = stages.length > 1;

  const shareText = useMemo(
    () => buildShareText(stages, stops, {
      title: route?.title,
      driverName: route?.driver?.fullName || route?.driver?.email,
    }),
    [stages, stops, route],
  );

  if (!route) return null;

  function openStage(index) {
    const stage = stages[index];
    if (!stage) return;
    window.open(stage.url, '_blank', 'noopener');
    if (!completedStages.includes(index)) setCompletedStages((p) => [...p, index]);
  }
  function openNextStage() {
    const next = stages.findIndex((_, i) => !completedStages.includes(i));
    openStage(next === -1 ? 0 : next);
  }

  async function handleShare() {
    if (!stops.length) return;
    if (navigator.share) {
      try { await navigator.share({ title: route.title, text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  }
  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="card max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Nagłówek */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 text-lg leading-tight truncate">{route.title}</h2>
              <span className={`badge badge-${route.status}`}>{ROUTE_STATUS_LABEL[route.status]}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
              {route.vehicle && (
                <span className="flex items-center gap-1"><Truck size={12} /> {route.vehicle.name} ({route.vehicle.plate})</span>
              )}
              {route.driver && (
                <span className="flex items-center gap-1"><UserRound size={12} /> {route.driver.fullName || route.driver.email}</span>
              )}
              {route.plannedDate && (
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(route.plannedDate).toLocaleDateString('pl-PL')}</span>
              )}
              {route.totalAmount > 0 && (
                <span className="flex items-center gap-1"><Banknote size={12} /> {route.totalAmount.toLocaleString('pl-PL')} zł</span>
              )}
            </div>
          </div>
          {stops.length > 0 && (
            <button onClick={openNextStage} className="btn btn-primary text-xs py-2 px-3 shrink-0">
              <Navigation size={14} />
              {isMultiStage
                ? `Etap ${(stages.findIndex((_, i) => !completedStages.includes(i)) + 1) || 1}/${stages.length}`
                : 'Nawiguj'}
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost p-1.5 text-slate-400 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Mapa */}
        <div className="h-64 md:h-80 shrink-0 border-b border-slate-100">
          <RouteMap stops={stops} backgroundOrders={[]} />
        </div>

        {/* Etapy (multi-stage) */}
        {isMultiStage && (
          <div className="px-5 pt-4 shrink-0 space-y-2">
            <div className="flex items-start gap-2 p-2.5 bg-yellow-50 text-yellow-800 text-xs rounded-xl border border-yellow-200">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>Podzielono na <b>{stages.length} etapy</b> (limit Google Maps: 10 pkt/link)</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {stages.map((stage, idx) => {
                const isDone = completedStages.includes(idx);
                const isNext = !isDone && stages.findIndex((_, i) => !completedStages.includes(i)) === idx;
                return (
                  <button key={idx} onClick={() => openStage(idx)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-sm transition-colors ${
                      isNext ? 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700' :
                      isDone ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' :
                               'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isNext ? 'bg-white text-brand-700' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isDone ? <Check size={12} /> : idx + 1}
                    </span>
                    <span className="font-medium">Etap {idx + 1}</span>
                    <span className={`text-xs ${isNext ? 'text-white/70' : 'opacity-60'}`}>({stage.stops.length} pkt)</span>
                    <Navigation size={12} className="ml-auto shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista przystanków */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="label">Przystanki ({stops.length})</p>
          <ul className="space-y-2">
            {stops.map((stop, idx) => {
              const name = [stop.firstName, stop.lastName].filter(Boolean).join(' ');
              return (
                <li key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/70 bg-white">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white ${
                    idx === 0 ? 'bg-emerald-600' : idx === stops.length - 1 ? 'bg-red-600' : 'bg-brand-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{stop.title}{name ? ` — ${name}` : ''}</p>
                    <p className="text-xs text-slate-500 truncate">{formatAddress(stop) || '(brak adresu)'}</p>
                  </div>
                  {stop.phone && (
                    <a href={`tel:${stop.phone.replace(/\s/g, '')}`}
                      className="text-xs text-brand-600 hover:underline shrink-0">
                      {stop.phone}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Stopka udostępniania */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <button onClick={handleShare} className="btn btn-secondary text-sm flex-1 justify-center">
            {shareStatus === 'copied'
              ? <><ClipboardCheck size={14} className="text-emerald-600" /> Skopiowano</>
              : <><Share2 size={14} /> Udostępnij</>}
          </button>
          <button onClick={handleWhatsApp}
            className="btn text-sm px-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0">
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
