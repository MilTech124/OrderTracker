import { useEffect, useMemo, useState } from 'react';
import { X, Save, Truck, Plus, Loader2, MapPin, Banknote, UserRound } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatAddress } from '../../lib/googleMapsLink.js';

export default function SaveRouteModal({ open, stops, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [plannedDate, setPlannedDate] = useState('');

  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', plate: '' });
  const [addingVehicle, setAddingVehicle] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    api.get('/vehicles').then((r) => setVehicles(r.data)).catch(() => {});
    api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, [open]);

  const totalAmount = useMemo(
    () => stops.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [stops],
  );

  const defaultTitle = useMemo(() => {
    const d = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    return `Trasa ${d} — ${stops.length} ${stops.length === 1 ? 'przystanek' : stops.length < 5 ? 'przystanki' : 'przystanków'}`;
  }, [stops.length]);

  if (!open) return null;

  async function handleAddVehicle() {
    if (!newVehicle.name.trim() || !newVehicle.plate.trim()) return;
    setAddingVehicle(true);
    try {
      const { data } = await api.post('/vehicles', newVehicle);
      setVehicles((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name, 'pl')));
      setVehicleId(data.id);
      setShowNewVehicle(false);
      setNewVehicle({ name: '', plate: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się dodać pojazdu');
    } finally {
      setAddingVehicle(false);
    }
  }

  async function handleSave() {
    const finalTitle = title.trim() || defaultTitle;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/routes', {
        title: finalTitle,
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        plannedDate: plannedDate || null,
        stops: stops.map((s) => s.id),
      });
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się zapisać trasy');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Nagłówek */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Save size={17} />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 leading-tight">Zapisz trasę</h2>
            <p className="text-xs text-slate-500">Trasa trafi do „Zaplanowanych tras"</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Podsumowanie trasy */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin size={14} className="text-brand-600 shrink-0" />
              <span className="font-semibold">{stops.length}</span>
              {stops.length === 1 ? 'przystanek' : stops.length < 5 ? 'przystanki' : 'przystanków'}
              {totalAmount > 0 && (
                <span className="ml-auto flex items-center gap-1.5 text-slate-600">
                  <Banknote size={14} className="text-emerald-600" />
                  {totalAmount.toLocaleString('pl-PL')} zł
                </span>
              )}
            </div>
            {stops.length > 0 && (
              <div className="text-xs text-slate-500 space-y-0.5">
                <p className="truncate">Start: {formatAddress(stops[0]) || stops[0].title}</p>
                {stops.length > 1 && (
                  <p className="truncate">Koniec: {formatAddress(stops[stops.length - 1]) || stops[stops.length - 1].title}</p>
                )}
              </div>
            )}
          </div>

          {/* Nazwa trasy */}
          <div>
            <label className="label">Nazwa trasy *</label>
            <input className="input" value={title} autoFocus
              placeholder={defaultTitle}
              onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Pojazd */}
          <div>
            <label className="label">Pojazd</label>
            {!showNewVehicle ? (
              <div className="flex gap-2">
                <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">— bez pojazdu —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowNewVehicle(true)}
                  title="Dodaj nowy pojazd" className="btn btn-secondary px-3 shrink-0">
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-700">
                  <Truck size={13} /> Nowy pojazd
                  <button type="button" onClick={() => setShowNewVehicle(false)}
                    className="ml-auto text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
                <input className="input text-sm py-2" placeholder="Nazwa (np. Renault Master)"
                  value={newVehicle.name}
                  onChange={(e) => setNewVehicle((f) => ({ ...f, name: e.target.value }))} />
                <div className="flex gap-2">
                  <input className="input text-sm py-2" placeholder="Nr rejestracyjny"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle((f) => ({ ...f, plate: e.target.value }))} />
                  <button type="button" onClick={handleAddVehicle}
                    disabled={addingVehicle || !newVehicle.name.trim() || !newVehicle.plate.trim()}
                    className="btn btn-primary text-xs px-3 shrink-0">
                    {addingVehicle ? <Loader2 size={14} className="animate-spin" /> : 'Dodaj'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kierowca */}
          <div>
            <label className="label">Kierowca</label>
            <div className="relative">
              <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select className="input pl-9" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">— bez kierowcy —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Planowana data */}
          <div>
            <label className="label">Planowana data realizacji</label>
            <input type="date" className="input" value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Stopka */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button onClick={onClose} className="btn btn-secondary">Anuluj</button>
          <button onClick={handleSave} disabled={saving || stops.length === 0} className="btn btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Zapisz trasę
          </button>
        </div>
      </div>
    </div>
  );
}
