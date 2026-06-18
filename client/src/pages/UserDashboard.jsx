import { useEffect, useMemo, useState } from 'react';
import { Plus, List, Map, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api.js';
import OrdersMap from '../components/Map/OrdersMap.jsx';
import OrderForm from '../components/Orders/OrderForm.jsx';
import OrderCard from '../components/Orders/OrderCard.jsx';
import OrderStats from '../components/Orders/OrderStats.jsx';
import ImportExport from '../components/Orders/ImportExport.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { getUrgencyLevel, URGENCY_LABEL, URGENCY_LEVELS } from '../lib/urgency.js';

export default function UserDashboard() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'map'
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Filtrowanie client-side
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filterCity.trim()) {
      const rx = new RegExp(filterCity.trim(), 'i');
      list = list.filter((o) => rx.test(o.city || ''));
    }
    if (filterName.trim()) {
      const rx = new RegExp(filterName.trim(), 'i');
      list = list.filter((o) => rx.test(o.firstName || '') || rx.test(o.lastName || ''));
    }
    if (filterUrgency) {
      list = list.filter((o) => getUrgencyLevel(o.deliveryDate, settings.urgency) === filterUrgency);
    }
    return list;
  }, [orders, filterCity, filterName, filterUrgency, settings.urgency]);

  const activeFilters = [filterCity, filterName, filterUrgency].filter(Boolean).length;

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
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Moje zamówienia</h1>
          <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">Przeglądaj, filtruj i zarządzaj dostawami</p>
        </div>
        <div className="flex items-center gap-2">
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
          <ImportExport orders={filteredOrders} onImported={load} />
          <button
            onClick={() => { setShowNewForm(true); setEditingId(null); }}
            className="btn btn-primary text-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nowe zamówienie</span><span className="sm:hidden">Nowe</span>
          </button>
        </div>
      </div>

      {/* ── Filtry ── */}
      {showFilters && (
        <div className="card p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div>
            <label className="label">Imię lub nazwisko</label>
            <input
              type="text"
              className="input"
              placeholder="np. Kowalski"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
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
          {activeFilters > 0 && (
            <div className="sm:col-span-2">
              <button
                onClick={() => { setFilterCity(''); setFilterName(''); setFilterUrgency(''); }}
                className="text-xs text-red-600 hover:underline"
              >
                Wyczyść filtry
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Statystyki ── */}
      <OrderStats orders={filteredOrders} />

      {/* ── Przełącznik Lista/Mapa (tylko mobile) ── */}
      <div className="flex md:hidden mb-3 p-1 gap-1 rounded-xl bg-slate-100 border border-slate-200/70">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            mobileTab === 'list' ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500'
          }`}
        >
          <List size={16} /> Lista ({filteredOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            mobileTab === 'map' ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500'
          }`}
        >
          <Map size={16} /> Mapa {filteredOrders.filter(o => o.lat).length > 0 && `(${filteredOrders.filter(o => o.lat).length})`}
        </button>
      </div>

      {/* ── Układ desktop: 2 kolumny, mobile: zakładki ── */}
      <div className="md:grid md:grid-cols-2 md:gap-4">

        {/* Lista zamówień */}
        <div className={`space-y-3 ${mobileTab === 'map' ? 'hidden md:block' : ''}`}>

          {showNewForm && (
            <OrderForm
              initial={null}
              onSaved={handleSaved}
              onCancel={() => setShowNewForm(false)}
            />
          )}

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-4 relative overflow-hidden">
                  <div className="space-y-2.5">
                    <div className="h-4 w-1/2 rounded-md bg-slate-100" />
                    <div className="h-3 w-1/3 rounded-md bg-slate-100" />
                    <div className="h-3 w-2/3 rounded-md bg-slate-100" />
                  </div>
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 ring-1 ring-inset ring-brand-600/10">
                <Map size={24} />
              </div>
              <p className="text-slate-500 font-medium">
                {orders.length === 0 ? 'Brak zamówień. Dodaj pierwsze.' : 'Brak wyników dla wybranych filtrów.'}
              </p>
            </div>
          ) : (
            filteredOrders.map((o) => (
              <div key={o.id}>
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
          <OrdersMap orders={filteredOrders} />
        </div>
      </div>
    </div>
  );
}
