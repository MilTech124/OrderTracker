import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, CheckCircle, XCircle, MapPin, RefreshCw, Map } from 'lucide-react';
import { api } from '../../lib/api.js';
import { geocodeAddress } from '../../lib/geocode.js';
import { STATUS_LABEL, STATUS_LIST } from '../../lib/statusColors.js';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../lib/countries.js';
import MapPicker from '../Map/MapPicker.jsx';

// geo.status: 'idle' | 'checking' | 'found' | 'failed' | 'manual' | 'skipped'
const initGeo = (order) => {
  if (order?.lat && order?.lng) {
    return { status: 'found', coords: { lat: order.lat, lng: order.lng }, note: 'Znany adres z bazy' };
  }
  return { status: 'idle', coords: null, note: '' };
};

export default function OrderForm({ initial, onSaved, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    defaultValues: initial
      ? {
          ...initial,
          country: initial.country || DEFAULT_COUNTRY,
          deliveryDate: initial.deliveryDate ? new Date(initial.deliveryDate).toISOString().slice(0, 10) : '',
        }
      : { status: 'nowe', country: DEFAULT_COUNTRY },
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [geo, setGeo] = useState(() => initGeo(initial));
  const [showMap, setShowMap] = useState(false);

  // ── Geokodowanie ─────────────────────────────────────────────────────────
  async function runGeocode(values) {
    setGeo({ status: 'checking', coords: null, note: '' });
    try {
      const result = await geocodeAddress({
        address: values.address,
        city: values.city,
        postalCode: values.postalCode,
        country: values.country || DEFAULT_COUNTRY,
      });
      setGeo({ status: 'found', coords: { lat: result.lat, lng: result.lng }, note: result.displayName });
      setShowMap(false);
      return result;
    } catch (err) {
      setGeo({ status: 'failed', coords: null, note: err.message });
      return null;
    }
  }

  async function handleCheckAddress() {
    await runGeocode(getValues());
  }

  // ── Zapis ────────────────────────────────────────────────────────────────
  async function doSave(values) {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...values,
        deliveryDate: values.deliveryDate || null,
        lat: geo.coords?.lat ?? undefined,
        lng: geo.coords?.lng ?? undefined,
      };
      if (isEdit) {
        await api.put(`/orders/${initial.id}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Błąd zapisu');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(values) {
    // Jeśli współrzędne już znane (found/manual/skipped) → zapisz od razu
    if (geo.status === 'found' || geo.status === 'manual' || geo.status === 'skipped') {
      await doSave(values);
      return;
    }

    // Spróbuj geocodować
    const result = await runGeocode(values);
    if (result) {
      // sukces → zapisz
      await doSave(values);
    }
    // jeśli failed → zatrzymaj i pokaż opcje użytkownikowi (nie zapisuj)
  }

  // ── Pasek statusu geokodowania ────────────────────────────────────────────
  function GeoStatus() {
    if (geo.status === 'idle') return null;

    if (geo.status === 'checking') {
      return (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-2 bg-slate-50 rounded-md">
          <Loader2 size={15} className="animate-spin" /> Wyszukuję adres…
        </div>
      );
    }

    if (geo.status === 'found') {
      return (
        <div className="flex items-start gap-2 text-sm text-green-700 p-2 bg-green-50 rounded-md border border-green-200">
          <CheckCircle size={15} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{geo.note}</span>
        </div>
      );
    }

    if (geo.status === 'manual') {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-700 p-2 bg-blue-50 rounded-md border border-blue-200">
          <MapPin size={15} className="shrink-0" />
          Pinezka ustawiona ręcznie ({geo.coords.lat.toFixed(5)}, {geo.coords.lng.toFixed(5)})
        </div>
      );
    }

    if (geo.status === 'skipped') {
      return (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-2 bg-slate-50 rounded-md border border-slate-200">
          <MapPin size={15} className="shrink-0" />
          Zapisane bez pinezki na mapie
        </div>
      );
    }

    if (geo.status === 'failed') {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-red-700 p-3 bg-red-50 rounded-md border border-red-200">
            <XCircle size={15} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Nie znaleziono adresu</p>
              <p className="text-xs text-red-600 mt-0.5">{geo.note}</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-medium">Co chcesz zrobić?</p>

          <div className="flex flex-wrap gap-2">
            {/* Opcja 1: Popraw adres i spróbuj ponownie */}
            <button
              type="button"
              onClick={handleCheckAddress}
              className="btn btn-secondary text-sm"
            >
              <RefreshCw size={14} /> Spróbuj ponownie
            </button>

            {/* Opcja 2: Kliknij na mapie */}
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="btn btn-secondary text-sm"
            >
              <Map size={14} /> {showMap ? 'Ukryj mapę' : 'Wskaż na mapie'}
            </button>

            {/* Opcja 3: Zapisz bez pinezki */}
            <button
              type="button"
              onClick={() => {
                setGeo({ status: 'skipped', coords: null, note: '' });
                setShowMap(false);
              }}
              className="btn btn-secondary text-sm text-slate-500"
            >
              Zapisz bez pinezki
            </button>
          </div>

          {/* Mini mapa do ręcznego ustawienia */}
          {showMap && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Kliknij na mapie żeby ustawić pinezkę:</p>
              <MapPicker
                value={geo.coords}
                onChange={(coords) => {
                  setGeo({ status: 'manual', coords, note: '' });
                  setShowMap(false);
                }}
              />
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
      <h2 className="text-xl font-bold">{isEdit ? 'Edytuj zamówienie' : 'Nowe zamówienie'}</h2>

      <div>
        <label className="label">Tytuł *</label>
        <input className="input" {...register('title', { required: 'Wymagane' })} />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Imię</label>
          <input className="input" {...register('firstName')} />
        </div>
        <div>
          <label className="label">Nazwisko</label>
          <input className="input" {...register('lastName')} />
        </div>
      </div>

      <div>
        <label className="label">Telefon</label>
        <input
          type="tel"
          className="input"
          placeholder="+48 000 000 000"
          {...register('phone')}
        />
      </div>

      {/* Adres – oznaczony jako wpływający na geokodowanie */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <MapPin size={12} /> Adres dostawy
        </p>

        <div>
          <label className="label">Kraj</label>
          <select
            className="input"
            {...register('country')}
            onChange={(e) => {
              // ręczne ustawienie aby zresetować geo (register już aktualizuje wartość)
              register('country').onChange(e);
              if (geo.status !== 'idle') setGeo({ status: 'idle', coords: geo.coords, note: '' });
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Kod pocztowy</label>
            <input
              className="input"
              {...register('postalCode')}
              onChange={() => {
                if (geo.status !== 'idle') setGeo({ status: 'idle', coords: geo.coords, note: '' });
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Miasto</label>
            <input
              className="input"
              {...register('city')}
              onChange={() => {
                if (geo.status !== 'idle') setGeo({ status: 'idle', coords: geo.coords, note: '' });
              }}
            />
          </div>
        </div>

        <div>
          <label className="label">Ulica i numer</label>
          <input
            className="input"
            {...register('address')}
            onChange={() => {
              if (geo.status !== 'idle') setGeo({ status: 'idle', coords: geo.coords, note: '' });
            }}
          />
        </div>

        {/* Przycisk sprawdzenia adresu */}
        <button
          type="button"
          onClick={handleCheckAddress}
          disabled={geo.status === 'checking'}
          className="btn btn-secondary text-sm w-full justify-center"
        >
          {geo.status === 'checking'
            ? <><Loader2 size={14} className="animate-spin" /> Szukam…</>
            : <><MapPin size={14} /> Sprawdź adres na mapie</>}
        </button>

        <GeoStatus />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Data dostawy</label>
          <input type="date" className="input" {...register('deliveryDate')} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" {...register('status')}>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Kwota (PLN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="np. 250.00"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <label className="label">Szczegóły zamówienia</label>
        <textarea className="input min-h-[90px]" {...register('details')} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* Info jeśli próbuje zapisać przy failed */}
      {geo.status === 'failed' && (
        <p className="text-xs text-amber-600 font-medium">
          ⚠️ Wybierz jedną z opcji powyżej przed zapisaniem.
        </p>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary">Anuluj</button>
        )}
        <button
          type="submit"
          disabled={submitting || geo.status === 'checking' || geo.status === 'failed'}
          className="btn btn-primary"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {isEdit ? 'Zapisz zmiany' : 'Dodaj zamówienie'}
        </button>
      </div>
    </form>
  );
}
