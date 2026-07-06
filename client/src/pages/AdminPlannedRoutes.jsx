import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Truck, UserRound, MapPin, Calendar, Banknote,
  Navigation, Share2, MessageCircle, Pencil, Trash2, Map as MapIcon,
  Play, CheckCircle2, Ban, Route as RouteIcon, ClipboardCheck,
} from 'lucide-react';
import { api } from '../lib/api.js';
import RouteDetailsModal from '../components/Route/RouteDetailsModal.jsx';
import EditRouteModal from '../components/Route/EditRouteModal.jsx';
import { buildRouteStages } from '../lib/googleMapsLink.js';
import { buildShareText } from '../lib/routeShare.js';
import { ROUTE_STATUS_LABEL, ROUTE_STATUS_LIST } from '../lib/routeStatus.js';

function routeShareText(route) {
  const stages = buildRouteStages(route.stops);
  return buildShareText(stages, route.stops, {
    title: route.title,
    driverName: route.driver?.fullName || route.driver?.email,
  });
}

export default function AdminPlannedRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [detailsRoute, setDetailsRoute] = useState(null);
  const [editRoute, setEditRoute] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  async function loadRoutes() {
    setLoading(true);
    try {
      const { data } = await api.get('/routes');
      setRoutes(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadRoutes(); }, []);

  const filtered = useMemo(
    () => (statusFilter ? routes.filter((r) => r.status === statusFilter) : routes),
    [routes, statusFilter],
  );

  const countByStatus = useMemo(() => {
    const m = {};
    routes.forEach((r) => { m[r.status] = (m[r.status] || 0) + 1; });
    return m;
  }, [routes]);

  function replaceRoute(updated) {
    setRoutes((p) => p.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function changeStatus(route, status, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError('');
    try {
      const { data } = await api.patch(`/routes/${route.id}/status`, { status });
      replaceRoute(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się zmienić statusu trasy');
    }
  }

  async function handleDelete(route) {
    if (!window.confirm(`Usunąć trasę „${route.title}"? Statusy zamówień pozostaną bez zmian.`)) return;
    setError('');
    try {
      await api.delete(`/routes/${route.id}`);
      setRoutes((p) => p.filter((r) => r.id !== route.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się usunąć trasy');
    }
  }

  function handleNavigate(route) {
    const stages = buildRouteStages(route.stops);
    if (stages[0]) window.open(stages[0].url, '_blank', 'noopener');
  }

  async function handleShare(route) {
    const text = routeShareText(route);
    if (navigator.share) {
      try { await navigator.share({ title: route.title, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopiedId(route.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  }
  function handleWhatsApp(route) {
    window.open(`https://wa.me/?text=${encodeURIComponent(routeShareText(route))}`, '_blank', 'noopener');
  }

  const isActive = (r) => r.status === 'zaplanowana' || r.status === 'w_realizacji';

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Nagłówek */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <ClipboardList size={20} />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-tight">Zaplanowane trasy</h1>
          <p className="text-sm text-slate-500">
            {routes.length} {routes.length === 1 ? 'trasa' : routes.length < 5 && routes.length > 0 ? 'trasy' : 'tras'}
            {countByStatus.w_realizacji ? ` · ${countByStatus.w_realizacji} w realizacji` : ''}
          </p>
        </div>
        <Link to="/admin/routes" className="btn btn-primary">
          <RouteIcon size={16} /> Zaplanuj nową
        </Link>
      </div>

      {/* Filtry statusów */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            !statusFilter ? 'bg-brand-600 text-white shadow-glow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          Wszystkie ({routes.length})
        </button>
        {ROUTE_STATUS_LIST.map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s ? 'bg-brand-600 text-white shadow-glow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {ROUTE_STATUS_LABEL[s]}{countByStatus[s] ? ` (${countByStatus[s]})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Lista tras */}
      {loading ? (
        <p className="text-sm text-slate-500 py-10 text-center">Ładowanie…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-400 flex items-center justify-center mb-3">
            <RouteIcon size={24} />
          </div>
          <p className="font-semibold text-slate-700">
            {routes.length === 0 ? 'Brak zaplanowanych tras' : 'Brak tras o tym statusie'}
          </p>
          {routes.length === 0 && (
            <>
              <p className="text-sm text-slate-500 mt-1">Zbuduj trasę z zamówień na mapie i zapisz ją tutaj.</p>
              <Link to="/admin/routes" className="btn btn-primary mt-4 inline-flex">
                <RouteIcon size={16} /> Przejdź do planowania tras
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((route) => (
            <div key={route.id}
              className={`card flex flex-col hover:shadow-lg transition-shadow ${
                route.status === 'anulowana' ? 'opacity-70' : ''
              }`}>
              {/* Górna część — klik = szczegóły */}
              <button onClick={() => setDetailsRoute(route)} className="p-4 pb-3 text-left w-full">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 leading-snug break-words">{route.title}</h3>
                  <span className={`badge badge-${route.status} shrink-0`}>{ROUTE_STATUS_LABEL[route.status]}</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Truck size={14} className="text-slate-400 shrink-0" />
                    {route.vehicle
                      ? <span className="truncate">{route.vehicle.name} <span className="text-slate-400 font-mono text-xs">({route.vehicle.plate})</span></span>
                      : <span className="text-slate-400">brak pojazdu</span>}
                  </p>
                  {route.driver && (
                    <p className="flex items-center gap-2">
                      <UserRound size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{route.driver.fullName || route.driver.email}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    {route.stopsCount} {route.stopsCount === 1 ? 'przystanek' : route.stopsCount < 5 ? 'przystanki' : 'przystanków'}
                    {route.totalAmount > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-emerald-700 font-semibold">
                        <Banknote size={13} /> {route.totalAmount.toLocaleString('pl-PL')} zł
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar size={13} className="shrink-0" />
                    {route.plannedDate
                      ? `Realizacja: ${new Date(route.plannedDate).toLocaleDateString('pl-PL')}`
                      : `Utworzono: ${new Date(route.createdAt).toLocaleDateString('pl-PL')}`}
                  </p>
                </div>
              </button>

              {/* Akcje */}
              <div className="px-4 pb-3 flex items-center gap-1 border-t border-slate-100 pt-2.5 mt-auto">
                <button onClick={() => setDetailsRoute(route)} title="Pokaż na mapie"
                  className="btn btn-ghost p-2 text-slate-500 hover:text-brand-600">
                  <MapIcon size={16} />
                </button>
                <button onClick={() => handleNavigate(route)} title="Nawiguj (Google Maps)"
                  className="btn btn-ghost p-2 text-slate-500 hover:text-brand-600">
                  <Navigation size={16} />
                </button>
                <button onClick={() => handleShare(route)} title="Udostępnij"
                  className="btn btn-ghost p-2 text-slate-500 hover:text-brand-600">
                  {copiedId === route.id ? <ClipboardCheck size={16} className="text-emerald-600" /> : <Share2 size={16} />}
                </button>
                <button onClick={() => handleWhatsApp(route)} title="WhatsApp"
                  className="btn btn-ghost p-2 text-slate-500 hover:text-[#25D366]">
                  <MessageCircle size={16} />
                </button>
                <div className="ml-auto flex items-center gap-1">
                  {isActive(route) && (
                    <button onClick={() => setEditRoute(route)} title="Edytuj"
                      className="btn btn-ghost p-2 text-slate-500 hover:text-brand-600">
                      <Pencil size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(route)} title="Usuń"
                    className="btn btn-ghost p-2 text-slate-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* CTA cyklu życia */}
              {isActive(route) && (
                <div className="px-4 pb-4 flex gap-2">
                  {route.status === 'zaplanowana' && (
                    <button onClick={() => changeStatus(route, 'w_realizacji')}
                      className="btn btn-primary text-xs py-2 flex-1 justify-center">
                      <Play size={13} /> Rozpocznij realizację
                    </button>
                  )}
                  {route.status === 'w_realizacji' && (
                    <button
                      onClick={() => changeStatus(route, 'zakonczona',
                        `Zakończyć trasę „${route.title}"? Wszystkie zamówienia z trasy otrzymają status „Dostarczone".`)}
                      className="btn text-xs py-2 flex-1 justify-center bg-gradient-to-b from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700">
                      <CheckCircle2 size={13} /> Zakończ trasę
                    </button>
                  )}
                  <button
                    onClick={() => changeStatus(route, 'anulowana',
                      `Anulować trasę „${route.title}"? Statusy zamówień pozostaną bez zmian.`)}
                    title="Anuluj trasę"
                    className="btn btn-secondary text-xs py-2 px-3 text-slate-500 hover:text-red-600">
                    <Ban size={13} /> Anuluj
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale */}
      {detailsRoute && (
        <RouteDetailsModal route={detailsRoute} onClose={() => setDetailsRoute(null)} />
      )}
      {editRoute && (
        <EditRouteModal
          route={editRoute}
          onClose={() => setEditRoute(null)}
          onSaved={(updated) => { replaceRoute(updated); setEditRoute(null); }}
        />
      )}
    </div>
  );
}
