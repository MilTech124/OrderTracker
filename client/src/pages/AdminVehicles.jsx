import { useEffect, useState } from 'react';
import { Truck, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';

const EMPTY_FORM = { name: '', plate: '', capacity: '', notes: '' };

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadVehicles() {
    setLoading(true);
    try {
      const { data } = await api.get('/vehicles');
      setVehicles(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadVehicles(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }
  function openEdit(v) {
    setEditingId(v.id);
    setForm({ name: v.name, plate: v.plate, capacity: v.capacity || '', notes: v.notes || '' });
    setError('');
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.plate.trim()) {
      setError('Nazwa i numer rejestracyjny są wymagane');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const { data } = await api.put(`/vehicles/${editingId}`, form);
        setVehicles((p) => p.map((v) => (v.id === editingId ? data : v)));
      } else {
        const { data } = await api.post('/vehicles', form);
        setVehicles((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name, 'pl')));
      }
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się zapisać pojazdu');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v) {
    if (!window.confirm(`Usunąć pojazd „${v.name}" (${v.plate})?`)) return;
    setError('');
    try {
      await api.delete(`/vehicles/${v.id}`);
      setVehicles((p) => p.filter((x) => x.id !== v.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się usunąć pojazdu');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Nagłówek */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Truck size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Pojazdy</h1>
            <p className="text-sm text-slate-500">
              Flota firmy — {vehicles.length} {vehicles.length === 1 ? 'pojazd' : vehicles.length < 5 && vehicles.length > 0 ? 'pojazdy' : 'pojazdów'}
            </p>
          </div>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus size={16} /> Dodaj pojazd
        </button>
      </div>

      {error && !showForm && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Formularz dodawania/edycji */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{editingId ? 'Edytuj pojazd' : 'Nowy pojazd'}</h2>
            <button type="button" onClick={closeForm} className="btn btn-ghost p-1.5 text-slate-400">
              <X size={16} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nazwa *</label>
              <input className="input" value={form.name} autoFocus
                placeholder="np. Renault Master"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nr rejestracyjny *</label>
              <input className="input" value={form.plate}
                placeholder="np. WA 12345"
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ładowność / pojemność</label>
              <input className="input" value={form.capacity}
                placeholder="np. 1200 kg / 12 m³"
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notatki</label>
              <input className="input" value={form.notes}
                placeholder="np. przegląd do 10.2026"
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="btn btn-secondary">Anuluj</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {editingId ? 'Zapisz zmiany' : 'Dodaj pojazd'}
            </button>
          </div>
        </form>
      )}

      {/* Lista pojazdów */}
      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Ładowanie…</p>
      ) : vehicles.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-400 flex items-center justify-center mb-3">
            <Truck size={24} />
          </div>
          <p className="font-semibold text-slate-700">Brak pojazdów we flocie</p>
          <p className="text-sm text-slate-500 mt-1">Dodaj pierwszy pojazd, aby przypisywać go do tras.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="card p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand-50 text-brand-600 shrink-0">
                  <Truck size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{v.name}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700 tracking-wide">
                    {v.plate}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(v)} title="Edytuj"
                    className="btn btn-ghost p-1.5 text-slate-400 hover:text-brand-600">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(v)} title="Usuń"
                    className="btn btn-ghost p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {(v.capacity || v.notes) && (
                <div className="text-xs text-slate-500 space-y-0.5 pl-12">
                  {v.capacity && <p>Ładowność: {v.capacity}</p>}
                  {v.notes && <p className="truncate" title={v.notes}>{v.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
