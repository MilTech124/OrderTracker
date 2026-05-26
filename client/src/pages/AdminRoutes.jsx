import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, AlertTriangle, List, Map, Navigation } from 'lucide-react';
import { api } from '../lib/api.js';
import RouteMap from '../components/Map/RouteMap.jsx';
import RouteStopsList from '../components/Route/RouteStopsList.jsx';
import { buildRouteUrls, formatAddress } from '../lib/googleMapsLink.js';
import { STATUS_LABEL, STATUS_LIST } from '../lib/statusColors.js';

const TABS = ['orders', 'stops', 'map'];

export default function AdminRoutes() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [stopsOrder, setStopsOrder] = useState([]);
  const [mobileTab, setMobileTab] = useState('orders');

  async function loadOrders() {
    setLoading(true);
    try {
      const params = {};
      if (filterUser) params.userId = filterUser;
      if (filterStatus) params.status = filterStatus;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;
      const { data } = await api.get('/orders', { params });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const { data } = await api.get('/users');
    setUsers(data);
  }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { loadOrders(); }, [filterUser, filterStatus, filterDateFrom, filterDateTo]);

  function toggleSelect(orderId) {
    const isSelected = selectedIds.includes(orderId);
    if (isSelected) {
      setSelectedIds(selectedIds.filter((id) => id !== orderId));
      setStopsOrder(stopsOrder.filter((id) => id !== orderId));
    } else {
      setSelectedIds([...selectedIds, orderId]);
      setStopsOrder([...stopsOrder, orderId]);
    }
  }

  function removeStop(orderId) {
    setSelectedIds((p) => p.filter((id) => id !== orderId));
    setStopsOrder((p) => p.filter((id) => id !== orderId));
  }

  function reorderStops(newOrderArray) {
    setStopsOrder(newOrderArray.map((s) => s.id));
  }

  const orderById = useMemo(() => {
    const m = {};
    orders.forEach((o) => { m[o.id] = o; });
    return m;
  }, [orders]);

  const stops = useMemo(
    () => stopsOrder.map((id) => orderById[id]).filter(Boolean),
    [stopsOrder, orderById]
  );

  const routeUrls = useMemo(() => buildRouteUrls(stops), [stops]);
  const tooManyStops = stops.length > 10;

  function openRoute() {
    routeUrls.forEach((url, idx) => {
      setTimeout(() => window.open(url, '_blank', 'noopener'), idx * 200);
    });
  }

  // Panel zamówień
  const OrdersPanel = () => (
    <div className="card p-4">
      <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500">
        Zamówienia ({orders.length}) — zaznacz aby dodać do trasy
      </h2>
      {loading ? (
        <p className="text-sm text-slate-500">Ładowanie…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-slate-500">Brak zamówień dla filtrów.</p>
      ) : (
        <ul className="space-y-1 max-h-[55vh] overflow-auto -mx-1 px-1">
          {orders.map((o) => (
            <li
              key={o.id}
              onClick={() => toggleSelect(o.id)}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedIds.includes(o.id)
                  ? 'bg-brand-50 border border-brand-300'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(o.id)}
                onChange={() => {}}
                className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{o.title}</p>
                <p className="text-xs text-slate-500 truncate">{formatAddress(o) || '— brak adresu —'}</p>
                <span className={`badge badge-${o.status} mt-1`}>{STATUS_LABEL[o.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Panel trasy
  const StopsPanel = () => (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-slate-500">
          Trasa ({stops.length} punktów)
        </h2>
        <button
          onClick={openRoute}
          disabled={stops.length === 0}
          className="btn btn-primary text-sm py-2 disabled:opacity-40"
        >
          <Navigation size={15} /> Prowadź
        </button>
      </div>

      {tooManyStops && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded mb-3 border border-yellow-200">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>Ponad 10 punktów — trasa zostanie podzielona na {routeUrls.length} linków.</span>
        </div>
      )}

      {stops.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Zaznacz zamówienia po lewej aby budować trasę.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-2">Przeciągnij aby zmienić kolejność.</p>
          <RouteStopsList stops={stops} onReorder={reorderStops} onRemove={removeStop} />
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Planowanie trasy</h1>
        {/* Prowadź — widoczny zawsze na górze */}
        {stops.length > 0 && (
          <button onClick={openRoute} className="btn btn-primary text-sm">
            <Navigation size={15} /> Prowadź ({stops.length})
          </button>
        )}
      </div>

      {/* Filtry */}
      <div className="card p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Użytkownik</label>
          <select className="input" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
            <option value="">Wszyscy</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Dowolny</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data dostawy od</label>
          <input type="date" className="input" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Data dostawy do</label>
          <input type="date" className="input" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
        {(filterUser || filterStatus || filterDateFrom || filterDateTo) && (
          <div className="col-span-2 sm:col-span-4">
            <button
              onClick={() => { setFilterUser(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="text-xs text-red-600 hover:underline"
            >
              Wyczyść filtry
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile: zakładki ── */}
      <div className="flex lg:hidden rounded-lg overflow-hidden border border-slate-200">
        {[
          { id: 'orders', icon: <List size={15} />, label: `Zamówienia (${orders.length})` },
          { id: 'stops',  icon: <Navigation size={15} />, label: `Trasa (${stops.length})` },
          { id: 'map',    icon: <Map size={15} />, label: 'Mapa' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setMobileTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Desktop: 3 kolumny / Mobile: zakładki ── */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-4 space-y-3 lg:space-y-0">

        <div className={mobileTab !== 'orders' ? 'hidden lg:block' : ''}>
          <OrdersPanel />
        </div>

        <div className={mobileTab !== 'stops' ? 'hidden lg:block' : ''}>
          <StopsPanel />
        </div>

        <div
          className={`card overflow-hidden ${mobileTab !== 'map' ? 'hidden lg:block' : ''}`}
          style={{ height: '65vh' }}
        >
          <RouteMap stops={stops} backgroundOrders={orders} />
        </div>
      </div>
    </div>
  );
}
