import { useEffect, useState } from 'react';
import { X, Pencil, Loader2, UserRound, Info } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatAddress } from '../../lib/googleMapsLink.js';

export default function EditRouteModal({ route, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [stops, setStops] = useState([]);

  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!route) return;
    setTitle(route.title || '');
    setVehicleId(route.vehicleId || '');
    setDriverId(route.driverId || '');
    setPlannedDate(route.plannedDate ? route.plannedDate.slice(0, 10) : '');
    setStops(route.stops || []);
    setError('');
    api.get('/vehicles').then((r) => setVehicles(r.data)).catch(() => {});
    api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, [route]);

  if (!route) return null;

  function removeStop(idx) {
    setStops((p) => p.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Tytuł trasy jest wymagany');
      return;
    }
    if (stops.length === 0) {
      setError('Trasa musi zawierać co najmniej jeden przystanek');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        title: title.trim(),
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        plannedDate: plannedDate || null,
      };
      // Wysyłaj stops tylko gdy usunięto przystanki (re-snapshot po stronie serwera)
      if (stops.length !== route.stops.length) {
        body.stops = stops.map((s) => s.orderId).filter(Boolean);
      }
      const { data } = await api.put(`/routes/${route.id}`, body);
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się zapisać zmian');
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
            <Pencil size={16} />
          </span>
          <h2 className="font-bold text-slate-900 flex-1">Edytuj trasę</h2>
          <button onClick={onClose} className="btn btn-ghost p-1.5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Nazwa trasy *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="label">Pojazd</label>
            <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">— bez pojazdu —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="label">Planowana data realizacji</label>
            <input type="date" className="input" value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)} />
          </div>

          {/* Przystanki — tylko usuwanie */}
          <div>
            <label className="label">Przystanki ({stops.length})</label>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {stops.map((stop, idx) => (
                <li key={idx} className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/70 bg-white">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{stop.title}</p>
                    <p className="text-xs text-slate-500 truncate">{formatAddress(stop) || '(brak adresu)'}</p>
                  </div>
                  {stops.length > 1 && (
                    <button onClick={() => removeStop(idx)} title="Usuń przystanek"
                      className="text-slate-400 hover:text-red-600 p-1 shrink-0">
                      <X size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-1.5 text-xs text-slate-400 mt-2">
              <Info size={12} className="mt-0.5 shrink-0" />
              Aby dodać przystanki, zaplanuj nową trasę na stronie planowania.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Stopka */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button onClick={onClose} className="btn btn-secondary">Anuluj</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Zapisz zmiany
          </button>
        </div>
      </div>
    </div>
  );
}
