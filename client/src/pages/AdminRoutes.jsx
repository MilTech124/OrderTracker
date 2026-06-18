import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Navigation, Check, Share2, MessageCircle, ClipboardCheck,
  SlidersHorizontal, X, List,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { api } from '../lib/api.js';
import RouteMap from '../components/Map/RouteMap.jsx';
import RouteStopsList from '../components/Route/RouteStopsList.jsx';
import { buildRouteStages, formatAddress } from '../lib/googleMapsLink.js';
import { STATUS_LABEL, STATUS_LIST } from '../lib/statusColors.js';

function buildShareText(stages, stops) {
  const total = stops.length;
  const multiStage = stages.length > 1;
  let text = `🚚 Trasa dostawy — ${total} ${total === 1 ? 'przystanek' : total < 5 ? 'przystanki' : 'przystanków'}`;
  if (multiStage) text += ` (${stages.length} etapy)`;
  text += '\n\n';
  stages.forEach((stage, idx) => {
    if (multiStage) text += `📍 Etap ${idx + 1}/${stages.length} (przystanki ${stage.from}–${stage.to}):\n`;
    stage.stops.forEach((stop, i) => {
      const num = stage.from + i;
      const name = [stop.firstName, stop.lastName].filter(Boolean).join(' ');
      const addr = formatAddress(stop);
      text += `${num}. ${name ? name + ' — ' : ''}${addr || stop.title}\n`;
    });
    text += `\n🗺️ Nawigacja:\n${stage.url}\n`;
    if (idx < stages.length - 1) text += '\n';
  });
  return text.trim();
}

export default function AdminRoutes() {
  const [users, setUsers]   = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterUser, setFilterUser]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [stopsOrder, setStopsOrder]   = useState([]);

  // ── Layout ─────────────────────────────────────────────────────────────────
  const [showLeft,    setShowLeft]    = useState(true);   // desktop left panel
  const [showRight,   setShowRight]   = useState(false);  // desktop right drawer
  const [showFilters, setShowFilters] = useState(false);  // filter bar (shared)
  const [mobileSheet, setMobileSheet] = useState(null);   // null | 'orders' | 'route'

  // ── Route stages ──────────────────────────────────────────────────────────
  const [completedStages, setCompletedStages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('routeCompletedStages') || '[]'); }
    catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem('routeCompletedStages', JSON.stringify(completedStages));
  }, [completedStages]);

  const [shareStatus, setShareStatus] = useState('idle');

  // ── Data ──────────────────────────────────────────────────────────────────
  async function loadOrders() {
    setLoading(true);
    try {
      const params = {};
      if (filterUser)     params.userId   = filterUser;
      if (filterStatus)   params.status   = filterStatus;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo)   params.dateTo   = filterDateTo;
      const { data } = await api.get('/orders', { params });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { api.get('/users').then(r => setUsers(r.data)); }, []);
  useEffect(() => { loadOrders(); }, [filterUser, filterStatus, filterDateFrom, filterDateTo]);

  // ── Selection / stops ─────────────────────────────────────────────────────
  const prevStopsLen = useRef(0);

  function toggleSelect(orderId) {
    const isSelected = selectedIds.includes(orderId);
    if (isSelected) {
      setSelectedIds(p => p.filter(id => id !== orderId));
      setStopsOrder(p => p.filter(id => id !== orderId));
    } else {
      setSelectedIds(p => [...p, orderId]);
      setStopsOrder(p => [...p, orderId]);
    }
  }
  function removeStop(orderId) {
    setSelectedIds(p => p.filter(id => id !== orderId));
    setStopsOrder(p => p.filter(id => id !== orderId));
  }
  function reorderStops(newArr) {
    setStopsOrder(newArr.map(s => s.id));
  }

  const orderById = useMemo(() => {
    const m = {}; orders.forEach(o => { m[o.id] = o; }); return m;
  }, [orders]);

  const stops = useMemo(
    () => stopsOrder.map(id => orderById[id]).filter(Boolean),
    [stopsOrder, orderById],
  );

  const stages      = useMemo(() => buildRouteStages(stops), [stops]);
  const isMultiStage = stages.length > 1;

  // Auto-open right drawer when first stop added; auto-open route sheet on mobile
  useEffect(() => {
    if (stops.length > 0 && prevStopsLen.current === 0) {
      setShowRight(true);
    }
    prevStopsLen.current = stops.length;
  }, [stops.length]);

  // Reset completed stages when route changes
  useEffect(() => { setCompletedStages([]); }, [stopsOrder.join(',')]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function openStage(index) {
    const stage = stages[index];
    if (!stage) return;
    window.open(stage.url, '_blank', 'noopener');
    if (!completedStages.includes(index)) setCompletedStages(p => [...p, index]);
  }
  function openNextStage() {
    const next = stages.findIndex((_, i) => !completedStages.includes(i));
    openStage(next === -1 ? 0 : next);
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareText = useMemo(() => buildShareText(stages, stops), [stages, stops]);

  async function handleShare() {
    if (!stops.length) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Trasa dostawy', text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  }
  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const activeFilters = [filterUser, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;
  function clearFilters() {
    setFilterUser(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo('');
  }

  // ── Sub-renders ───────────────────────────────────────────────────────────

  function FiltersBlock({ compact = false }) {
    return (
      <div className={`space-y-2 ${compact ? '' : 'p-3 border-b border-slate-200/60 bg-slate-50/70'}`}>
        <select className="input text-sm py-2" value={filterUser}
          onChange={e => setFilterUser(e.target.value)}>
          <option value="">Wszyscy użytkownicy</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
        </select>
        <select className="input text-sm py-2" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Dowolny status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="input text-sm py-2" value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)} />
          <input type="date" className="input text-sm py-2" value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)} />
        </div>
        {activeFilters > 0 && (
          <button onClick={clearFilters} className="text-xs text-red-600 hover:underline">
            Wyczyść filtry
          </button>
        )}
      </div>
    );
  }

  function OrdersList() {
    if (loading) return <p className="text-sm text-slate-500 text-center py-6">Ładowanie…</p>;
    if (!orders.length) return <p className="text-sm text-slate-500 text-center py-6">Brak zamówień dla filtrów.</p>;
    return (
      <ul className="p-2 space-y-1">
        {orders.map(o => (
          <li key={o.id} onClick={() => toggleSelect(o.id)}
            className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors min-h-[52px] ${
              selectedIds.includes(o.id)
                ? 'bg-brand-50 border border-brand-300'
                : 'hover:bg-slate-100/80 border border-transparent'
            }`}
          >
            <input type="checkbox" readOnly checked={selectedIds.includes(o.id)}
              className="mt-1 w-4 h-4 shrink-0 accent-blue-600"
              onClick={e => e.stopPropagation()} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm leading-tight truncate">{o.title}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{formatAddress(o) || '— brak adresu —'}</p>
              <span className={`badge badge-${o.status} mt-1`}>{STATUS_LABEL[o.status]}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function StageButtons() {
    if (!isMultiStage) return null;
    return (
      <div className="p-3 border-b border-slate-200/60 space-y-2 shrink-0">
        <div className="flex items-start gap-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded-xl border border-yellow-200">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Podzielono na <b>{stages.length} etapy</b> (limit Google Maps: 10 pkt/link)</span>
        </div>
        <div className="space-y-1">
          {stages.map((stage, idx) => {
            const isDone = completedStages.includes(idx);
            const isNext = !isDone && stages.findIndex((_, i) => !completedStages.includes(i)) === idx;
            return (
              <button key={idx} onClick={() => openStage(idx)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-sm transition-colors ${
                  isNext  ? 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700' :
                  isDone  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' :
                            'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isNext ? 'bg-white text-brand-700' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isDone ? <Check size={12} /> : idx + 1}
                </div>
                <span className="font-medium">Etap {idx + 1}</span>
                <span className={`text-xs ${isNext ? 'text-white/70' : 'opacity-60'}`}>
                  ({stage.stops.length} pkt)
                </span>
                <Navigation size={12} className="ml-auto shrink-0" />
              </button>
            );
          })}
          {completedStages.length > 0 && (
            <button onClick={() => setCompletedStages([])} className="text-xs text-slate-500 hover:underline px-1">
              Zresetuj postęp
            </button>
          )}
        </div>
      </div>
    );
  }

  function RouteBody() {
    if (!stops.length) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-400 flex items-center justify-center mb-3">
            <Navigation size={22} />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Zaznacz zamówienia z listy<br />aby budować trasę
          </p>
        </div>
      );
    }
    return (
      <>
        <p className="text-xs text-slate-400 mb-2">Przeciągnij aby zmienić kolejność.</p>
        <RouteStopsList stops={stops} onReorder={reorderStops} onRemove={removeStop} />
      </>
    );
  }

  function RouteFooter() {
    if (!stops.length) return null;
    return (
      <div className="p-3 border-t border-slate-200/60 shrink-0 flex gap-2">
        <button onClick={handleShare} className="btn btn-secondary text-xs py-2 flex-1 justify-center">
          {shareStatus === 'copied'
            ? <><ClipboardCheck size={13} className="text-emerald-600" /> Skopiowano</>
            : <><Share2 size={13} /> Udostępnij</>}
        </button>
        <button onClick={handleWhatsApp}
          className="btn text-xs py-2 px-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0">
          <MessageCircle size={13} /> WA
        </button>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ══════════ MAPA FULLSCREEN ══════════ */}
      <div className="absolute inset-0 z-0">
        <RouteMap
          stops={stops}
          backgroundOrders={orders}
          onAddStop={o => toggleSelect(o.id)}
          onRemoveStop={removeStop}
        />
      </div>

      {/* ══════════ DESKTOP — LEWY PANEL (ZAMÓWIENIA) ══════════ */}
      <div className={`
        hidden md:flex absolute top-0 left-0 bottom-0 flex-col z-[900]
        w-64 lg:w-80 bg-white/80 backdrop-blur-md
        border-r border-slate-200/50 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${showLeft ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200/60 shrink-0">
          <span className="font-bold text-slate-900 flex-1 text-sm">
            Zamówienia
            <span className="ml-1.5 text-slate-400 font-normal">({orders.length})</span>
          </span>
          <button
            onClick={() => setShowFilters(v => !v)}
            title="Filtry"
            className={`btn btn-ghost p-1.5 relative ${activeFilters > 0 ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-600 text-white text-[9px] rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button onClick={() => setShowLeft(false)} className="btn btn-ghost p-1.5 text-slate-400">
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* Filters (collapsible) */}
        {showFilters && <FiltersBlock />}

        {/* Orders */}
        <div className="flex-1 overflow-y-auto">
          <OrdersList />
        </div>
      </div>

      {/* Desktop: toggle left when closed */}
      {!showLeft && (
        <button
          onClick={() => setShowLeft(true)}
          className="hidden md:flex absolute left-3 top-3 z-[950] btn btn-secondary bg-white/85 backdrop-blur-sm shadow-lg text-sm py-2"
        >
          <PanelLeftOpen size={15} />
          Zamówienia
          {orders.length > 0 && <span className="text-slate-400">({orders.length})</span>}
        </button>
      )}

      {/* ══════════ DESKTOP — PRAWY DRAWER (TRASA) ══════════ */}
      <div className={`
        hidden md:flex absolute top-0 right-0 bottom-0 flex-col z-[900]
        w-64 lg:w-80 bg-white/88 backdrop-blur-md
        border-l border-slate-200/50 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${showRight ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200/60 shrink-0">
          <button onClick={() => setShowRight(false)} className="btn btn-ghost p-1.5 text-slate-400">
            <PanelRightClose size={15} />
          </button>
          <span className="font-bold text-slate-900 flex-1 text-sm">
            Trasa
            <span className="ml-1.5 text-slate-400 font-normal">({stops.length} pkt)</span>
          </span>
          {stops.length > 0 && !isMultiStage && (
            <button onClick={openNextStage} className="btn btn-primary text-xs py-1.5 px-2.5">
              <Navigation size={13} /> Prowadź
            </button>
          )}
          {isMultiStage && (
            <button onClick={openNextStage} className="btn btn-primary text-xs py-1.5 px-2.5">
              <Navigation size={13} />
              {(() => {
                const next = stages.findIndex((_, i) => !completedStages.includes(i));
                return `Etap ${(next === -1 ? 0 : next) + 1}/${stages.length}`;
              })()}
            </button>
          )}
        </div>

        {/* Stage buttons */}
        <StageButtons />

        {/* Stops list */}
        <div className="flex-1 overflow-y-auto p-3">
          <RouteBody />
        </div>

        {/* Footer actions */}
        <RouteFooter />
      </div>

      {/* Desktop: toggle right when closed */}
      {!showRight && (
        <button
          onClick={() => setShowRight(true)}
          className="hidden md:flex absolute right-3 top-3 z-[950] btn btn-secondary bg-white/85 backdrop-blur-sm shadow-lg text-sm py-2"
        >
          {stops.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              {stops.length}
            </span>
          )}
          Trasa
          <PanelRightOpen size={15} />
        </button>
      )}

      {/* ══════════ MOBILE — BACKDROP ══════════ */}
      {mobileSheet && (
        <div
          className="md:hidden absolute inset-0 z-[940] bg-black/25"
          onClick={() => setMobileSheet(null)}
        />
      )}

      {/* ══════════ MOBILE — BOTTOM SHEET: ZAMÓWIENIA ══════════ */}
      <div
        className={`
          md:hidden absolute bottom-0 left-0 right-0 z-[950]
          bg-white rounded-t-2xl shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileSheet === 'orders' ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ maxHeight: '72vh' }}
      >
        {/* Drag handle */}
        <button
          className="flex justify-center pt-3 pb-1 shrink-0 w-full"
          onClick={() => setMobileSheet(null)}
          aria-label="Zamknij"
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 shrink-0">
          <span className="font-bold text-slate-900">
            Zamówienia <span className="text-slate-400 font-normal">({orders.length})</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`btn btn-ghost p-2 relative ${activeFilters > 0 ? 'text-brand-600' : 'text-slate-400'}`}
            >
              <SlidersHorizontal size={16} />
              {activeFilters > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-600 text-white text-[9px] rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            <button onClick={() => setMobileSheet(null)} className="btn btn-ghost p-2 text-slate-400">
              <X size={18} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-2 shrink-0">
            <FiltersBlock compact />
          </div>
        )}

        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <OrdersList />
        </div>
      </div>

      {/* ══════════ MOBILE — BOTTOM SHEET: TRASA ══════════ */}
      <div
        className={`
          md:hidden absolute bottom-0 left-0 right-0 z-[950]
          bg-white rounded-t-2xl shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileSheet === 'route' ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ maxHeight: '78vh' }}
      >
        {/* Drag handle */}
        <button
          className="flex justify-center pt-3 pb-1 shrink-0 w-full"
          onClick={() => setMobileSheet(null)}
          aria-label="Zamknij"
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 shrink-0">
          <span className="font-bold text-slate-900">
            Trasa <span className="text-slate-400 font-normal">({stops.length} pkt)</span>
          </span>
          <div className="flex items-center gap-2">
            {stops.length > 0 && (
              <button onClick={openNextStage} className="btn btn-primary text-xs py-1.5 px-3">
                <Navigation size={13} />
                {isMultiStage
                  ? `Etap ${(stages.findIndex((_, i) => !completedStages.includes(i)) + 1) || 1}/${stages.length}`
                  : 'Prowadź'}
              </button>
            )}
            <button onClick={() => setMobileSheet(null)} className="btn btn-ghost p-2 text-slate-400">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stage buttons (if multi-stage) */}
        {isMultiStage && (
          <div className="px-4 py-3 border-b border-slate-100 shrink-0 space-y-2">
            <div className="flex items-start gap-2 p-2.5 bg-yellow-50 text-yellow-800 text-xs rounded-xl border border-yellow-200">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>Podzielono na <b>{stages.length} etapy</b> — otwieraj po kolei</span>
            </div>
            <StageButtons />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <RouteBody />
        </div>

        <RouteFooter />
      </div>

      {/* ══════════ MOBILE — DOLNY PASEK ══════════ */}
      <div
        className={`
          md:hidden absolute bottom-0 left-0 right-0 z-[900]
          flex bg-white/92 backdrop-blur-md border-t border-slate-200 shadow-lg
          transition-transform duration-300 ease-in-out
          ${mobileSheet ? 'translate-y-full' : 'translate-y-0'}
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Zamówienia */}
        <button
          onClick={() => setMobileSheet('orders')}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 active:bg-slate-100 transition-colors"
        >
          <List size={20} className="text-slate-600" />
          <span className="text-xs font-medium text-slate-700">Zamówienia</span>
          {orders.length > 0 && (
            <span className="text-[11px] text-slate-400 tabular-nums">{orders.length}</span>
          )}
        </button>

        <div className="w-px bg-slate-200 my-3" />

        {/* Trasa */}
        <button
          onClick={() => setMobileSheet('route')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 active:bg-slate-100 transition-colors relative ${
            stops.length > 0 ? 'text-brand-600' : 'text-slate-600'
          }`}
        >
          <Navigation size={20} />
          <span className="text-xs font-medium">Trasa</span>
          {stops.length > 0 ? (
            <span className="text-[11px] tabular-nums font-semibold">{stops.length} pkt</span>
          ) : (
            <span className="text-[11px] text-slate-400">pusta</span>
          )}
          {stops.length > 0 && (
            <span className="absolute top-1.5 right-[calc(50%-32px)] w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {stops.length}
            </span>
          )}
        </button>
      </div>

    </div>
  );
}
