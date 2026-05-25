import { useEffect, useState } from 'react';
import { Plus, List, Map } from 'lucide-react';
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl md:text-2xl font-bold">Moje zamówienia</h1>
        <button
          onClick={() => { setShowNewForm(true); setEditingId(null); }}
          className="btn btn-primary text-sm"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Nowe zamówienie</span><span className="sm:hidden">Nowe</span>
        </button>
      </div>

      {/* ── Przełącznik Lista/Mapa (tylko mobile) ── */}
      <div className="flex md:hidden mb-3 rounded-lg overflow-hidden border border-slate-200">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
          }`}
        >
          <List size={16} /> Lista
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
          }`}
        >
          <Map size={16} /> Mapa {orders.filter(o => o.lat).length > 0 && `(${orders.filter(o => o.lat).length})`}
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
          ) : orders.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <Package size={40} className="mx-auto mb-2 opacity-40" />
              <p>Brak zamówień. Dodaj pierwsze.</p>
            </div>
          ) : (
            orders.map((o) => (
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
          <OrdersMap orders={orders} />
        </div>
      </div>
    </div>
  );
}
