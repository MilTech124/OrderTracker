import { useEffect, useMemo, useState } from 'react';
import { Plus, List, Map, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api.js';
import OrdersMap from '../components/Map/OrdersMap.jsx';
import OrderForm from '../components/Orders/OrderForm.jsx';
import OrderCard from '../components/Orders/OrderCard.jsx';
import OrderStats from '../components/Orders/OrderStats.jsx';
import ImportExport from '../components/Orders/ImportExport.jsx';
import { STATUS_LABEL, STATUS_LIST } from '../lib/statusColors.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { getUrgencyLevel, URGENCY_LABEL, URGENCY_LEVELS } from '../lib/urgency.js';

export default function AdminDashboard() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mobileTab, setMobileTab] = useState('list');

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filterUser) params.userId = filterUser;
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params.date = filterDate;
      if (filterCity) params.city = filterCity;
      if (filterName) params.name = filterName;
      const [oRes, uRes] = await Promise.all([
        api.get('/orders', { params }),
        users.length ? Promise.resolve({ data: users }) : api.get('/users'),
      ]);
      setOrders(oRes.data);
      setUsers(uRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterUser, filterStatus, filterDate, filterCity, filterName]);

  const userById = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  // Pilność liczona z daty → filtrujemy po stronie klienta (bez round-tripu do serwera).
  const visibleOrders = useMemo(() => {
    if (!filterUrgency) return orders;
    return orders.filter((o) => getUrgencyLevel(o.deliveryDate, settings.urgency) === filterUrgency);
  }, [orders, filterUrgency, settings.urgency]);

  const activeFilters = [filterUser, filterStatus, filterDate, filterCity, filterName, filterUrgency].filter(Boolean).length;

  async function handleDelete(order) {
    if (!confirm(`Usunąć zamówienie „${order.title}"?`)) return;
    await api.delete(`/orders/${order.id}`);
    load();
  }

  async function handleStatusChange(order, status) {
    await api.patch(`/orders/${order.id}/status`, { status });
    load();
  }

  function handleEdit(order) {
    setEditingId((prev) => (prev === order.id ? null : order.id));
    setShowNewForm(false);
  }

  function handleSaved() {
    setEditingId(null);
    setShowNewForm(false);
    load();
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4">

      {/* ── Nagłówek ── */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Wszystkie zamówienia</h1>
        <div className="flex items-center gap-2">
          {/* Filtry toggle (mobile) */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn text-sm py-2 px-3 relative ${activeFilters > 0 ? 'btn-primary' : 'btn-secondary'}`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filtry</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <ImportExport orders={visibleOrders} onImported={load} />
          <button
            onClick={() => { setShowNewForm(true); setEditingId(null); }}
            className="btn btn-primary text-sm py-2"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nowe</span>
          </button>
        </div>
      </div>

      {/* ── Filtry (zwijane na mobile) ── */}
      {showFilters && (
        <div className="card p-3 mb-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <label className="label">Data dostawy</label>
            <input type="date" className="input" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Pilność</label>
            <select className="input" value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}>
              <option value="">Dowolna</option>
              {URGENCY_LEVELS.map((u) => (
                <option key={u} value={u}>{URGENCY_LABEL[u]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Miejscowość</label>
            <input
              type="text"
              className="input"
              placeholder="np. Warszawa"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="label">Imię lub nazwisko</label>
            <input
              type="text"
              className="input"
              placeholder="np. Kowalski"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
          {activeFilters > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <button
                onClick={() => { setFilterUser(''); setFilterStatus(''); setFilterDate(''); setFilterCity(''); setFilterName(''); setFilterUrgency(''); }}
                className="text-xs text-red-600 hover:underline"
              >
                Wyczyść filtry
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Statystyki ── */}
      <OrderStats orders={visibleOrders} />

      {/* ── Przełącznik Lista/Mapa (tylko mobile) ── */}
      <div className="flex md:hidden mb-3 rounded-lg overflow-hidden border border-slate-200">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
          }`}
        >
          <List size={16} /> Lista ({visibleOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
          }`}
        >
          <Map size={16} /> Mapa
        </button>
      </div>

      {/* ── Układ ── */}
      <div className="md:grid md:grid-cols-2 md:gap-4">

        {/* Lista */}
        <div className={`space-y-3 ${mobileTab === 'map' ? 'hidden md:block' : ''}`}>

          {showNewForm && (
            <OrderForm initial={null} onSaved={handleSaved} onCancel={() => setShowNewForm(false)} />
          )}

          {loading ? (
            <p className="text-slate-500 text-sm py-4 text-center">Ładowanie…</p>
          ) : visibleOrders.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">Brak zamówień dla wybranych filtrów.</p>
          ) : (
            visibleOrders.map((o) => (
              <div key={o.id}>
                <div className="text-xs text-slate-400 mb-1 px-1">
                  👤 {userById[o.userId]?.fullName || userById[o.userId]?.email || '—'}
                </div>
                <OrderCard
                  order={o}
                  isEditing={editingId === o.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
                {editingId === o.id && (
                  <div className="mt-2">
                    <OrderForm initial={o} onSaved={handleSaved} onCancel={() => setEditingId(null)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Mapa */}
        <div
          className={`card overflow-hidden md:sticky md:top-16 ${mobileTab === 'list' ? 'hidden md:block' : ''}`}
          style={{ height: '75vh' }}
        >
          <OrdersMap orders={visibleOrders} />
        </div>
      </div>
    </div>
  );
}
