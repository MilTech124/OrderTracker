import { useRef, useState } from 'react';
import { Download, Upload, Loader2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { geocodeAddress } from '../../lib/geocode.js';
import { ordersToCsv, downloadCsv, parseOrdersCsv } from '../../lib/ordersCsv.js';

// Przyciski import/eksport CSV + modal podglądu i postępu importu.
export default function ImportExport({ orders = [], onImported }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null); // { valid, invalid } | null
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null); // { done, total, added, noPin, failed } | null

  function handleExport() {
    const csv = ordersToCsv(orders);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `zamowienia_${stamp}.csv`);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // pozwól wybrać ten sam plik ponownie
    if (!file) return;
    setError('');
    setParsing(true);
    try {
      const result = await parseOrdersCsv(file);
      setParsed(result);
    } catch (err) {
      setError(err.message || 'Nie udało się odczytać pliku.');
    } finally {
      setParsing(false);
    }
  }

  function closeModal() {
    if (progress && progress.done < progress.total) return; // nie przerywaj importu
    setParsed(null);
    setProgress(null);
    setError('');
  }

  async function runImport() {
    const rows = parsed.valid;
    const state = { done: 0, total: rows.length, added: 0, noPin: 0, failed: 0 };
    setProgress({ ...state });

    for (const row of rows) {
      const payload = { ...row };
      // Geokoduj tylko gdy brak współrzędnych a jest adres/miasto.
      if (payload.lat == null && (payload.address || payload.city || payload.postalCode)) {
        try {
          const geo = await geocodeAddress({
            address: payload.address,
            city: payload.city,
            postalCode: payload.postalCode,
            country: payload.country,
          });
          payload.lat = geo.lat;
          payload.lng = geo.lng;
        } catch {
          state.noPin += 1; // zapiszemy bez pinezki
        }
      }
      try {
        await api.post('/orders', payload);
        state.added += 1;
      } catch {
        state.failed += 1;
      }
      state.done += 1;
      setProgress({ ...state });
    }

    onImported?.();
  }

  const importing = progress && progress.done < progress.total;
  const finished = progress && progress.done === progress.total;

  return (
    <>
      <button onClick={handleExport} className="btn btn-secondary text-sm py-2 px-3" title="Eksportuj do CSV">
        <Download size={15} /> <span className="hidden sm:inline">Eksport</span>
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={parsing}
        className="btn btn-secondary text-sm py-2 px-3"
        title="Importuj z CSV"
      >
        {parsing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        <span className="hidden sm:inline">Import</span>
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

      {error && !parsed && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={() => setError('')}>
          <div className="card p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2 text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="btn btn-secondary text-sm mt-3 w-full justify-center">Zamknij</button>
          </div>
        </div>
      )}

      {/* Modal podglądu / importu */}
      {parsed && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="card p-4 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Import zamówień</h3>
              {!importing && (
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              )}
            </div>

            {!progress && (
              <>
                <p className="text-sm text-slate-600">
                  Poprawnych wierszy: <b className="text-emerald-600">{parsed.valid.length}</b>
                  {parsed.invalid.length > 0 && (
                    <>, z błędami: <b className="text-red-600">{parsed.invalid.length}</b></>
                  )}
                </p>
                {parsed.invalid.length > 0 && (
                  <ul className="text-xs text-red-600 max-h-32 overflow-auto space-y-0.5 bg-red-50 rounded p-2 border border-red-200">
                    {parsed.invalid.slice(0, 20).map((iv) => (
                      <li key={iv.line}>Wiersz {iv.line}: {iv.errors.join(', ')}</li>
                    ))}
                    {parsed.invalid.length > 20 && <li>…i {parsed.invalid.length - 20} więcej</li>}
                  </ul>
                )}
                <p className="text-xs text-slate-500">
                  Wiersze bez współrzędnych zostaną zgeokodowane (Nominatim, ~1/s) — przy wielu adresach może to chwilę potrwać.
                  Nieudane geokodowanie zapisze zamówienie bez pinezki.
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={closeModal} className="btn btn-secondary text-sm">Anuluj</button>
                  <button
                    onClick={runImport}
                    disabled={parsed.valid.length === 0}
                    className="btn btn-primary text-sm"
                  >
                    Zaimportuj {parsed.valid.length}
                  </button>
                </div>
              </>
            )}

            {progress && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {finished
                    ? <CheckCircle size={16} className="text-emerald-600" />
                    : <Loader2 size={16} className="animate-spin text-brand-600" />}
                  <span>{finished ? 'Zakończono' : `Importuję ${progress.done}/${progress.total}…`}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  Dodane: <b className="text-emerald-600">{progress.added}</b> ·
                  bez pinezki: <b className="text-amber-600">{progress.noPin}</b> ·
                  błędy: <b className="text-red-600">{progress.failed}</b>
                </p>
                {finished && (
                  <button onClick={closeModal} className="btn btn-primary text-sm w-full justify-center">Gotowe</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
