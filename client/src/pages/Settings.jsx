import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, RotateCcw, Check, Truck, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { URGENCY_LABEL } from '../lib/urgency.js';

const COLOR_FIELDS = [
  { key: 'overdue', label: URGENCY_LABEL.overdue, hint: 'Data dostawy już minęła' },
  { key: 'urgent', label: URGENCY_LABEL.urgent, hint: 'Najbliższe dostawy' },
  { key: 'soon', label: URGENCY_LABEL.soon, hint: 'Średni termin' },
  { key: 'later', label: URGENCY_LABEL.later, hint: 'Odległy termin' },
  { key: 'none', label: URGENCY_LABEL.none, hint: 'Zamówienie bez daty' },
];

// Mała pinezka (jak na mapie) do podglądu koloru.
function PinPreview({ color }) {
  return (
    <span
      className="inline-block w-4 h-4 shrink-0"
      style={{
        background: color,
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,.4)',
      }}
    />
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { urgency, colorMode } = settings;
  const [saved, setSaved] = useState(false);
  const canManageFleet = user?.role === 'admin' || user?.role === 'superadmin';

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function setWeeks(field, value) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    const next = { ...urgency, [field]: n };
    // Utrzymaj weeksUrgent < weeksSoon
    if (field === 'weeksUrgent' && n >= next.weeksSoon) next.weeksSoon = n + 1;
    if (field === 'weeksSoon' && n <= next.weeksUrgent) next.weeksUrgent = Math.max(0, n - 1);
    updateSettings({ urgency: next });
    flashSaved();
  }

  function setColor(key, value) {
    updateSettings({ urgency: { colors: { [key]: value } } });
    flashSaved();
  }

  return (
    <div className="max-w-2xl mx-auto p-3 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow shrink-0">
          <SettingsIcon size={22} />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Ustawienia</h1>
          <p className="text-sm text-slate-500">Kolory pinezek wg daty dostawy (zapis lokalny w tej przeglądarce)</p>
        </div>
        {saved && (
          <span className="ml-auto inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check size={15} /> Zapisano
          </span>
        )}
      </div>

      {/* Progi tygodni */}
      <div className="card p-4 space-y-4">
        <h2 className="font-semibold">Progi pilności</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">„Pilne" gdy do dostawy mniej niż (tygodnie)</label>
            <input
              type="number"
              min="0"
              className="input"
              value={urgency.weeksUrgent}
              onChange={(e) => setWeeks('weeksUrgent', e.target.value)}
            />
          </div>
          <div>
            <label className="label">„Wkrótce" gdy mniej niż (tygodnie)</label>
            <input
              type="number"
              min="1"
              className="input"
              value={urgency.weeksSoon}
              onChange={(e) => setWeeks('weeksSoon', e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Czerwony (Pilne) gdy &lt; {urgency.weeksUrgent} tyg · Żółty (Wkrótce) {urgency.weeksUrgent}–{urgency.weeksSoon} tyg ·
          Zielony (Później) &gt; {urgency.weeksSoon} tyg.
        </p>
      </div>

      {/* Kolory */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Kolory</h2>
        <div className="space-y-2">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <PinPreview color={urgency.colors[f.key]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-slate-400">{f.hint}</p>
              </div>
              <input
                type="color"
                value={urgency.colors[f.key]}
                onChange={(e) => setColor(f.key, e.target.value)}
                className="w-10 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                aria-label={`Kolor: ${f.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Domyślny tryb mapy */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Domyślny tryb koloru na mapie</h2>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 max-w-xs">
          {[
            { id: 'urgency', label: 'Pilność (data dostawy)' },
            { id: 'status', label: 'Status' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => { updateSettings({ colorMode: m.id }); flashSaved(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                colorMode === m.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Na mapie zawsze możesz przełączyć tryb w prawym górnym rogu.</p>
      </div>

      {/* Zarządzanie firmą — tylko admin/superadmin */}
      {canManageFleet && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold">Zarządzanie firmą</h2>
          <Link
            to="/admin/vehicles"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
          >
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand-50 text-brand-600 shrink-0">
              <Truck size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Pojazdy</p>
              <p className="text-xs text-slate-500">Zarządzaj flotą pojazdów firmy</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </Link>
        </div>
      )}

      <button
        onClick={() => { resetSettings(); flashSaved(); }}
        className="btn btn-secondary text-sm"
      >
        <RotateCcw size={15} /> Przywróć domyślne
      </button>
    </div>
  );
}
