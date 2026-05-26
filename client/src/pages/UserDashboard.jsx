import { useEffect, useMemo, useState } from 'react';
import { Plus, List, Map, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api.js';
import OrdersMap from '../components/Map/OrdersMap.jsx';
import OrderForm from '../components/Orders/OrderForm.jsx';
import OrderCard from '../components/Orders/OrderCard.jsx';

export default function UserDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'map'
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterName, setFilterName] = useState('');

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
    return list;
  }, [orders, filterCity, filterName]);

  const activeFilters = [filterCity, filterName].filter(Boolean).length;

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
        <h1 className="text-xl md:text-2xl font-bold">Moje zamówienia</h1>
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
          {activeFilters > 0 && (
            <div className="sm:col-span-2">
              <button
                onClick={() => { setFilterCity(''); setFilterName(''); }}
                className="text-xs text-red-600 hover:underline"
              >
                Wyczyść filtry
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Przełącznik Lista/Mapa (tylko mobile) ── */}
      <div className="flex md:hidden mb-3 rounded-lg overflow-hidden border border-slate-200">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
          }`}
        >
          <List size={16} /> Lista ({filteredOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
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
            <p className="text-slate-500 text-sm py-4 text-center">Ładowanie…</p>
          ) : filteredOrders.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <p>{orders.length === 0 ? 'Brak zamówień. Dodaj pierwsze.' : 'Brak wyników dla wybranych filtrów.'}</p>
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
